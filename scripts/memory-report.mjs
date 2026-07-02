import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { parseArgs, toRelativePortable } from './memory-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const packageRoot = path.join(root, '.memory-work', 'packages');
const format = args.format ?? 'md';
await fs.mkdir(packageRoot, { recursive: true });
const files = await fg(['*.json'], {
  cwd: packageRoot,
  absolute: true,
});

const packages = [];

for (const file of files) {
  const raw = await fs.readFile(file, 'utf8');
  packages.push(JSON.parse(raw));
}

packages.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

if (format === 'json') {
  console.log(JSON.stringify({ packages }, null, 2));
  process.exit(0);
}

console.log('# Memory Work Report');
console.log('');
console.log(`Packages: ${packages.length}`);
console.log('');

for (const item of packages) {
  console.log(`## ${item.id}`);
  console.log('');
  console.log(`- trigger: ${item.trigger}`);
  console.log(`- repos: ${(item.repos ?? []).join(', ')}`);
  console.log(`- commit_range: ${item.commit_range}`);
  console.log(`- risk: ${item.risk}`);
  console.log(`- approval_required: ${item.approval_required}`);
  console.log(`- private_summary_path: ${item.private_summary_path}`);
  console.log('- public_candidates:');
  for (const candidate of item.public_candidates ?? []) {
    const candidatePath = path.isAbsolute(candidate.path)
      ? toRelativePortable(root, candidate.path)
      : candidate.path;
    console.log(`  - ${candidate.id}: ${candidatePath} (${candidate.risk})`);
  }
  console.log('- validation:');
  for (const command of item.validation ?? []) {
    console.log(`  - ${command}`);
  }
  console.log('');
}
