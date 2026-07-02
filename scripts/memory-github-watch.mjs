import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  hashId,
  isoStamp,
  parseArgs,
  runCapture,
  slugify,
  toRelativePortable,
} from './memory-utils.mjs';

await loadDefaultEnvFiles();

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const owner = String(args.owner ?? process.env.HERMES_GITHUB_OWNER ?? process.env.GITHUB_OWNER ?? detectOwner());
const repoRootArg = args.repoRoot ?? process.env.HERMES_REPO_ROOT ?? process.env.MEMORY_GITHUB_REPO_ROOT;
const stateRoot = path.resolve(String(args.stateRoot ?? process.env.HERMES_STATE_ROOT ?? path.join(root, '.memory-work', 'github-watch')));
const statePath = path.join(stateRoot, 'state.json');
const limit = Number(args.limit ?? process.env.HERMES_REPO_LIMIT ?? 200);
const includeForks = args.skipForks ? false : String(args.includeForks ?? process.env.HERMES_INCLUDE_FORKS ?? 'true') !== 'false';
const includeArchived = String(args.includeArchived ?? process.env.HERMES_INCLUDE_ARCHIVED ?? 'false') === 'true';
const dryRun = args.dryRun === true || args.dryRun === 'true';
const notify = args.notify === true || args.notify === 'true';
const processFirstRun = args.processFirstRun === true || args.processFirstRun === 'true';
const maxWindow = Number(args.maxWindow ?? process.env.HERMES_MAX_COMMIT_WINDOW ?? 50);
const onlyRepos = new Set(arrayValue(args.only).map((value) => String(value)));
const cloneProtocol = String(args.cloneProtocol ?? process.env.HERMES_CLONE_PROTOCOL ?? 'auto');
const cloneFilter = String(args.cloneFilter ?? process.env.HERMES_GIT_CLONE_FILTER ?? 'blob:none');
const cloneDepth = Number(args.cloneDepth ?? process.env.HERMES_GIT_CLONE_DEPTH ?? 200);
const repoRoot = repoRootArg ? path.resolve(String(repoRootArg)) : '';
const ghAvailable = hasCommand('gh', ['--version']);
const askpassPath = path.join(stateRoot, 'github-askpass.sh');

if (!repoRoot && !dryRun) {
  console.error('--repo-root or HERMES_REPO_ROOT is required unless --dry-run is used.');
  process.exit(1);
}

if (!process.env.PRIVATE_VAULT_ROOT && !dryRun) {
  console.error('PRIVATE_VAULT_ROOT is required unless --dry-run is used.');
  process.exit(1);
}

if (!ghAvailable && !githubToken()) {
  console.error('gh is unavailable and no GitHub token was found. Set GITHUB_TOKEN, GH_TOKEN, or AI_TRENDS_GITHUB_TOKEN.');
  process.exit(1);
}

await fs.mkdir(stateRoot, { recursive: true });
if (repoRoot) {
  await fs.mkdir(repoRoot, { recursive: true });
}

const state = await loadState();
const repos = filterRepos(await listRepos(owner));
const summary = {
  owner,
  discovered: repos.length,
  skipped: [],
  bootstrapped: [],
  unchanged: [],
  changed: [],
  ingested: [],
  errors: [],
  dry_run: dryRun,
  updated_at: isoStamp(),
};

for (const repo of repos) {
  const branch = repo.defaultBranchRef?.name;

  if (!branch) {
    summary.skipped.push({ repo: repo.nameWithOwner, reason: 'no default branch' });
    continue;
  }

  const repoState = getRepoState(repo.nameWithOwner, branch);
  const clonePath = repoClonePath(repo);

  try {
    if (dryRun) {
      summary.unchanged.push({ repo: repo.nameWithOwner, branch, mode: 'dry-run' });
      continue;
    }

    await ensureClone(repo, clonePath);
    fetchRepo(clonePath);
    const headSha = git(clonePath, ['rev-parse', `refs/remotes/origin/${branch}`]);
    const previousSha = repoState.last_processed_sha;

    state.repos[repo.nameWithOwner] = {
      ...state.repos[repo.nameWithOwner],
      full_name: repo.nameWithOwner,
      private: repo.isPrivate,
      visibility: repo.isPrivate ? 'private' : 'public',
      fork: repo.isFork,
      archived: repo.isArchived,
      default_branch: branch,
      clone_path: clonePath,
      pushed_at: repo.pushedAt,
      last_seen_at: isoStamp(),
      refs: {
        ...(state.repos[repo.nameWithOwner]?.refs ?? {}),
        [branch]: {
          ...repoState,
          last_remote_sha: headSha,
        },
      },
    };

    if (!previousSha) {
      state.repos[repo.nameWithOwner].refs[branch].last_processed_sha = headSha;
      state.repos[repo.nameWithOwner].refs[branch].bootstrapped_at = isoStamp();
      summary.bootstrapped.push({ repo: repo.nameWithOwner, branch, head: shortSha(headSha) });
      continue;
    }

    if (previousSha === headSha) {
      summary.unchanged.push({ repo: repo.nameWithOwner, branch, head: shortSha(headSha) });
      continue;
    }

    const range = computeRange(clonePath, previousSha, headSha, maxWindow);
    const commitCount = Number(git(clonePath, ['rev-list', '--count', `${range.base}..${headSha}`]));
    const trigger = triggerName(repo.nameWithOwner, branch, range.base, headSha);
    summary.changed.push({
      repo: repo.nameWithOwner,
      branch,
      from: shortSha(previousSha),
      to: shortSha(headSha),
      commits: commitCount,
      forced: range.forced,
    });

    const ingestOutput = runCapture(npmCommand, [
      'run',
      'memory:ingest',
      '--',
      '--repo',
      clonePath,
      '--range',
      `${range.base}..${headSha}`,
      '--trigger',
      trigger,
      '--source-visibility',
      repo.isPrivate ? 'private' : 'public',
      '--source-full-name',
      repo.nameWithOwner,
      '--source-branch',
      branch,
    ], { cwd: root, maxBuffer: 1024 * 1024 * 16 });

    state.repos[repo.nameWithOwner].refs[branch].last_processed_sha = headSha;
    state.repos[repo.nameWithOwner].refs[branch].last_processed_at = isoStamp();
    state.windows[hashId(`${repo.nameWithOwner}:${branch}:${range.base}:${headSha}`, 24)] = {
      repo: repo.nameWithOwner,
      branch,
      base_sha: range.base,
      head_sha: headSha,
      commit_count: commitCount,
      trigger,
      ingested_at: isoStamp(),
    };
    summary.ingested.push({
      repo: repo.nameWithOwner,
      branch,
      commits: commitCount,
      visibility: repo.isPrivate ? 'private' : 'public',
      output: ingestOutput.split(/\r?\n/u).filter(Boolean).slice(-4),
    });
  } catch (error) {
    if (/Remote branch .* not found in upstream origin/u.test(error.message)) {
      summary.skipped.push({
        repo: repo.nameWithOwner,
        branch,
        reason: 'default branch missing on remote',
      });
      continue;
    }

    summary.errors.push({
      repo: repo.nameWithOwner,
      branch,
      error: error.message,
    });
  }
}

state.owner = owner;
state.updated_at = isoStamp();
await saveState(state);

printSummary(summary);

if (notify) {
  await sendDiscord(summary);
}

function detectOwner() {
  try {
    return runCapture('gh', ['api', 'user', '--jq', '.login'], { cwd: root });
  } catch {
    return 'KitchenGun';
  }
}

function arrayValue(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(statePath, 'utf8'));
  } catch {
    return {
      version: 1,
      owner,
      repos: {},
      windows: {},
      updated_at: isoStamp(),
    };
  }
}

async function loadDefaultEnvFiles() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return;

  for (const file of [
    path.join(home, '.hermes', '.env'),
    path.join(home, '.hermes', 'codex-control.env'),
  ]) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      for (const line of raw.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [key, ...valueParts] = trimmed.split('=');
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) continue;
        if (process.env[key] !== undefined) continue;
        process.env[key] = valueParts.join('=').trim().replace(/^["']|["']$/gu, '');
      }
    } catch {
      // Optional env file.
    }
  }
}

async function saveState(nextState) {
  const tempPath = `${statePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, statePath);
}

function listRepos(repoOwner) {
  if (!ghAvailable) {
    return listReposFromApi(repoOwner);
  }

  const output = runCapture('gh', [
    'repo',
    'list',
    repoOwner,
    '--limit',
    String(limit),
    '--json',
    'nameWithOwner,isPrivate,isFork,isArchived,defaultBranchRef,pushedAt,url,sshUrl',
  ], { cwd: root, maxBuffer: 1024 * 1024 * 16 });

  return JSON.parse(output);
}

async function listReposFromApi(repoOwner) {
  const token = githubToken();
  const repos = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner&sort=pushed&direction=desc`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'wiki-memory-github-watch',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub repo list failed: ${response.status} ${await response.text()}`);
    }

    const pageItems = await response.json();
    repos.push(
      ...pageItems
        .filter((repo) => repo.full_name?.startsWith(`${repoOwner}/`))
        .map((repo) => ({
          nameWithOwner: repo.full_name,
          isPrivate: repo.private,
          isFork: repo.fork,
          isArchived: repo.archived,
          defaultBranchRef: { name: repo.default_branch ?? '' },
          pushedAt: repo.pushed_at,
          url: repo.html_url,
          sshUrl: repo.ssh_url,
          cloneUrl: repo.clone_url,
        })),
    );

    if (pageItems.length < 100) break;
    page += 1;
  }

  return repos;
}

function filterRepos(repoList) {
  return repoList.filter((repo) => {
    if (!includeForks && repo.isFork) return false;
    if (!includeArchived && repo.isArchived) return false;
    if (onlyRepos.size > 0 && !onlyRepos.has(repo.nameWithOwner)) return false;
    return true;
  });
}

function getRepoState(fullName, branch) {
  return state.repos[fullName]?.refs?.[branch] ?? {};
}

function repoClonePath(repo) {
  const [repoOwner, repoName] = repo.nameWithOwner.split('/');
  return path.join(repoRoot, slugify(repoOwner), repoName);
}

async function ensureClone(repo, clonePath) {
  try {
    await fs.access(path.join(clonePath, '.git'));
    return;
  } catch {
    await fs.mkdir(path.dirname(clonePath), { recursive: true });
  }

  if (cloneProtocol === 'gh' || (cloneProtocol === 'auto' && ghAvailable)) {
    runCapture('gh', ['repo', 'clone', repo.nameWithOwner, clonePath], { cwd: root, maxBuffer: 1024 * 1024 * 16 });
    return;
  }

  await ensureAskpass();
  const url = cloneProtocol === 'ssh' ? repo.sshUrl : (repo.cloneUrl ?? `${repo.url}.git`);
  const cloneArgs = ['clone', '--no-tags', '--no-checkout'];
  const branch = repo.defaultBranchRef?.name;

  if (cloneDepth > 0) {
    cloneArgs.push(`--depth=${cloneDepth}`);
  }

  if (cloneFilter && cloneFilter !== 'off') {
    cloneArgs.push(`--filter=${cloneFilter}`);
  }

  if (branch) {
    cloneArgs.push('--single-branch', '--branch', branch);
  }

  cloneArgs.push(url, clonePath);

  runCapture('git', cloneArgs, {
    cwd: root,
    env: gitAuthEnv(),
    maxBuffer: 1024 * 1024 * 16,
  });
}

function fetchRepo(clonePath) {
  const fetchArgs = ['fetch', '--prune', '--no-tags'];
  if (cloneDepth > 0) {
    fetchArgs.push(`--depth=${cloneDepth}`);
  }
  fetchArgs.push('origin', '+refs/heads/*:refs/remotes/origin/*');
  git(clonePath, fetchArgs);
}

function git(repo, gitArgs) {
  return runCapture('git', ['-C', repo, ...gitArgs], {
    cwd: repo,
    env: gitAuthEnv(),
    maxBuffer: 1024 * 1024 * 16,
  });
}

async function ensureAskpass() {
  if (!githubToken()) return;

  const script = [
    '#!/bin/sh',
    'case "$1" in',
    '  *Username*) printf "%s\\n" "x-access-token" ;;',
    '  *) printf "%s\\n" "${GITHUB_TOKEN:-${GH_TOKEN:-${AI_TRENDS_GITHUB_TOKEN:-}}}" ;;',
    'esac',
    '',
  ].join('\n');

  await fs.mkdir(path.dirname(askpassPath), { recursive: true });
  await fs.writeFile(askpassPath, script, { encoding: 'utf8', mode: 0o700 });
  await fs.chmod(askpassPath, 0o700);
}

function gitAuthEnv() {
  const token = githubToken();
  if (!token) return {};

  return {
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: askpassPath,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? token,
    GH_TOKEN: process.env.GH_TOKEN ?? token,
    AI_TRENDS_GITHUB_TOKEN: process.env.AI_TRENDS_GITHUB_TOKEN ?? token,
  };
}

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.AI_TRENDS_GITHUB_TOKEN || '';
}

function hasCommand(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: process.env,
    stdio: 'ignore',
  });
  return result.status === 0;
}

function isAncestor(repo, base, head) {
  const result = spawnSync('git', ['-C', repo, 'merge-base', '--is-ancestor', base, head], {
    cwd: repo,
    env: process.env,
    stdio: 'ignore',
  });
  return result.status === 0;
}

function computeRange(repo, previousSha, headSha, maxCommits) {
  if (isAncestor(repo, previousSha, headSha)) {
    const count = Number(git(repo, ['rev-list', '--count', `${previousSha}..${headSha}`]));
    if (count <= maxCommits) {
      return { base: previousSha, forced: false };
    }
  }

  const revs = git(repo, ['rev-list', `--max-count=${maxCommits + 1}`, headSha])
    .split(/\r?\n/u)
    .filter(Boolean);
  const base = revs.length > maxCommits ? revs[revs.length - 1] : `${headSha}^`;
  return { base, forced: true };
}

function triggerName(fullName, branch, base, head) {
  return `github-poll-${fullName.replace('/', '-')}-${branch}-${shortSha(base)}-${shortSha(head)}`;
}

function shortSha(sha) {
  return String(sha ?? '').slice(0, 8);
}

function printSummary(item) {
  console.log(JSON.stringify(item, null, 2));
  if (repoRoot) {
    console.log(`Repo root: ${repoRoot}`);
  }
  console.log(`State: ${toRelativePortable(root, statePath)}`);
}

async function sendDiscord(item) {
  const content = renderDiscordMessage(item);
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL ?? process.env.HERMES_DISCORD_WEBHOOK_URL;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.HERMES_DISCORD_CHANNEL_ID ?? process.env.DISCORD_CHANNEL_ID ?? '1504020211194662994';

  if (webhookUrl) {
    await postJson(webhookUrl, {
      content,
      allowed_mentions: { parse: [] },
    });
    return;
  }

  if (botToken && channelId) {
    await postJson(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      content,
      allowed_mentions: { parse: [] },
    }, {
      Authorization: `Bot ${botToken}`,
    });
    return;
  }

  throw new Error('Discord notification requested, but DISCORD_WEBHOOK_URL or DISCORD_BOT_TOKEN is missing.');
}

function renderDiscordMessage(item) {
  const lines = [
    '[Hermes GitHub Watch]',
    `owner: ${item.owner}`,
    `repos: ${item.discovered}`,
    `bootstrapped: ${item.bootstrapped.length}`,
    `changed: ${item.changed.length}`,
    `ingested: ${item.ingested.length}`,
    `skipped: ${item.skipped.length}`,
    `errors: ${item.errors.length}`,
  ];

  for (const entry of item.ingested.slice(0, 8)) {
    lines.push(`- ${entry.repo} ${entry.branch}: ${entry.commits} commit(s), ${entry.visibility}`);
  }

  for (const entry of item.errors.slice(0, 5)) {
    lines.push(`! ${entry.repo}: ${entry.error.slice(0, 140)}`);
  }

  const message = lines.join('\n');
  return message.length > 1900 ? `${message.slice(0, 1890)}\n...` : message;
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Discord send failed: ${response.status} ${await response.text()}`);
  }
}
