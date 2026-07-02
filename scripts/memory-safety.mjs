import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fg from 'fast-glob';
import matter from 'gray-matter';

export const requiredMemoryFields = [
  'status',
  'source_type',
  'source_url',
  'captured_at',
  'decision_summary',
  'next_actions',
];

export const blockedPatterns = [
  { name: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu },
  { name: 'Korean mobile phone', pattern: /\b01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}\b/u },
  { name: 'Korean resident registration number', pattern: /\b\d{6}-[1-4]\d{6}\b/u },
  { name: 'OpenAI API key', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/u },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u },
  { name: 'Discord webhook', pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/iu },
  { name: 'Discord message URL', pattern: /https:\/\/discord(?:app)?\.com\/channels\/\d{17,20}\/\d{17,20}(?:\/\d{17,20})?/iu },
  { name: 'Discord snowflake id field', pattern: /\b(?:channel_id|thread_id|guild_id|user_id|message_id)\s*[:=]\s*["']?\d{17,20}/iu },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/u },
  { name: 'Google document id URL', pattern: /https:\/\/docs\.google\.com\/(?:spreadsheets|document|presentation|forms)\/d\/[A-Za-z0-9_-]+/iu },
  { name: 'Google Drive file URL', pattern: /https:\/\/drive\.google\.com\/(?:file\/d\/|drive\/folders\/)[A-Za-z0-9_-]+/iu },
  { name: 'Google short form URL', pattern: /https:\/\/forms\.gle\/[A-Za-z0-9_-]+/iu },
  { name: 'Google id field', pattern: /\b(?:spreadsheet_id|doc_id|document_id|drive_id|folder_id|file_id|presentation_id)\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/iu },
  { name: 'Bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/u },
  { name: 'JWT token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u },
  { name: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u },
  { name: 'GCP service account key', pattern: /"type"\s*:\s*"service_account"[\s\S]{0,500}"private_key"/iu },
  { name: 'Azure storage connection string', pattern: /DefaultEndpointsProtocol=https;AccountName=[^;\s]+;AccountKey=[^;\s]+/iu },
  { name: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { name: 'database URL', pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|mssql):\/\/[^\s'")\]]+/iu },
  { name: 'sensitive env assignment', pattern: /^\s*[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD|DATABASE_URL|CONNECTION_STRING|CLIENT_ID|CLIENT_SECRET|PRIVATE)[A-Z0-9_]*\s*=\s*.+$/imu },
  { name: 'OAuth secret field', pattern: /\b(?:refresh_token|client_secret|oauth_token|access_token)\s*[:=]\s*["']?[A-Za-z0-9._~+/-]{16,}/iu },
  { name: 'local Windows path', pattern: /\b[A-Z]:\\[^\s'")\]]+/iu },
  { name: 'Windows profile env path', pattern: /%(?:APPDATA|LOCALAPPDATA|USERPROFILE|HOMEPATH)%/iu },
  { name: 'UNC path', pattern: /\\\\[A-Za-z0-9_.-]+\\[^\s'")\]]+/u },
  { name: 'file URL', pattern: /file:\/\/\/?[^\s'")\]]+/iu },
  { name: 'POSIX local path', pattern: /(^|[\s("'`])\/(?:Users|home|var|etc|tmp|mnt|Volumes|opt)\/[^\s'")\]]+/iu },
  { name: 'GitHub issue or PR URL requiring public verification', pattern: /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/\d+/iu },
  { name: 'GitHub private settings URL', pattern: /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:settings|security|actions\/runs)\/?[^\s'")]*/iu },
];

const allowedAssetExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.ico']);
const suspiciousAssetName = /\b(?:secret|private|internal|raw|token|key|password|credential|unredacted)\b/iu;
let tesseractAvailable;

export function scanText(text) {
  const failures = [];

  for (const blocked of blockedPatterns) {
    blocked.pattern.lastIndex = 0;
    if (blocked.pattern.test(text)) {
      failures.push(`blocked ${blocked.name} pattern`);
    }
  }

  return failures;
}

export function hasBlockedText(text) {
  return scanText(text).length > 0;
}

export function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function extractAssetLinks(content) {
  const links = [];
  const markdownImage = /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu;
  const htmlMedia = /\b(?:src|poster)=["']([^"']+)["']/giu;

  for (const match of content.matchAll(markdownImage)) {
    links.push(match[1].replace(/^<|>$/g, ''));
  }

  for (const match of content.matchAll(htmlMedia)) {
    links.push(match[1]);
  }

  return links;
}

function shouldSkipAsset(link) {
  return (
    link.startsWith('#') ||
    link.startsWith('data:') ||
    /^[a-z][a-z0-9+.-]*:/iu.test(link)
  );
}

function resolveAssetPath(link, file, root) {
  const clean = decodeURIComponent(link.split(/[?#]/u)[0]);

  if (clean.includes('..')) {
    return { clean, failure: `linked asset uses path traversal: ${link}` };
  }

  if (clean.startsWith('/')) {
    return { clean, resolved: path.resolve(root, 'public', clean.slice(1)) };
  }

  return { clean, resolved: path.resolve(path.dirname(file), clean) };
}

async function hasExifMarker(file) {
  const buffer = await fs.readFile(file);
  if (buffer.includes(Buffer.from('Exif', 'ascii'))) {
    return true;
  }
  return false;
}

function canRunTesseract() {
  if (tesseractAvailable !== undefined) return tesseractAvailable;
  const result = spawnSync('tesseract', ['--version'], {
    encoding: 'utf8',
    stdio: 'ignore',
  });
  tesseractAvailable = result.status === 0;
  return tesseractAvailable;
}

function runOcr(file) {
  const result = spawnSync('tesseract', [file, 'stdout'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });

  if (result.status !== 0) {
    return '';
  }

  return result.stdout ?? '';
}

export async function inspectLinkedAssets({ content, file, root, assetOcr = 'auto' }) {
  const failures = [];
  const warnings = [];
  const links = extractAssetLinks(content);

  for (const link of links) {
    if (shouldSkipAsset(link)) continue;

    const { clean, resolved, failure } = resolveAssetPath(link, file, root);
    if (failure) {
      failures.push(failure);
      continue;
    }

    const ext = path.extname(clean).toLowerCase();
    const name = path.basename(clean);

    if (!allowedAssetExtensions.has(ext)) {
      failures.push(`linked asset has disallowed extension: ${clean}`);
    }

    if (suspiciousAssetName.test(name)) {
      failures.push(`linked asset has suspicious filename: ${clean}`);
    }

    try {
      const stat = await fs.stat(resolved);
      if (!stat.isFile()) {
        failures.push(`linked asset is not a file: ${clean}`);
        continue;
      }
    } catch {
      failures.push(`linked asset is missing: ${clean}`);
      continue;
    }

    const binary = await fs.readFile(resolved);
    const binaryText = binary.toString('utf8');
    for (const failureText of scanText(binaryText)) {
      failures.push(`${clean}: ${failureText}`);
    }

    if (await hasExifMarker(resolved)) {
      failures.push(`linked asset contains EXIF metadata: ${clean}`);
    }

    if (assetOcr === 'off') continue;
    if (!canRunTesseract()) {
      if (assetOcr === 'required') {
        failures.push(`linked asset OCR unavailable: ${clean}`);
      }
      continue;
    }

    const ocrText = runOcr(resolved);
    for (const failureText of scanText(ocrText)) {
      failures.push(`${clean}: OCR ${failureText}`);
    }
  }

  return { failures, warnings };
}

export async function checkPublicContent({
  root = process.cwd(),
  publishRoot = path.join(root, 'src/content/publish'),
  strictMemory = false,
  assetOcr = 'auto',
} = {}) {
  const files = await fg(['**/*.{md,mdx}'], {
    cwd: publishRoot,
    absolute: true,
    dot: true,
  });
  const blockedDotDirs = await fg(['**/.obsidian/**', '**/.git/**'], {
    cwd: publishRoot,
    absolute: false,
    dot: true,
    onlyFiles: false,
  });

  const failures = [];
  const warnings = [];

  for (const blockedDir of blockedDotDirs) {
    failures.push(`${toPosix(path.relative(root, path.join(publishRoot, blockedDir)))}: blocked private metadata directory in publish tree`);
  }

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = matter(raw);
    const relative = toPosix(path.relative(root, file));
    const visibility = parsed.data.visibility ?? 'public';
    const draft = parsed.data.draft === true;
    const status = parsed.data.status ?? 'evergreen';
    const sourceType = parsed.data.source_type ?? 'compiled';
    const searchable = `${JSON.stringify(parsed.data)}\n${parsed.content}`;

    if (visibility !== 'public') {
      failures.push(`${relative}: publish tree contains visibility=${visibility}`);
    }

    if (draft) {
      failures.push(`${relative}: publish tree contains draft=true`);
    }

    if (status === 'draft' || status === 'inbox') {
      failures.push(`${relative}: publish tree contains status=${status}`);
    }

    if ((status === 'draft' || status === 'inbox') && parsed.data.draft === false) {
      failures.push(`${relative}: status=${status} cannot be combined with draft=false`);
    }

    if (sourceType === 'raw') {
      failures.push(`${relative}: public publish tree cannot expose source_type=raw`);
    }

    for (const failure of scanText(searchable)) {
      failures.push(`${relative}: ${failure}`);
    }

    const assetResult = await inspectLinkedAssets({ content: parsed.content, file, root, assetOcr });
    for (const failure of assetResult.failures) {
      failures.push(`${relative}: ${failure}`);
    }
    for (const warning of assetResult.warnings) {
      warnings.push(`${relative}: ${warning}`);
    }

    for (const field of requiredMemoryFields) {
      if (!(field in parsed.data)) {
        const message = `${relative}: missing LLM memory field "${field}"`;
        if (strictMemory) {
          failures.push(message);
        } else {
          warnings.push(message);
        }
      }
    }
  }

  return { checkedFiles: files.length, failures, warnings };
}
