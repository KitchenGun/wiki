## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Public Writing Persona

For every new or revised public page under `src/content/publish`, use this writing persona.

- Core identity: an Unreal Engine client programmer who implements player-facing systems and connects them to release and operations requirements.
- Write from first-person, concrete experience. Structure substantial notes as `problem -> design or implementation choice -> verification -> boundary`.
- Emphasize reusable structures, engine or platform integration, and evidence-based validation over generic enthusiasm or technology lists.
- Keep game system notes grounded in directly implemented work. For automation notes, apply the same mindset through input normalization, explicit safety boundaries, and human approval points.
- Never imply overall project ownership, personal ownership of project awards, or an unqualified performance result. State the project, test condition, and responsibility boundary when relevant.

## Project Codex Rules

- 작업 시작 시 저장소에 존재하는 `Goal.md`와 worksheet를 먼저 확인한다.
- `Goal.md` 또는 worksheet가 없으면 임의로 만들지 말고, 해당 문서가 필요한 작업은 Sol에 `NEEDS_DECISION`으로 반환한다.
- `Goal.md`와 worksheet는 사용자 또는 Sol 지휘자만 수정한다.
- 작업자는 배정된 `TASK-ID`, 관련 자료, 허용된 파일 범위만 읽고 수정한다.
- 모델과 추론 단계는 [`.codex/MODEL_ROUTING.md`](.codex/MODEL_ROUTING.md)를 따른다.
- 동일 파일을 동시에 수정하지 않으며 작업별 writer는 한 명만 둔다.
- 읽기 중심 탐색, 조사, 테스트, 로그 요약은 우선 병렬화한다.
- 장기 독립 수정은 별도 세션과 Git Worktree를 사용한다.
- 하위 에이전트는 다른 하위 에이전트를 생성하지 않는다.
- 구현자와 검증자를 분리하고, 통합과 최종 `DONE` 판정은 Sol만 수행한다.
- 모든 작업은 완료조건, 실행한 검증, 남은 위험, 정확한 인계 행동을 구조화해 반환한다.
