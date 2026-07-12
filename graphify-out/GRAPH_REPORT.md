# Graph Report - Wiki  (2026-07-12)

## Corpus Check
- 47 files · ~89,833 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 404 nodes · 479 edges · 40 communities (38 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23a06aca`
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `강건 (Keon Kang)` - 15 edges
2. `inspectLinkedAssets()` - 10 edges
3. `runCapture()` - 9 edges
4. `toRelativePortable()` - 8 edges
5. `Personal Wiki` - 8 edges
6. `git()` - 7 edges
7. `scanText()` - 7 edges
8. `parseArgs()` - 6 edges
9. `slugify()` - 6 edges
10. `골목길: 귀흔` - 6 edges

## Surprising Connections (you probably didn't know these)
- `골목길: 귀흔` --uses_skill--> `Common UI Plugin 기반 레이어 Widget 설계`  [INFERRED]
  src/data/projects.ts → src/content/publish/pages/about.md
- `골목길: 귀흔` --won_award--> `2025 스토브인디 어워즈 Top 10`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/cv.md
- `Forbidden Art / 금지된 예술` --won_award--> `2024 하반기 이달의 우수게임`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/cv.md
- `Forbidden Art / 금지된 예술` --uses_skill--> `Steam 도전 과제와 Depot 빌드 업로드`  [EXTRACTED]
  src/data/projects.ts → src/content/publish/pages/about.md
- `Unreal MCP` --conceptually_related_to--> `AI 로직, Animation, 인게임 콘텐츠 구현`  [INFERRED]
  src/data/projects.ts → src/content/publish/pages/about.md

## Communities (40 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (49): args, askpassPath, clipDiscordMessage(), cloneDepth, cloneFilter, clonePath, cloneProtocol, commitCount (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (39): allCommits, args, blockers, candidate, candidatePath, candidateRoot, changedFiles, commitRange (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (26): args, blockers, candidatePath, gitDirtyFor(), parsed, publicData, publicNote, root (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (27): 2024 하반기 이달의 우수게임, 2025 스토브인디 어워즈 Top 10, YouTube @kangkeon4500, projects, 우송대학교 게임멀티미디어공학과, 학력사항, 학력사항, 경력사항 (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (25): argv, blockedPatterns, failures, parsed, publishRoot, relative, requiredMemoryFields, root (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (15): splitWikiText(), extractWikiLinks(), slugifyAnchor(), slugifyWikiTarget(), wikiHref(), contentRoot, edges, entries (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (18): approvalCandidate, approvalCandidateId, approvedPath, approvedRelative, deniedDecisionPath, fixtureRepo, highRiskPackage, internalOpsRecommendation (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (18): approvedPath, approver, args, body, candidateData, candidateId, candidatePath, data (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (13): printSummary(), approvedMarkers, args, candidatePath(), deniedMarkers, enriched, groups, packageRoot (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (16): 사용, 콘텐츠, 배포, 배포, code:bash (npm install), code:bash (PUBLIC_SITE_URL=https://USER.github.io), code:text (src/content/publish/blog), code:yaml (title: Note title) (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (11): additions, defaults, formatCapturedAt(), formatDate(), match, nextFrontmatter, nextRaw, parsed (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (5): backlinkEntries(), entryHref(), entrySlug(), hasWikiLink(), normalizeTarget()

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (9): Approach, code:text (AI가 게임 파일 변경을 읽는 방식 개선), How It Works, Image Suggestion, Limits, Measured Improvement, Reuse Notes, What Changed (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (7): existingIds, graph, index, next, semanticIds, semantics, validIds

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (7): 적용 목표, 설정, 실제 해결 작업, 의미, 공개 기준, Claude에서 확인한 공식 Toolset, code:text (BeginPlay())

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): recommendationMoc(), renderCompiledNote(), recommendationReasonCodes, summarizeChangedFiles(), summarizeCommitSubjects(), summarizeDiffStats()

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (6): 목표, 사용자 흐름, 구현 구조, 개인화 기준, 안전장치, 포트폴리오 기준 의미

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): blog, collections, pages, publicNoteSchema, wiki

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): 사용자 흐름, 구현 구조, 운영 현황, 판단 경계, 포트폴리오 기준 의미

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (5): 사용자 흐름, 구현 구조, 데이터 기반 루틴 생성, 안전장치, 포트폴리오 기준 의미

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (4): code:yaml (status: evergreen), Layer roles, Operating loop, Public note contract

## Knowledge Gaps
- **224 isolated node(s):** `argv`, `root`, `publishRoot`, `strictMemory`, `root` (+219 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toRelativePortable()` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `parseArgs()` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `recommendMemoryAction()` connect `Community 0` to `Community 1`, `Community 6`, `Community 15`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `argv`, `root`, `publishRoot` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._