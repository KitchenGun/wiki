import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { inspectLinkedAssets, scanText } from './memory-safety.mjs';
import {
  dateStamp,
  parseArgs,
  runCapture,
  runInherit,
  slugify,
  toRelativePortable,
} from './memory-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const candidateArg = args.candidate;
const target = args.target;
const overwrite = args.overwrite === true || args.overwrite === 'true';
const runGraphify = args.graphify === true || args.graphify === 'true';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const validation = [
  [npmCommand, ['run', 'memory:normalize']],
  [npmCommand, ['run', 'content:check']],
  [npmCommand, ['run', 'graph']],
  [npmCommand, ['run', 'build']],
];

if (!candidateArg || !target) {
  console.error('Usage: npm run memory:approve -- --candidate <id-or-path> --target blog|wiki');
  process.exit(1);
}

if (!['blog', 'wiki'].includes(String(target))) {
  console.error('--target must be blog or wiki.');
  process.exit(1);
}

function resolveCandidate(value) {
  const raw = String(value);
  const direct = path.resolve(root, raw);
  const fromId = path.join(root, '.memory-work', 'public-candidates', raw.endsWith('.md') ? raw : `${raw}.md`);
  return direct.includes('.memory-work') || raw.includes(path.sep) || raw.includes('/')
    ? direct
    : fromId;
}

async function readPackageRisk(packageId) {
  if (!packageId) return { risk: undefined, blockers: [] };
  const packagePath = path.join(root, '.memory-work', 'packages', `${packageId}.json`);

  try {
    const raw = await fs.readFile(packagePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      risk: parsed.risk,
      blockers: parsed.public_candidates?.flatMap((candidate) => candidate.approval_blockers ?? []) ?? [],
    };
  } catch {
    return { risk: undefined, blockers: [] };
  }
}

function stripInternalFields(data) {
  const next = { ...data };
  for (const key of Object.keys(next)) {
    if (key.startsWith('memory_') || key === 'approval_blockers' || key === 'private_summary_path') {
      delete next[key];
    }
  }
  return next;
}

function gitDirtyFor(file) {
  try {
    return runCapture('git', ['status', '--porcelain', '--', file], { cwd: root }).trim();
  } catch {
    return '';
  }
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

const candidatePath = resolveCandidate(candidateArg);
const raw = await fs.readFile(candidatePath, 'utf8');
const parsed = matter(raw);
const packageRisk = await readPackageRisk(parsed.data.memory_package);
const candidateRisk = parsed.data.memory_risk ?? packageRisk.risk ?? 'unknown';
const blockers = [
  ...scanText(`${JSON.stringify(parsed.data)}\n${parsed.content}`),
  ...((parsed.data.approval_blockers ?? []).map((blocker) => String(blocker))),
  ...packageRisk.blockers.map((blocker) => String(blocker)),
];
const assetResult = await inspectLinkedAssets({
  content: parsed.content,
  file: candidatePath,
  root,
  assetOcr: 'auto',
});
blockers.push(...assetResult.failures);

if (candidateRisk !== 'low') {
  blockers.push(`candidate memory_risk=${candidateRisk}`);
}

if (blockers.length > 0) {
  console.error('Approval blocked.');
  for (const blocker of [...new Set(blockers)]) {
    console.error(`FAIL ${blocker}`);
  }
  process.exit(1);
}

const today = dateStamp();
const slug = slugify(parsed.data.slug ?? parsed.data.title ?? path.basename(candidatePath, '.md'));
const targetDir = path.join(root, 'src', 'content', 'publish', String(target));
const targetPath = path.join(targetDir, `${slug}.md`);
const existed = await pathExists(targetPath);

if (existed && !overwrite) {
  console.error(`Target already exists: ${toRelativePortable(root, targetPath)}`);
  process.exit(1);
}

if (gitDirtyFor(targetPath)) {
  console.error(`Target has uncommitted changes: ${toRelativePortable(root, targetPath)}`);
  process.exit(1);
}

const publicData = {
  ...stripInternalFields(parsed.data),
  date: parsed.data.date ?? today,
  draft: false,
  visibility: 'public',
  status: 'evergreen',
  source_type: 'compiled',
  source_url: parsed.data.source_url ?? '',
  captured_at: parsed.data.captured_at ?? today,
  owner: parsed.data.owner ?? 'kang',
  decision_summary: parsed.data.decision_summary ?? parsed.data.description ?? parsed.data.title ?? slug,
  next_actions: parsed.data.next_actions ?? [],
  aliases: parsed.data.aliases ?? [],
  related: parsed.data.related ?? [],
  slug,
};
const publicNote = matter.stringify(parsed.content.trimStart(), publicData);

await fs.mkdir(targetDir, { recursive: true });
await fs.writeFile(targetPath, publicNote, 'utf8');

try {
  for (const [command, commandArgs] of validation) {
    runInherit(command, commandArgs, { cwd: root });
  }

  if (runGraphify) {
    runInherit(npmCommand, ['run', 'graphify:update'], { cwd: root });
  }
} catch (error) {
  if (!existed) {
    await fs.rm(targetPath, { force: true });
  }
  console.error(error.message);
  console.error(`Rolled back approved note: ${toRelativePortable(root, targetPath)}`);
  process.exit(1);
}

console.log(`Approved public note: ${toRelativePortable(root, targetPath)}`);
