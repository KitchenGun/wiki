# Graph Report - Wiki  (2026-05-22)

## Corpus Check
- 78 files · ~5,016,853 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 533 nodes · 749 edges · 72 communities (55 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `98acdd15`
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]

## God Nodes (most connected - your core abstractions)
1. `write_report()` - 32 edges
2. `base_state()` - 19 edges
3. `handle_profile_command()` - 18 edges
4. `강건 (Keon Kang)` - 15 edges
5. `job_dir()` - 13 edges
6. `Required Behavior` - 12 edges
7. `record_submitted_assets()` - 11 edges
8. `Hermes Goal: weekly-profile-update` - 10 edges
9. `process_profile_command()` - 9 edges
10. `write_dry_run_publish_documents()` - 9 edges

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

## Communities (72 total, 17 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (81): _approval_state(), _asset_key(), _asset_mapping_for_platform(), asset_requests(), _assets_message(), _assets_state(), bullet_changes(), cache_discord_asset_bytes() (+73 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (19): existingIds, graph, index, next, semanticIds, semantics, validIds, FakeAttachment (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (28): 1. Intro / Bio 후보, 2. About / Details 소개문, 3. Work / Education 입력용, 4. Featured / Links, 5. 공개 게시글 후보, 6. Facebook에 넣지 않는 것을 권장하는 정보, 후보 A — 가장 짧은 버전, 후보 A — 자연스러운 근황 공유 (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (26): 2024 하반기 이달의 우수게임, 2025 스토브인디 어워즈 Top 10, YouTube @kangkeon4500, projects, 우송대학교 게임멀티미디어공학과, 인적사항, 학력사항, 경력사항 (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (27): 01_start_weekly_job, 02_collect_wiki_changes, 03_collect_github_activity, 04_summarize_weekly_work, 05_extract_public_claims, 06_generate_posts, 07_request_user_images, 08_user_review (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (25): approval_after(), assert_publish_disabled(), base_state(), test_allowlist_can_be_bootstrapped_then_requires_allowed_user(), test_allowlisted_user_can_configure_github_sources(), test_approval_commands_require_allowlisted_user(), test_assets_message_marks_approved_asset_cache_status(), test_process_approve_assets_copies_submitted_assets_to_approved_file() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.2
Nodes (20): _asset_from_attachment(), _build_allowed_mentions(), create_bot(), DiscordProfileDispatchResult, dispatch_profile_command(), _ensure_hermes_agent_import_path(), _gateway_status_module(), _get_hermes_env_value() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): 골목길: 귀흔, 1) 이름 / 공개 표시명, 우송대학교, 2) 헤드라인 후보, 3) About / 소개 섹션, 4) Experience / 경력 섹션 초안, 5) Projects / 프로젝트 섹션 초안, 6) Skills / 기술 스택 후보 (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (17): build_service_path(), generate_service_unit(), generate_timer_unit(), install(), main(), parse_args(), python_executable(), run_systemctl() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (16): build_service_path(), generate_systemd_unit(), install(), main(), parse_args(), python_executable(), restart(), run_systemctl() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (14): 사용, 콘텐츠, 배포, code:bash (npm install), code:bash (PUBLIC_SITE_URL=https://USER.github.io), code:text (src/content/publish/blog), code:yaml (title: Note title), code:bash (npm run graph) (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (14): Body, Body, Body, Body, Current Policy, Facebook, Images, Images (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (12): 1. 업데이트 전 확인, 2. LinkedIn 섹션별 적용 순서, 3. 게시 전 개인정보 점검, 4. 최종 품질 점검, About, Education, Experience, Featured (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (5): backlinkEntries(), entryHref(), entrySlug(), hasWikiLink(), normalizeTarget()

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (5): splitWikiText(), extractWikiLinks(), slugifyAnchor(), slugifyWikiTarget(), wikiHref()

### Community 15 - "Community 15"
Cohesion: 0.2
Nodes (9): 1. 적용 전, 2. Intro / Bio, 3. About / Details, 4. Work, 5. Education, 6. Links / Featured, 7. 게시글, 8. 최종 확인 (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.39
Nodes (5): test_collect_recent_public_changes_filters_by_window(), test_instagram_draft_describes_work_instead_of_listing_paths(), test_sensitive_public_paths_are_marked_for_review(), test_write_report_creates_expected_tree(), write_markdown()

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (6): 검토 결과, 포함한 항목, 수동 확인 권장, 제외한 항목, LinkedIn Draft Privacy Review, Ribbon Games 공개 범위

### Community 18 - "Community 18"
Cohesion: 0.43
Nodes (6): code:text (/weekly-profile status), code:text (waiting_for_user), Commands, Discord Approval Flow, Guardrails, State Transitions

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (5): Evidence Rules, GitHub, Recent Public Wiki Changes, Source Evidence, Wiki

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (5): Facebook, Instagram, LinkedIn, Publish Results, X

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (4): 포함한 공개 정보, 제외한 정보, Facebook 프로필 개인정보 검토, Facebook 적용 주의

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (4): Asset Review, Draft Review, Final Approval, Review Checklist

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (3): Confirmation Record, Discord Status Check, Procedure

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (3): Requested Assets, Requested Assets, Rule

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (3): Assets, Fields, Submitted Assets

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (3): Analyzed Commits, Commits, Local Wiki Git

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (3): Candidate Topics, Commit Evidence, Public Post Candidates

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (3): Commit Evidence, Highlights, Weekly Summary

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (3): Asset Requests, Requested Assets, Rule

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (3): code:bash (python scripts/profile_weekly_scheduler.py install), Unit, Weekly Profile Update Timer

## Knowledge Gaps
- **160 isolated node(s):** `Return the state transition for a Discord /profile command without side effects.`, `graph`, `semantics`, `existingIds`, `semanticIds` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `read_discord_token()` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `load_state()` connect `Community 0` to `Community 6`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `SchedulerError` connect `Community 8` to `Community 6`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `Return the state transition for a Discord /profile command without side effects.`, `graph`, `semantics` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._