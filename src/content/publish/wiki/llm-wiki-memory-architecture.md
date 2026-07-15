---
title: LLM Wiki Memory Architecture
description: Private Obsidian, public Astro wiki, graph data, and graphify roles for long-term AI memory.
date: 2026-07-02
tags: [obsidian, llm-wiki, memory, graphify]
draft: false
visibility: public
status: evergreen
source_type: compiled
source_url: https://wikidocs.net/346129
captured_at: 2026-07-02
owner: kang
decision_summary: Private notes stay outside the repository; only sanitized compiled notes enter the public wiki and graph layers.
next_actions: []
aliases: [llm-wiki, memory-architecture, obsidian-llm-wiki]
related: [obsidian-publication-workflow, personal-hermes-agent]
slug: llm-wiki-memory-architecture
---

I operate this wiki as the public compiled layer of a longer memory system. I keep raw notes, private project records, and public technical conclusions separate so that published writing remains useful without exposing private context.

The private layer is an Obsidian vault outside this repository. It can contain inbox notes, raw logs, project records, source links, decisions, and next actions. The public layer is `src/content/publish`, which contains only sanitized notes that can be built into this Astro site.

## Layer roles

| Layer | Role | Stored here |
|---|---|---|
| Private Obsidian vault | Long-term raw and compiled memory | outside this repository |
| Shared handoff memory | Current task packages and temporary coordination | outside public content |
| Public Astro wiki | Sanitized compiled knowledge | `src/content/publish` |
| `graph-data.json` | Public wikilink graph for site features | `public/graph-data.json` |
| graphify | Agent-oriented retrieval graph | `graphify-out` |

## Public note contract

Every public note carries enough metadata for later retrieval:

```yaml
status: evergreen
source_type: compiled
source_url: ""
captured_at: 2026-07-02
decision_summary: Why this note matters later
next_actions: []
```

Raw logs, private file paths, personal contact details, company secrets, unreleased assets, tokens, OAuth values, spreadsheet IDs, and Discord channel/thread IDs must not enter `src/content/publish`.

## Operating loop

1. Capture rough notes in the private vault.
2. Promote durable knowledge into a compiled note.
3. Remove private values and source-specific details.
4. Copy only the public version into `src/content/publish`.
5. Run `npm run content:check`.
6. Run `npm run graph` for the public wikilink graph.
7. Run `npm run graphify:update` after code or content changes when the agent graph needs to stay current.

This makes [[obsidian-publication-workflow]] the publishing gate and prevents [[personal-hermes-agent]] from treating the public site as a raw memory dump. The same boundary lets this Wiki document implementation decisions with enough context to review them later.
