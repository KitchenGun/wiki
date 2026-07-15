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
