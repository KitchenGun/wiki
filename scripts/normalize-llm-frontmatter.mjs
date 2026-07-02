import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';

const root = process.cwd();
const publishRoot = path.join(root, 'src/content/publish');
const today = new Date().toISOString().slice(0, 10);

const files = await fg(['**/*.{md,mdx}'], {
  cwd: publishRoot,
  absolute: true,
});

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
}

function hasFrontmatterKey(frontmatter, key) {
  return new RegExp(`^${key}:`, 'm').test(frontmatter);
}

function formatDate(value) {
  if (!value) return today;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().slice(0, 10);
  }
  return today;
}

function formatCapturedAt(capturedAt, fallbackDate) {
  if (fallbackDate) {
    return formatDate(fallbackDate);
  }
  if (typeof capturedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(capturedAt)) {
    return capturedAt;
  }
  return formatDate(fallbackDate ?? capturedAt);
}

let changed = 0;

for (const file of files) {
  const raw = await fs.readFile(file, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`Missing frontmatter: ${path.relative(root, file)}`);
  }

  const frontmatter = match[1];
  const parsed = matter(raw);
  const additions = [];
  const summary = parsed.data.description || parsed.data.title || path.basename(file, path.extname(file));

  const defaults = {
    status: 'evergreen',
    source_type: 'compiled',
    source_url: '',
    captured_at: formatCapturedAt(parsed.data.captured_at, parsed.data.date),
    owner: 'kang',
    decision_summary: summary,
    next_actions: [],
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (hasFrontmatterKey(frontmatter, key)) continue;

    if (Array.isArray(value)) {
      additions.push(`${key}: []`);
    } else {
      additions.push(`${key}: ${yamlString(value)}`);
    }
  }

  const dateNeedsUpdate =
    hasFrontmatterKey(frontmatter, 'captured_at') &&
    (!/^captured_at:\s*"?\d{4}-\d{2}-\d{2}"?\s*$/m.test(frontmatter) ||
      (parsed.data.date && formatCapturedAt(parsed.data.captured_at, parsed.data.date) !== formatDate(parsed.data.captured_at)));

  if (additions.length === 0 && !dateNeedsUpdate) continue;

  let nextFrontmatter = frontmatter.trimEnd();
  if (hasFrontmatterKey(nextFrontmatter, 'captured_at')) {
    nextFrontmatter = nextFrontmatter.replace(
      /^captured_at:\s*.+$/m,
      `captured_at: ${yamlString(formatCapturedAt(parsed.data.captured_at, parsed.data.date))}`,
    );
  }
  if (additions.length > 0) {
    nextFrontmatter = `${nextFrontmatter}\n${additions.join('\n')}`;
  }
  nextFrontmatter = `${nextFrontmatter}\n`;
  const nextRaw = raw.replace(match[0], `---\n${nextFrontmatter}---\n`);
  await fs.writeFile(file, nextRaw, 'utf8');
  changed += 1;
}

console.log(`Normalized LLM frontmatter in ${changed} file(s).`);
