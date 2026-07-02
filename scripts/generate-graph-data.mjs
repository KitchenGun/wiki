import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { extractWikiLinks, slugifyWikiTarget } from '../src/lib/wiki-links.mjs';

const root = process.cwd();
const contentRoot = path.join(root, 'src/content/publish');
const outputPath = path.join(root, 'public/graph-data.json');

const files = await fg(['blog/**/*.{md,mdx}', 'wiki/**/*.{md,mdx}'], {
  cwd: contentRoot,
  absolute: true,
});

const entries = [];

function serializeDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

for (const file of files) {
  const raw = await fs.readFile(file, 'utf8');
  const parsed = matter(raw);
  const visibility = parsed.data.visibility ?? 'public';
  const draft = parsed.data.draft === true;

  if (visibility !== 'public' || draft) continue;

  const relative = path.relative(contentRoot, file).replace(/\\/g, '/');
  const collection = relative.split('/')[0];
  const id = relative
    .replace(`${collection}/`, '')
    .replace(/\.(md|mdx)$/i, '')
    .toLowerCase();
  const slug = parsed.data.slug ?? id;

  entries.push({
    id: slug,
    sourceId: id,
    collection,
    title: parsed.data.title ?? id,
    description: parsed.data.description ?? '',
    tags: parsed.data.tags ?? [],
    status: parsed.data.status ?? 'evergreen',
    sourceType: parsed.data.source_type ?? 'compiled',
    sourceUrl: parsed.data.source_url ?? '',
    capturedAt: serializeDate(parsed.data.captured_at),
    owner: parsed.data.owner ?? '',
    decisionSummary: parsed.data.decision_summary ?? '',
    nextActions: parsed.data.next_actions ?? [],
    aliases: parsed.data.aliases ?? [],
    related: parsed.data.related ?? [],
    url: `/${collection}/${slug}/`,
    links: extractWikiLinks(parsed.content),
  });
}

const nodes = entries.map(({ links, ...entry }) => entry);
const knownWikiIds = new Set(entries.filter((entry) => entry.collection === 'wiki').map((entry) => entry.id));
const edges = entries.flatMap((entry) =>
  entry.links
    .filter((link) => knownWikiIds.has(link.slug))
    .map((link) => ({
      source: `${entry.collection}:${entry.id}`,
      target: `wiki:${slugifyWikiTarget(link.target)}`,
      label: link.alias,
    })),
);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), nodes, edges }, null, 2)}\n`,
);
