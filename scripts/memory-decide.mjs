import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { isoStamp, parseArgs, toRelativePortable } from './memory-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const candidateId = String(args.candidate ?? '').trim();
const decision = String(args.decision ?? '').trim().toLowerCase();
const reason = String(args.reason ?? '').trim();
const target = String(args.target ?? '').trim();
const approvedPath = String(args.approvedPath ?? '').trim();
const approver = String(args.approver ?? '').trim();
const privateVaultRoot = process.env.PRIVATE_VAULT_ROOT;

if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,180}$/u.test(candidateId)) {
  console.error('Usage: npm run memory:decide -- --candidate <id> --decision approved|denied [--reason text]');
  process.exit(1);
}

if (!['approved', 'denied'].includes(decision)) {
  console.error('--decision must be approved or denied.');
  process.exit(1);
}

if (decision === 'denied' && !reason) {
  console.error('--reason is required when denying a memory candidate.');
  process.exit(1);
}

const packagePath = path.join(root, '.memory-work', 'packages', `${candidateId}.json`);
const candidatePath = path.join(root, '.memory-work', 'public-candidates', `${candidateId}.md`);
const markerDir = path.join(root, '.memory-work', decision);
const markerPath = path.join(markerDir, `${candidateId}.json`);
const now = isoStamp();
let packageData = {};
let candidateData = {};

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

try {
  packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));
} catch {
  packageData = { id: candidateId };
}

try {
  candidateData = matter(await fs.readFile(candidatePath, 'utf8')).data;
} catch {
  candidateData = {};
}

let decisionPath = '';
if (privateVaultRoot) {
  decisionPath = path.resolve(privateVaultRoot, 'decisions', `${candidateId}-${decision}.md`);
}

const markerData = {
  id: candidateId,
  status: decision,
  at: now,
  reason,
  target,
  approved_path: approvedPath,
  approver,
  decision_path: decisionPath,
  recommendation: packageData.recommendation ?? {
    label: candidateData.memory_recommendation,
    category: candidateData.memory_recommendation_category,
    reason_code: candidateData.memory_recommendation_reason,
    reason: candidateData.memory_recommendation_detail,
  },
};

await fs.mkdir(markerDir, { recursive: true });
await fs.writeFile(markerPath, `${JSON.stringify(markerData, null, 2)}\n`, 'utf8');

packageData.decision = markerData;
await fs.writeFile(packagePath, `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');

if (packageData.private_raw_package_path) {
  try {
    await fs.writeFile(packageData.private_raw_package_path, `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
  } catch {
    // The working package marker remains the source of operational truth.
  }
}

if (decisionPath) {
  const sourceRepo = packageData.source_full_name || candidateData.memory_source_full_name || '';
  const data = {
    title: `Memory decision ${decision}: ${candidateId}`,
    created_at: now,
    candidate_id: candidateId,
    memory_status: decision,
    source_repo: sourceRepo,
    source_branch: packageData.source_branch || candidateData.memory_source_branch || '',
    commit_range: packageData.commit_range || '',
    recommendation: markerData.recommendation?.label || '',
    recommendation_category: markerData.recommendation?.category || '',
    recommendation_reason: markerData.recommendation?.reason_code || '',
    decision_summary: reason || (decision === 'denied' ? 'Denied without an explicit reason.' : 'Approved for public promotion.'),
    related: ['moc/repositories', decision === 'approved' ? 'moc/portfolio-candidates' : 'moc/decisions'],
  };
  const body = [
    '# Memory Decision',
    '',
    `Candidate: ${candidateId}`,
    `Decision: ${decision}`,
    `Reason: ${reason || '-'}`,
    `Approver: ${approver || '-'}`,
    `Target: ${target || '-'}`,
    `Approved path: ${approvedPath || '-'}`,
    `Source repo: ${sourceRepo || '-'}`,
    `Recommendation: ${markerData.recommendation?.label || '-'} (${markerData.recommendation?.reason_code || '-'})`,
    '',
  ].join('\n');

  await fs.mkdir(path.dirname(decisionPath), { recursive: true });
  await fs.writeFile(decisionPath, matter.stringify(body, data), 'utf8');
  await upsertMoc({
    file: path.resolve(privateVaultRoot, 'moc', 'decisions.md'),
    title: 'Decisions',
    line: `- [[${candidateId}-${decision}]] ${decision}: ${reason || approvedPath || markerData.recommendation?.label || ''}`,
  });
}

console.log(`Decision recorded: ${decision} ${candidateId}`);
console.log(`Marker: ${toRelativePortable(root, markerPath)}`);
if (decisionPath) console.log(`Decision note: ${decisionPath}`);
