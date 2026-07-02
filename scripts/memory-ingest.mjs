import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { scanText } from './memory-safety.mjs';
import {
  arrayArg,
  dateStamp,
  git,
  hashId,
  isoStamp,
  parseArgs,
  repoName,
  slugify,
  splitRepoEnv,
  toRelativePortable,
} from './memory-utils.mjs';
import {
  recommendMemoryAction,
  summarizeChangedFiles,
  summarizeCommitSubjects,
  summarizeDiffStats,
} from './memory-recommendation.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const privateVaultRoot = process.env.PRIVATE_VAULT_ROOT;

if (!privateVaultRoot) {
  console.error('PRIVATE_VAULT_ROOT is required for memory:ingest.');
  process.exit(1);
}

const trigger = String(args.trigger ?? 'manual');
const commitRange = String(args.range ?? 'HEAD~7..HEAD');
const sourceVisibility = String(args.sourceVisibility ?? process.env.MEMORY_SOURCE_VISIBILITY ?? 'unknown').toLowerCase();
const sourceFullName = String(args.sourceFullName ?? process.env.MEMORY_SOURCE_FULL_NAME ?? '');
const sourceBranch = String(args.sourceBranch ?? process.env.MEMORY_SOURCE_BRANCH ?? '');
const requestedRepos = [
  ...arrayArg(args.repo),
  ...splitRepoEnv(process.env.MEMORY_REPOS),
];
const repos = requestedRepos.length > 0 ? requestedRepos : [root];
const today = dateStamp();
const createdAt = isoStamp();
const workRoot = path.join(root, '.memory-work');
const packageRoot = path.join(workRoot, 'packages');
const candidateRoot = path.join(workRoot, 'public-candidates');
const privateRawRoot = path.resolve(privateVaultRoot, 'raw');
const privateCompiledRoot = path.resolve(privateVaultRoot, 'compiled');
const privateMocRoot = path.resolve(privateVaultRoot, 'moc');
const privateDecisionRoot = path.resolve(privateVaultRoot, 'decisions');
const validation = [
  'npm run memory:normalize',
  'npm run content:check',
  'npm run graph',
  'npm run build',
  'npm run graphify:update',
];

await fs.mkdir(packageRoot, { recursive: true });
await fs.mkdir(candidateRoot, { recursive: true });
await fs.mkdir(privateRawRoot, { recursive: true });
await fs.mkdir(privateCompiledRoot, { recursive: true });
await fs.mkdir(privateMocRoot, { recursive: true });
await fs.mkdir(privateDecisionRoot, { recursive: true });

function collectCommits(repoRoot, range) {
  const output = git(repoRoot, ['log', '--reverse', '--date=short', '--format=%H%x09%ad%x09%s', range]);
  if (!output) return [];

  return output.split(/\r?\n/u).map((line) => {
    const [sha, date, ...subjectParts] = line.split('\t');
    return { sha, date, subject: subjectParts.join('\t') };
  });
}

function collectRecentCommits(repoRoot, count = 7) {
  const output = git(repoRoot, ['log', '--reverse', `-${count}`, '--date=short', '--format=%H%x09%ad%x09%s']);
  if (!output) return [];

  return output.split(/\r?\n/u).map((line) => {
    const [sha, date, ...subjectParts] = line.split('\t');
    return { sha, date, subject: subjectParts.join('\t') };
  });
}

function collectCommitDetails(repoRoot, commit) {
  const names = git(repoRoot, ['show', '--name-status', '--format=', '--no-renames', commit.sha]);
  const stat = git(repoRoot, ['show', '--stat', '--oneline', '--no-renames', commit.sha]);
  const diff = git(repoRoot, ['show', '--format=', '--no-ext-diff', '--no-color', '--unified=0', commit.sha]);
  const clippedDiff = diff.slice(0, 12000);
  const searchable = `${commit.subject}\n${names}\n${stat}\n${clippedDiff}`;
  const blockers = scanText(searchable);
  const files = names
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/u).slice(1).join(' ') || line);

  return {
    ...commit,
    short_sha: commit.sha.slice(0, 8),
    files,
    stat,
    risk: blockers.length > 0 ? 'high' : 'low',
    blockers: [...new Set(blockers)],
  };
}

function sourceBlockers() {
  if (sourceVisibility === 'private' || sourceVisibility === 'internal') {
    return [`source repo visibility=${sourceVisibility}`];
  }
  return [];
}

function mergeRisk(commits, blockers) {
  if (blockers.length > 0) return 'high';
  if (commits.some((commit) => commit.risk === 'high')) return 'high';
  if (commits.some((commit) => commit.risk === 'medium')) return 'medium';
  return 'low';
}

function renderPrivateSummary({ id, normalizedRepos, risk, blockers, commits, recommendation }) {
  const lines = [
    '---',
    `title: Commit memory package ${id}`,
    `created_at: ${createdAt}`,
    `trigger: ${trigger}`,
    `commit_range: ${commitRange}`,
    `risk: ${risk}`,
    'approval_required: true',
    '---',
    '',
    '# Commit Memory',
    '',
    `Package: ${id}`,
    `Trigger: ${trigger}`,
    `Range: ${commitRange}`,
    `Repos: ${normalizedRepos.join(', ')}`,
    `Source: ${sourceFullName || 'local'}${sourceBranch ? ` ${sourceBranch}` : ''}`,
    `Source visibility: ${sourceVisibility}`,
    `Risk: ${risk}`,
    `Recommendation: ${recommendation.label}`,
    `Recommendation category: ${recommendation.category}`,
    `Recommendation reason: ${recommendation.reason_code}`,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- ${blocker}`) : ['- none']),
    '',
    '## Commits',
    '',
  ];

  for (const commit of commits) {
    lines.push(`### ${commit.short_sha} ${commit.subject}`);
    lines.push('');
    lines.push(`- date: ${commit.date}`);
    lines.push(`- repo: ${commit.repo_name}`);
    lines.push(`- risk: ${commit.risk}`);
    for (const file of commit.files.slice(0, 30)) {
      lines.push(`- file: ${file}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function recommendationMoc(recommendation) {
  if (recommendation.category === 'internal-ops') {
    return { slug: 'hermes-operations', title: 'Hermes Operations' };
  }
  if (recommendation.category === 'risk-blocked') {
    return { slug: 'decisions', title: 'Decisions' };
  }
  return { slug: 'portfolio-candidates', title: 'Portfolio Candidates' };
}

function renderCompiledNote({ id, normalizedRepos, risk, blockers, commits, recommendation, changedFiles, diffStats }) {
  const source = sourceFullName || commits[0]?.repo_name || 'local';
  const moc = recommendationMoc(recommendation);
  const data = {
    title: `Commit memory compiled ${id}`,
    created_at: createdAt,
    source_repo: source,
    source_branch: sourceBranch,
    commit_range: commitRange,
    memory_status: 'candidate',
    recommendation: recommendation.label,
    recommendation_category: recommendation.category,
    recommendation_reason: recommendation.reason_code,
    decision_summary: recommendation.reason,
    related: [
      'moc/repositories',
      `moc/${moc.slug}`,
    ],
  };
  const body = [
    '# Compiled Commit Memory',
    '',
    `Package: ${id}`,
    `Source: ${source}${sourceBranch ? ` ${sourceBranch}` : ''}`,
    `Range: ${commitRange}`,
    `Repos: ${normalizedRepos.join(', ')}`,
    `Risk: ${risk}`,
    `Recommendation: ${recommendation.label}`,
    `Reason: ${recommendation.reason_code} - ${recommendation.reason}`,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- ${blocker}`) : ['- none']),
    '',
    '## Commit Themes',
    '',
    ...summarizeCommitSubjects(commits, 10).map((subject) => `- ${subject}`),
    '',
    '## Changed Files',
    '',
    ...(changedFiles.length > 0 ? changedFiles.map((file) => `- ${file}`) : ['- none']),
    '',
    '## Diff Summary',
    '',
    ...(diffStats.length > 0 ? diffStats.map((stat) => `- ${stat}`) : ['- none']),
    '',
    '## Links',
    '',
    '- [[repositories]]',
    `- [[${moc.slug}]]`,
    '',
  ].join('\n');

  return matter.stringify(body, data);
}

function renderCandidate({ id, risk, blockers, commits, recommendation, changedFiles, diffStats }) {
  const primaryRepo = commits[0]?.repo_name ?? 'repo';
  const slug = slugify(`commit-memory-${today}-${hashId(id, 6)}`);
  const safeSubjects = commits.map((commit) => commit.subject).slice(0, 8);
  const data = {
    title: `Commit Memory: ${primaryRepo} ${today}`,
    description: `${commits.length} commit(s) collected for approval-gated public memory.`,
    date: today,
    tags: ['devlog', 'memory'],
    draft: true,
    visibility: 'private',
    status: 'draft',
    source_type: 'compiled',
    source_url: '',
    captured_at: today,
    owner: 'kang',
    decision_summary: 'Approval-gated public candidate generated from local commit ingestion.',
    next_actions: ['Review candidate before public approval.'],
    aliases: [],
    related: [],
    slug,
    memory_package: id,
    memory_risk: risk,
    memory_recommendation: recommendation.label,
    memory_recommendation_category: recommendation.category,
    memory_recommendation_reason: recommendation.reason_code,
    memory_recommendation_detail: recommendation.reason,
    memory_source_visibility: sourceVisibility,
    memory_source_full_name: sourceFullName,
    memory_source_branch: sourceBranch,
    approval_blockers: blockers,
  };
  const body = [
    '# Summary',
    '',
    `This candidate was generated from ${commits.length} local commit(s). Review and rewrite before approval if the summary is too operational or private.`,
    '',
    '## Public Candidate',
    '',
    '- Keep only reusable implementation decisions and public project context.',
    '- Remove raw diffs, local paths, private issue references, credentials, and internal identifiers.',
    '',
    '## Recommendation',
    '',
    `- ${recommendation.label}: ${recommendation.reason_code}`,
    `- ${recommendation.reason}`,
    '- Approval promotes this candidate to a public wiki/blog note and runs content:check, graph, and build validation.',
    '- Denial keeps only the private memory record and does not create public content.',
    '',
    '## Commit Themes',
    '',
    ...(safeSubjects.length > 0 ? safeSubjects.map((subject) => `- ${subject}`) : ['- No commits found in the selected range.']),
    '',
    '## Changed Files',
    '',
    ...(changedFiles.length > 0 ? changedFiles.map((file) => `- ${file}`) : ['- No changed files captured.']),
    '',
    '## Diff Summary',
    '',
    ...(diffStats.length > 0 ? diffStats.map((stat) => `- ${stat}`) : ['- No diff stats captured.']),
    '',
    '## Approval Notes',
    '',
    risk === 'low'
      ? '- No automated blocker was detected. Manual review is still required.'
      : '- Automated blockers were detected. This candidate cannot be promoted until rewritten and re-ingested or manually cleared.',
    '',
  ].join('\n');

  return matter.stringify(body, data);
}

async function upsertMoc({ file, title, line }) {
  let raw = '';
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch {
    raw = [
      '---',
      `title: ${title}`,
      'memory_status: moc',
      '---',
      '',
      `# ${title}`,
      '',
    ].join('\n');
  }

  if (raw.includes(line)) return;
  const next = raw.endsWith('\n') ? `${raw}${line}\n` : `${raw}\n${line}\n`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, next, 'utf8');
}

const normalizedRepos = [];
const allCommits = [];

for (const repo of repos) {
  const repoRoot = path.resolve(repo);
  let topLevel;

  try {
    topLevel = git(repoRoot, ['rev-parse', '--show-toplevel']);
  } catch (error) {
    console.error(`Skipping non-git repo ${repoRoot}: ${error.message}`);
    continue;
  }

  normalizedRepos.push(topLevel);

  let commits;
  try {
    commits = collectCommits(topLevel, commitRange);
  } catch (error) {
    console.error(`Failed to collect ${commitRange} in ${topLevel}; falling back to recent commits: ${error.message}`);
    commits = collectRecentCommits(topLevel, 7);
  }

  for (const commit of commits) {
    const detailed = collectCommitDetails(topLevel, commit);
    allCommits.push({
      ...detailed,
      repo_root: topLevel,
      repo_name: repoName(topLevel),
    });
  }
}

if (normalizedRepos.length === 0) {
  console.error('No valid git repos were available for memory ingestion.');
  process.exit(1);
}

const idempotencyKey = hashId(JSON.stringify({
  trigger,
  repos: normalizedRepos.sort(),
  commit_range: commitRange,
  source_visibility: sourceVisibility,
  source_full_name: sourceFullName,
  source_branch: sourceBranch,
}));
const packageId = `${today}-${slugify(trigger)}-${idempotencyKey}`;
const packagePath = path.join(packageRoot, `${packageId}.json`);
const candidatePath = path.join(candidateRoot, `${packageId}.md`);
const privateSummaryPath = path.join(privateRawRoot, `${packageId}.md`);
const privateRawPackagePath = path.join(privateRawRoot, `${packageId}.json`);
const privateCompiledPath = path.join(privateCompiledRoot, `${packageId}.md`);

try {
  await fs.access(packagePath);
  console.log(`Memory package already exists: ${toRelativePortable(root, packagePath)}`);
  process.exit(0);
} catch {
  // Continue with first write for this idempotency key.
}

const blockers = [...new Set([
  ...sourceBlockers(),
  ...allCommits.flatMap((commit) => commit.blockers),
])];
const risk = mergeRisk(allCommits, blockers);
const changedFiles = summarizeChangedFiles(allCommits, 20);
const diffStats = summarizeDiffStats(allCommits, 10);
const recommendation = recommendMemoryAction({
  sourceRepo: sourceFullName || allCommits[0]?.repo_name || '',
  sourceVisibility,
  risk,
  blockers,
  commits: allCommits,
  files: changedFiles,
});
const privateSummary = renderPrivateSummary({
  id: packageId,
  normalizedRepos,
  risk,
  blockers,
  commits: allCommits,
  recommendation,
});
const compiledNote = renderCompiledNote({
  id: packageId,
  normalizedRepos,
  risk,
  blockers,
  commits: allCommits,
  recommendation,
  changedFiles,
  diffStats,
});
const candidate = renderCandidate({
  id: packageId,
  risk,
  blockers,
  commits: allCommits,
  recommendation,
  changedFiles,
  diffStats,
});

const packageData = {
  id: packageId,
  idempotency_key: idempotencyKey,
  created_at: createdAt,
  trigger,
  repos: normalizedRepos,
  commit_range: commitRange,
  source_visibility: sourceVisibility,
  source_full_name: sourceFullName,
  source_branch: sourceBranch,
  risk,
  recommendation,
  private_summary_path: privateSummaryPath,
  private_raw_path: privateSummaryPath,
  private_raw_package_path: privateRawPackagePath,
  private_compiled_path: privateCompiledPath,
  private_decision_root: privateDecisionRoot,
  public_candidates: [
    {
      id: packageId,
      path: candidatePath,
      risk,
      recommendation,
      approval_blockers: blockers,
    },
  ],
  approval_required: true,
  validation,
  commits: allCommits.map((commit) => ({
    repo: commit.repo_name,
    sha: commit.sha,
    subject: commit.subject,
    date: commit.date,
    files: commit.files,
    risk: commit.risk,
    blockers: commit.blockers,
  })),
};

await fs.writeFile(privateSummaryPath, privateSummary, 'utf8');
await fs.writeFile(privateCompiledPath, compiledNote, 'utf8');
await fs.writeFile(privateRawPackagePath, `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
await fs.writeFile(candidatePath, candidate, 'utf8');
await fs.writeFile(packagePath, `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
await upsertMoc({
  file: path.join(privateMocRoot, 'repositories.md'),
  title: 'Repositories',
  line: `- [[${packageId}]] ${sourceFullName || normalizedRepos.join(', ')} ${commitRange} - ${recommendation.label}`,
});
const moc = recommendationMoc(recommendation);
await upsertMoc({
  file: path.join(privateMocRoot, `${moc.slug}.md`),
  title: moc.title,
  line: `- [[${packageId}]] ${recommendation.reason_code}: ${recommendation.reason}`,
});

console.log(`Created memory package: ${toRelativePortable(root, packagePath)}`);
console.log(`Private summary: ${privateSummaryPath}`);
console.log(`Private compiled: ${privateCompiledPath}`);
console.log(`Public candidate: ${toRelativePortable(root, candidatePath)}`);
console.log(`Risk: ${risk}`);
console.log(`Recommendation: ${recommendation.label} (${recommendation.reason_code})`);
