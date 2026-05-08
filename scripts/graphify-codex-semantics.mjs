import fs from 'node:fs';

const graphPath = 'graphify-out/graph.json';
const semanticsPath = 'graphify-out/codex-semantics.json';

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const semantics = JSON.parse(fs.readFileSync(semanticsPath, 'utf8'));

const existingIds = new Set(graph.nodes.map((node) => node.id));
const semanticIds = new Set(semantics.nodes.map((node) => node.id));

graph.nodes = graph.nodes.filter((node) => node.semantic_provider !== 'codex' || semanticIds.has(node.id));
graph.links = graph.links.filter((link) => link.semantic_provider !== 'codex');

for (const node of semantics.nodes) {
  const next = {
    ...node,
    semantic_provider: 'codex',
    norm_label: node.label.toLocaleLowerCase('ko-KR'),
  };
  const index = graph.nodes.findIndex((existing) => existing.id === node.id);
  if (index >= 0) {
    graph.nodes[index] = { ...graph.nodes[index], ...next };
  } else {
    graph.nodes.push(next);
    existingIds.add(node.id);
  }
}

const validIds = new Set(graph.nodes.map((node) => node.id));
for (const link of semantics.links) {
  if (!validIds.has(link.source) || !validIds.has(link.target)) {
    throw new Error(`Unknown semantic edge endpoint: ${link.source} -> ${link.target}`);
  }
  graph.links.push({ ...link, semantic_provider: 'codex' });
}

fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
console.log(`Applied Codex semantics: ${semantics.nodes.length} nodes, ${semantics.links.length} links`);
