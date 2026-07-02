import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { parseArgs, toRelativePortable } from './memory-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workRoot = path.join(root, '.memory-work');
const packageRoot = path.join(workRoot, 'packages');
const format = args.format ?? 'md';

await fs.mkdir(packageRoot, { recursive: true });

async function readJsonFiles(dir) {
  const files = await fg(['*.json'], {
    cwd: dir,
    absolute: true,
    onlyFiles: true,
  }).catch(() => []);
  const items = [];

  for (const file of files) {
    try {
      items.push({ ...JSON.parse(await fs.readFile(file, 'utf8')), _file: file });
    } catch {
      // Ignore corrupt staging records in the report instead of blocking review.
    }
  }

  return items;
}

function markerById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function candidatePath(item) {
  const candidate = item.public_candidates?.[0] ?? {};
  const rawPath = candidate.path ?? '';
  if (!rawPath) return '';
  return path.isAbsolute(rawPath) ? toRelativePortable(root, rawPath) : rawPath;
}

const packages = await readJsonFiles(packageRoot);
const approvedMarkers = markerById(await readJsonFiles(path.join(workRoot, 'approved')));
const deniedMarkers = markerById(await readJsonFiles(path.join(workRoot, 'denied')));

const enriched = packages.map((item) => {
  const approved = approvedMarkers.get(item.id);
  const denied = deniedMarkers.get(item.id);
  const decision = item.decision ?? approved ?? denied ?? null;
  const status = decision?.status ?? (approved ? 'approved' : denied ? 'denied' : 'pending');

  return {
    ...item,
    decision_status: status,
    decision,
    candidate_path: candidatePath(item),
  };
}).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

const groups = {
  pending: enriched.filter((item) => item.decision_status === 'pending'),
  approved: enriched.filter((item) => item.decision_status === 'approved'),
  denied: enriched.filter((item) => item.decision_status === 'denied'),
};

if (format === 'json') {
  console.log(JSON.stringify({
    summary: {
      total: enriched.length,
      pending: groups.pending.length,
      approved: groups.approved.length,
      denied: groups.denied.length,
    },
    packages: enriched,
    groups,
  }, null, 2));
  process.exit(0);
}

function printItem(item) {
  const recommendation = item.recommendation ?? item.public_candidates?.[0]?.recommendation ?? {};
  console.log(`- ${item.id}`);
  console.log(`  - status: ${item.decision_status}`);
  console.log(`  - repo: ${item.source_full_name || (item.repos ?? []).join(', ') || '-'}`);
  console.log(`  - commit_range: ${item.commit_range}`);
  console.log(`  - risk: ${item.risk}`);
  console.log(`  - recommendation: ${recommendation.label || '-'}${recommendation.reason_code ? ` (${recommendation.reason_code})` : ''}`);
  if (recommendation.reason) console.log(`  - reason: ${recommendation.reason}`);
  if (item.candidate_path) console.log(`  - candidate: ${item.candidate_path}`);
  if (item.private_compiled_path) console.log(`  - compiled: ${item.private_compiled_path}`);
  if (item.decision?.reason) console.log(`  - decision_reason: ${item.decision.reason}`);
  if (item.decision?.approved_path) console.log(`  - approved_path: ${item.decision.approved_path}`);
  if (item.decision_status === 'pending') {
    console.log(`  - show: !memory show ${item.id}`);
    console.log(`  - approve: !memory approve ${item.id} wiki`);
    console.log(`  - deny: !memory deny ${item.id} <reason>`);
  }
}

console.log('# Memory Work Report');
console.log('');
console.log(`Total: ${enriched.length}`);
console.log(`Pending: ${groups.pending.length}`);
console.log(`Approved: ${groups.approved.length}`);
console.log(`Denied: ${groups.denied.length}`);
console.log('');

for (const [title, items] of [
  ['Pending', groups.pending],
  ['Approved', groups.approved],
  ['Denied', groups.denied],
]) {
  console.log(`## ${title}`);
  console.log('');
  if (!items.length) {
    console.log('- none');
  } else {
    for (const item of items) printItem(item);
  }
  console.log('');
}
