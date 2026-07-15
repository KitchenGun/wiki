---
title: Obsidian Publication Workflow
description: How to write private-first Obsidian notes and publish only safe public notes.
date: 2026-04-29
tags: [obsidian, workflow, publishing]
draft: false
visibility: public
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-04-29"
owner: "kang"
decision_summary: "How to write private-first Obsidian notes and publish only safe public notes."
next_actions: []
---

I use Obsidian as the private source of thought, then publish only deliberate public notes. This workflow lets me retain the problem, implementation decision, and verification record while keeping company and personal context out of the public portfolio.

This repository is the public compiled layer, not the private vault. The full memory architecture is described in [[llm-wiki-memory-architecture]].

Recommended folders:

- `00-inbox`: rough captures
- `10-projects`: project logs and implementation notes
- `20-wiki`: durable technical notes
- `30-moc`: map-of-content entry points for durable topics
- `80-compiled`: notes that are ready to become public knowledge
- `90-private`: personal or company-sensitive notes
- `publish`: notes copied into the Astro site

Publication rule:

```yaml
draft: false
visibility: public
status: evergreen
source_type: compiled
source_url: ""
captured_at: 2026-07-02
decision_summary: Why this note matters later
next_actions: []
```

Never publish notes with company secrets, unreleased assets, personal data, private repo details, salary, address, or phone numbers.

Before build or deployment, run:

```bash
npm run content:check
npm run graph
```

Use `npm run memory:normalize` when a copied note is missing the LLM retrieval fields.

Good public note types:

- Unreal Engine system notes
- bug postmortems with sensitive details removed
- tool architecture notes
- learning notes from public sources
- shipped project retrospectives

Use `[[wikilink]]` for concepts that should become wiki pages, such as [[unreal-client-programming]] or [[unreal-mcp]].
