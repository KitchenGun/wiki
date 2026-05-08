# Graph Report - Wiki  (2026-05-08)

## Corpus Check
- 29 files · ~10,035 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 92 nodes · 86 edges · 25 communities (23 shown, 2 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c90bccec`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `강건 (Keon Kang)` - 15 edges
2. `Personal Wiki` - 6 edges
3. `골목길: 귀흔` - 6 edges
4. `Forbidden Art / 금지된 예술` - 5 edges
5. `wikiHref()` - 4 edges
6. `AIXLAB` - 4 edges
7. `entrySlug()` - 3 edges
8. `slugifyWikiTarget()` - 3 edges
9. `사용` - 3 edges
10. `콘텐츠` - 3 edges

## Surprising Connections (you probably didn't know these)
- `골목길: 귀흔` --uses_skill--> `Common UI Plugin 기반 레이어 Widget 설계`  [INFERRED]
  src/data/projects.ts → src/content/publish/pages/about.md
- `AIXLAB` --shipped_project--> `골목길: 귀흔`  [EXTRACTED]
  src/content/publish/pages/cv.md → src/data/projects.ts
- `골목길: 귀흔` --won_award--> `2025 스토브인디 어워즈 Top 10`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/cv.md
- `골목길: 귀흔` --uses_skill--> `현지화 대시보드`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/about.md
- `Forbidden Art / 금지된 예술` --won_award--> `2024 하반기 이달의 우수게임`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/cv.md

## Communities (25 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (16): 2024 하반기 이달의 우수게임, YouTube @kangkeon4500, 우송대학교 게임멀티미디어공학과, 인적사항, 학력사항, 경력사항, AIXLAB, Ribbon Games (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (11): 사용, 콘텐츠, 배포, code:bash (npm install), code:bash (PUBLIC_SITE_URL=https://USER.github.io), code:text (src/content/publish/blog), code:yaml (title: Note title), code:bash (npm run graph) (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.24
Nodes (5): backlinkEntries(), entryHref(), entrySlug(), hasWikiLink(), normalizeTarget()

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (5): splitWikiText(), extractWikiLinks(), slugifyAnchor(), slugifyWikiTarget(), wikiHref()

### Community 4 - "Community 4"
Cohesion: 0.28
Nodes (8): 2025 스토브인디 어워즈 Top 10, DX2D-METALSLUG, 골목길: 귀흔, hermes-hybrid, Unreal MCP, AI 로직, Animation, 인게임 콘텐츠 구현, Common UI Plugin 기반 레이어 Widget 설계, DirectX와 Unity 게임 제작 경험

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (7): existingIds, graph, index, next, semanticIds, semantics, validIds

## Knowledge Gaps
- **26 isolated node(s):** `graph`, `semantics`, `existingIds`, `semanticIds`, `next` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `강건 (Keon Kang)` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `골목길: 귀흔` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `graph`, `semantics`, `existingIds` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._