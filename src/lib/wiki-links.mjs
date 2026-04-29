export function slugifyWikiTarget(value) {
  return value
    .split('#')[0]
    .replace(/\|.+$/, '')
    .replace(/\.(md|mdx)$/i, '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{Letter}\p{Number}/ _-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\/+|\/+$/g, '');
}

export function slugifyAnchor(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{Letter}\p{Number} _-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function wikiHref(target, basePath = '/') {
  const [page, heading] = target.split('#');
  const base = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  const slug = slugifyWikiTarget(page);
  const hash = heading ? `#${slugifyAnchor(heading)}` : '';
  return `${base}/wiki/${slug}/${hash}`.replace(/\/{2,}/g, '/');
}

export function extractWikiLinks(markdown) {
  const links = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    const [target, alias] = match[1].split('|').map((part) => part.trim());
    links.push({
      target,
      alias: alias || target,
      slug: slugifyWikiTarget(target),
    });
  }

  return links;
}
