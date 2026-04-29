---
title: Obsidian Publication Workflow
description: How to write private-first Obsidian notes and publish only safe public notes.
date: 2026-04-29
tags: [obsidian, workflow, publishing]
draft: false
visibility: public
---

Use Obsidian as the private source of thought, then publish only deliberate public notes.

Recommended folders:

- `00-inbox`: rough captures
- `10-projects`: project logs and implementation notes
- `20-wiki`: durable technical notes
- `90-private`: personal or company-sensitive notes
- `publish`: notes copied into the Astro site

Publication rule:

```yaml
draft: false
visibility: public
```

Never publish notes with company secrets, unreleased assets, personal data, private repo details, salary, address, or phone numbers.

Good public note types:

- Unreal Engine system notes
- bug postmortems with sensitive details removed
- tool architecture notes
- learning notes from public sources
- shipped project retrospectives

Use `[[wikilink]]` for concepts that should become wiki pages, such as [[combat-feel]] or [[input-buffering]].
