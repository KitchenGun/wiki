import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { recommendMemoryAction, recommendationReasonCodes } from './memory-recommendation.mjs';

const projectRoot = process.cwd();
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-memory-'));
const wikiRoot = path.join(tempRoot, 'wiki');
const publishRoot = path.join(wikiRoot, 'src', 'content', 'publish');
const fixtureRepo = path.join(tempRoot, 'fixture-repo');
const privateVault = path.join(tempRoot, 'private-vault');
const node = process.execPath;

const internalOpsRecommendation = recommendMemoryAction({
  sourceRepo: 'KitchenGun/wiki',
  sourceVisibility: 'public',
  risk: 'low',
  subjects: ['Add watcher review recommendations'],
});
assert.equal(internalOpsRecommendation.category, 'internal-ops');
assert.equal(internalOpsRecommendation.action, 'deny');
assert.ok(internalOpsRecommendation.label);
assert.ok(recommendationReasonCodes.has(internalOpsRecommendation.reason_code));

const portfolioRecommendation = recommendMemoryAction({
  sourceRepo: 'KitchenGun/DualFire',
  sourceVisibility: 'public',
  risk: 'low',
  subjects: ['Implement Unreal camera inventory system'],
});
assert.equal(portfolioRecommendation.category, 'portfolio-worthy');
assert.equal(portfolioRecommendation.action, 'review');
assert.ok(portfolioRecommendation.label);
assert.ok(recommendationReasonCodes.has(portfolioRecommendation.reason_code));

function run(script, args = [], options = {}) {
  const result = spawnSync(node, [path.join(projectRoot, 'scripts', script), ...args], {
    cwd: options.cwd ?? wikiRoot,
    env: { ...process.env, PRIVATE_VAULT_ROOT: privateVault, ...options.env },
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4,
  });
  return result;
}

function git(args, cwd = fixtureRepo) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
}

async function writeValidationPackage({ build = 'node -e "process.exit(0)"' } = {}) {
  await write(path.join(wikiRoot, 'package.json'), `${JSON.stringify({
    scripts: {
      'memory:normalize': 'node -e "process.exit(0)"',
      'content:check': 'node -e "process.exit(0)"',
      graph: 'node -e "process.exit(0)"',
      build,
    },
  }, null, 2)}\n`);
}

await write(path.join(publishRoot, 'wiki', 'valid.md'), `---
title: Valid
description: Fixture note
date: 2026-07-02
tags: []
draft: false
visibility: public
status: evergreen
source_type: compiled
source_url: ""
captured_at: 2026-07-02
owner: kang
decision_summary: Fixture
next_actions: []
aliases: []
related: []
slug: valid
---

Public fixture content.
`);

let result = run('check-public-content.mjs', ['--root', wikiRoot, '--publish-root', publishRoot, '--strict-memory', '--asset-ocr-off']);
assert.equal(result.status, 0, result.stderr || result.stdout);

await write(path.join(publishRoot, 'wiki', 'secret.md'), `---
title: Secret
description: Fixture note
date: 2026-07-02
tags: []
draft: false
visibility: public
status: evergreen
source_type: compiled
source_url: ""
captured_at: 2026-07-02
owner: kang
decision_summary: Fixture
next_actions: []
aliases: []
related: []
slug: secret
---

OPENAI_API_KEY=sk-proj-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
`);

result = run('check-public-content.mjs', ['--root', wikiRoot, '--publish-root', publishRoot, '--strict-memory', '--asset-ocr-off']);
assert.notEqual(result.status, 0, 'content:check must fail on secret env assignment');
await fs.rm(path.join(publishRoot, 'wiki', 'secret.md'));

await fs.mkdir(fixtureRepo, { recursive: true });
git(['init']);
git(['config', 'user.email', 'fixture@example.invalid']);
git(['config', 'user.name', 'Fixture']);
await write(path.join(fixtureRepo, 'README.md'), '# Fixture\n');
git(['add', 'README.md']);
git(['commit', '-m', 'Add public fixture note']);
await write(path.join(fixtureRepo, 'secret.txt'), 'DATABASE_URL=postgres://user:pass@localhost:5432/app\n');
git(['add', 'secret.txt']);
git(['commit', '-m', 'Add private database config']);

result = run('memory-ingest.mjs', ['--repo', fixtureRepo, '--range', 'HEAD~1..HEAD', '--trigger', 'test']);
assert.equal(result.status, 0, result.stderr || result.stdout);
result = run('memory-ingest.mjs', ['--repo', fixtureRepo, '--range', 'HEAD~1..HEAD', '--trigger', 'test']);
assert.equal(result.status, 0, result.stderr || result.stdout);

const candidateFiles = await fs.readdir(path.join(wikiRoot, '.memory-work', 'public-candidates'));
assert.equal(candidateFiles.length, 1, 'ingest must be idempotent for the same commit range');
const packageFiles = await fs.readdir(path.join(wikiRoot, '.memory-work', 'packages'));
assert.equal(packageFiles.length, 1, 'ingest should create one package for the same commit range');
const highRiskPackage = JSON.parse(await fs.readFile(path.join(wikiRoot, '.memory-work', 'packages', packageFiles[0]), 'utf8'));
assert.equal(highRiskPackage.recommendation.category, 'risk-blocked', 'secret commit should be risk-blocked');
assert.ok(highRiskPackage.private_raw_path.includes(`${path.sep}raw${path.sep}`), 'raw private note should use raw vault folder');
assert.ok(highRiskPackage.private_compiled_path.includes(`${path.sep}compiled${path.sep}`), 'compiled private note should use compiled vault folder');
await fs.access(highRiskPackage.private_raw_path);
await fs.access(highRiskPackage.private_raw_package_path);
await fs.access(highRiskPackage.private_compiled_path);
await fs.access(path.join(privateVault, 'moc', 'repositories.md'));
await fs.access(path.join(privateVault, 'moc', 'decisions.md'));

const publishFiles = await fs.readdir(path.join(publishRoot, 'wiki'));
assert.deepEqual(publishFiles.sort(), ['valid.md']);

result = run('memory-approve.mjs', ['--candidate', path.basename(candidateFiles[0], '.md'), '--target', 'wiki']);
assert.notEqual(result.status, 0, 'memory:approve must reject high-risk candidates');

await write(path.join(fixtureRepo, 'public-note.txt'), 'Public implementation summary\n');
git(['add', 'public-note.txt']);
git(['commit', '-m', 'Add public implementation summary']);

result = run('memory-ingest.mjs', [
  '--repo',
  fixtureRepo,
  '--range',
  'HEAD~1..HEAD',
  '--trigger',
  'private-source-test',
  '--source-visibility',
  'private',
  '--source-full-name',
  'KitchenGun/FixturePrivate',
]);
assert.equal(result.status, 0, result.stderr || result.stdout);

const privateCandidateFiles = await fs.readdir(path.join(wikiRoot, '.memory-work', 'public-candidates'));
assert.equal(privateCandidateFiles.length, 2, 'private source ingest should create a review candidate');
const privateCandidate = privateCandidateFiles.find((file) => file.includes('private-source-test'));
assert.ok(privateCandidate, 'private source candidate should use the trigger id');

result = run('memory-approve.mjs', ['--candidate', path.basename(privateCandidate, '.md'), '--target', 'wiki']);
assert.notEqual(result.status, 0, 'memory:approve must reject private-source candidates');

result = run('memory-decide.mjs', [
  '--candidate',
  path.basename(privateCandidate, '.md'),
  '--decision',
  'denied',
]);
assert.notEqual(result.status, 0, 'memory:decide must require a reason for denied candidates');

result = run('memory-decide.mjs', [
  '--candidate',
  path.basename(privateCandidate, '.md'),
  '--decision',
  'denied',
  '--reason',
  'private source fixture',
]);
assert.equal(result.status, 0, result.stderr || result.stdout);
await fs.access(path.join(wikiRoot, '.memory-work', 'denied', `${path.basename(privateCandidate, '.md')}.json`));
const deniedDecisionPath = path.join(privateVault, 'decisions', `${path.basename(privateCandidate, '.md')}-denied.md`);
const deniedDecisionRaw = await fs.readFile(deniedDecisionPath, 'utf8');
assert.match(deniedDecisionRaw, /private source fixture/);

await write(path.join(fixtureRepo, 'camera-system.txt'), 'Unreal camera implementation summary\n');
git(['add', 'camera-system.txt']);
git(['commit', '-m', 'Implement Unreal camera workflow']);

result = run('memory-ingest.mjs', [
  '--repo',
  fixtureRepo,
  '--range',
  'HEAD~1..HEAD',
  '--trigger',
  'public-approval',
  '--source-visibility',
  'public',
  '--source-full-name',
  'KitchenGun/DualFire',
]);
assert.equal(result.status, 0, result.stderr || result.stdout);

const approvalCandidateFiles = await fs.readdir(path.join(wikiRoot, '.memory-work', 'public-candidates'));
const approvalCandidate = approvalCandidateFiles.find((file) => file.includes('public-approval'));
assert.ok(approvalCandidate, 'public approval candidate should use the trigger id');
const approvalCandidateId = path.basename(approvalCandidate, '.md');

await writeValidationPackage();
result = run('memory-approve.mjs', ['--candidate', approvalCandidateId, '--target', 'wiki']);
assert.equal(result.status, 0, result.stderr || result.stdout);
const approvedRelative = result.stdout.match(/Approved public note:\s*(.+)/)?.[1]?.trim();
assert.ok(approvedRelative, 'approval should print the approved public note path');
const approvedPath = path.join(wikiRoot, approvedRelative.replace(/\//gu, path.sep));
await fs.access(approvedPath);
await fs.access(path.join(wikiRoot, '.memory-work', 'approved', `${approvalCandidateId}.json`));
await fs.access(path.join(privateVault, 'decisions', `${approvalCandidateId}-approved.md`));

const originalApprovedRaw = 'ORIGINAL APPROVED NOTE\n';
await write(approvedPath, originalApprovedRaw);
await writeValidationPackage({ build: 'node -e "process.exit(1)"' });
result = run('memory-approve.mjs', ['--candidate', approvalCandidateId, '--target', 'wiki', '--overwrite']);
assert.notEqual(result.status, 0, 'memory:approve must fail when validation fails');
assert.equal(await fs.readFile(approvedPath, 'utf8'), originalApprovedRaw, 'overwrite approval failure must restore the previous public note');

result = run('memory-report.mjs', ['--format', 'json']);
assert.equal(result.status, 0, result.stderr || result.stdout);
const report = JSON.parse(result.stdout);
assert.equal(report.summary.denied, 1, 'report should count denied candidates');
assert.equal(report.summary.approved, 1, 'report should count approved candidates');
assert.ok(report.summary.pending >= 1, 'report should keep non-decided candidates pending');

console.log('memory workflow fixtures passed');
