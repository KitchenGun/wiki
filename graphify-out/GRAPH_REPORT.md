# Graph Report - Wiki  (2026-06-26)

## Corpus Check
- 33 files · ~40,532 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 116 nodes · 106 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2f9e3f62`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

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
- `Unreal MCP` --conceptually_related_to--> `AI 로직, Animation, 인게임 콘텐츠 구현`  [INFERRED]
  src/data/projects.ts → src/content/publish/pages/about.md
- `골목길: 귀흔` --won_award--> `2025 스토브인디 어워즈 Top 10`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/cv.md
- `Forbidden Art / 금지된 예술` --won_award--> `2024 하반기 이달의 우수게임`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/cv.md
- `Forbidden Art / 금지된 예술` --uses_skill--> `Steam 도전 과제와 Depot 빌드 업로드`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/about.md

## Communities (29 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (21): 2024 하반기 이달의 우수게임, 2025 스토브인디 어워즈 Top 10, YouTube @kangkeon4500, 우송대학교 게임멀티미디어공학과, 인적사항, 학력사항, 경력사항, 개인 프로젝트 (+13 more)

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
Cohesion: 0.25
Nodes (7): existingIds, graph, index, next, semanticIds, semantics, validIds

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (7): 적용 목표, 설정, 실제 해결 작업, 의미, 공개 기준, Claude에서 확인한 공식 Toolset, code:text (BeginPlay())

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (6): 목표, 사용자 흐름, 구현 구조, 개인화 기준, 안전장치, 포트폴리오 기준 의미

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (5): 사용자 흐름, 구현 구조, 데이터 기반 루틴 생성, 안전장치, 포트폴리오 기준 의미

### Community 8 - "Community 8"
Cohesion: 0.4
Nodes (5): projects, DX2D-METALSLUG, hermes-hybrid, Unreal MCP, DirectX와 Unity 게임 제작 경험

## Knowledge Gaps
- **45 isolated node(s):** `graph`, `semantics`, `existingIds`, `semanticIds`, `next` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `강건 (Keon Kang)` connect `Community 0` to `Community 8`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `골목길: 귀흔` connect `Community 0` to `Community 8`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `Forbidden Art / 금지된 예술` connect `Community 0` to `Community 8`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `graph`, `semantics`, `existingIds` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._