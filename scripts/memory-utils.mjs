import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function parseArgs(argv) {
  const parsed = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (!item.startsWith('--')) {
      parsed._.push(item);
      continue;
    }

    const [rawKey, inlineValue] = item.slice(2).split(/=(.*)/su, 2);
    const key = rawKey.replace(/-([a-z])/gu, (_, char) => char.toUpperCase());
    const value = inlineValue ?? (argv[index + 1]?.startsWith('--') ? true : argv[++index] ?? true);

    if (parsed[key] === undefined) {
      parsed[key] = value;
    } else if (Array.isArray(parsed[key])) {
      parsed[key].push(value);
    } else {
      parsed[key] = [parsed[key], value];
    }
  }

  return parsed;
}

export function arrayArg(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function dateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isoStamp(date = new Date()) {
  return date.toISOString();
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 80) || 'note';
}

export function hashId(value, length = 12) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, length);
}

export function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    maxBuffer: options.maxBuffer ?? 1024 * 1024 * 8,
    shell: options.shell ?? false,
  });

  if (result.status !== 0) {
    const error = (result.stderr || result.stdout || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed${error ? `: ${error}` : ''}`);
  }

  return result.stdout.trim();
}

export function runInherit(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
    shell: options.shell ?? false,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status ?? 1}`);
  }
}

export function git(repo, args) {
  return runCapture('git', ['-C', repo, ...args], { cwd: repo });
}

export function repoName(repoRoot) {
  return path.basename(repoRoot);
}

export function splitRepoEnv(value) {
  if (!value) return [];
  return value
    .split(/[;,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toRelativePortable(root, target) {
  return path.relative(root, target).replace(/\\/g, '/');
}
