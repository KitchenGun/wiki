import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-memory-'));
const wikiRoot = path.join(tempRoot, 'wiki');
const publishRoot = path.join(wikiRoot, 'src', 'content', 'publish');
const fixtureRepo = path.join(tempRoot, 'fixture-repo');
const privateVault = path.join(tempRoot, 'private-vault');
const node = process.execPath;

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

console.log('memory workflow fixtures passed');
