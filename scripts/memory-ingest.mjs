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
const privateSummaryRoot = path.resolve(privateVaultRoot, 'commit-memory');
const validation = [
  'npm run memory:normalize',
  'npm run content:check',
  'npm run graph',
  'npm run build',
  'npm run graphify:update',
];

await fs.mkdir(packageRoot, { recursive: true });
await fs.mkdir(candidateRoot, { recursive: true });
await fs.mkdir(privateSummaryRoot, { recursive: true });

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

function renderPrivateSummary({ id, normalizedRepos, risk, blockers, commits }) {
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

function renderCandidate({ id, risk, blockers, commits }) {
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
    '## Commit Themes',
    '',
    ...(safeSubjects.length > 0 ? safeSubjects.map((subject) => `- ${subject}`) : ['- No commits found in the selected range.']),
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
const privateSummaryPath = path.join(privateSummaryRoot, `${packageId}.md`);

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
const privateSummary = renderPrivateSummary({
  id: packageId,
  normalizedRepos,
  risk,
  blockers,
  commits: allCommits,
});
const candidate = renderCandidate({
  id: packageId,
  risk,
  blockers,
  commits: allCommits,
});

await fs.writeFile(privateSummaryPath, privateSummary, 'utf8');
await fs.writeFile(candidatePath, candidate, 'utf8');

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
  private_summary_path: privateSummaryPath,
  public_candidates: [
    {
      id: packageId,
      path: candidatePath,
      risk,
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

await fs.writeFile(packagePath, `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');

console.log(`Created memory package: ${toRelativePortable(root, packagePath)}`);
console.log(`Private summary: ${privateSummaryPath}`);
console.log(`Public candidate: ${toRelativePortable(root, candidatePath)}`);
console.log(`Risk: ${risk}`);
