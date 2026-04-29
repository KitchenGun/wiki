import { wikiHref } from './wiki-links.mjs';

export default function remarkWikiLinks(options = {}) {
  const basePath = options.basePath ?? '/';

  return (tree) => {
    walk(tree, (node, parent, index) => {
      if (node.type !== 'text' || !node.value.includes('[[')) return;

      const next = splitWikiText(node.value, basePath);
      if (next.length > 1) {
        parent.children.splice(index, 1, ...next);
      }
    });
  };
}

function walk(node, visitor, parent = null) {
  if (!node || !Array.isArray(node.children)) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    visitor(child, node, index);
    walk(child, visitor, node);
  }
}

function splitWikiText(value, basePath) {
  const nodes = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
    }

    const [target, alias] = match[1].split('|').map((part) => part.trim());
    nodes.push({
      type: 'link',
      url: wikiHref(target, basePath),
      title: null,
      children: [{ type: 'text', value: alias || target }],
    });

    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) });
  }

  return nodes;
}
