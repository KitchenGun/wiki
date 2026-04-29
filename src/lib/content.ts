import type { CollectionEntry } from 'astro:content';

export type PublishEntry = CollectionEntry<'blog'> | CollectionEntry<'wiki'>;

export function isPublicEntry(entry: PublishEntry) {
  return entry.data.visibility === 'public' && !entry.data.draft;
}

export function byDateDesc(a: PublishEntry, b: PublishEntry) {
  return Number(b.data.date ?? 0) - Number(a.data.date ?? 0);
}

export function formatDate(date?: Date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function entryHref(entry: PublishEntry) {
  return `/${entry.collection}/${entrySlug(entry)}/`;
}

export function entrySlug(entry: PublishEntry) {
  return entry.data.slug ?? entry.id;
}

export function collectTags(entries: PublishEntry[]) {
  return [...new Set(entries.flatMap((entry) => entry.data.tags))].sort((a, b) => a.localeCompare(b));
}

export function relatedEntries(current: PublishEntry, entries: PublishEntry[], limit = 4) {
  const currentTags = new Set(current.data.tags);
  const relatedIds = new Set(current.data.related);

  return entries
    .filter((entry) => entry.id !== current.id)
    .map((entry) => {
      const sharedTags = entry.data.tags.filter((tag) => currentTags.has(tag)).length;
      const explicit = relatedIds.has(entry.id) || relatedIds.has(entry.data.title) ? 4 : 0;
      return { entry, score: sharedTags + explicit };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.entry, b.entry))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function backlinkEntries(current: PublishEntry, entries: PublishEntry[], limit = 8) {
  const targets = [current.id, entrySlug(current), current.data.title, ...current.data.aliases].map(normalizeTarget);

  return entries
    .filter((entry) => entry.id !== current.id)
    .filter((entry) => targets.some((target) => hasWikiLink(entry.body ?? '', target)))
    .slice(0, limit);
}

function hasWikiLink(body: string, target: string) {
  const pattern = /\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = pattern.exec(body)) !== null) {
    const linkTarget = normalizeTarget(match[1].split('|')[0]);
    if (linkTarget === target) return true;
  }

  return false;
}

function normalizeTarget(value: string) {
  return value
    .split('#')[0]
    .replace(/\.(md|mdx)$/i, '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{Letter}\p{Number}/ _-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\/+|\/+$/g, '');
}
