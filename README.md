# Personal Wiki

Astro 기반 개인 위키/블로그. Obsidian 공개 Markdown/MDX만 정적 사이트로 빌드한다.

## 사용

```bash
npm install
npm run dev
npm run build
```

GitHub Actions에서는 repo명을 자동으로 `base` 경로에 쓴다. 로컬 기본값은 `/wiki`다.

```bash
PUBLIC_SITE_URL=https://USER.github.io
PUBLIC_BASE_PATH=/REPO
```

## 콘텐츠

공개 콘텐츠만 여기에 둔다.

```text
src/content/publish/blog
src/content/publish/wiki
```

지원 frontmatter:

```yaml
title: Note title
description: Short summary
date: 2026-04-29
tags: [tag]
draft: false
visibility: public
slug: stable-url-slug
```

빌드/목록/graph-data 대상은 `draft: false`, `visibility: public`뿐이다. 비공개 Vault, private, internal, drafts 폴더는 repo에 넣지 않는다.

## Wikilink

`[[input-buffering]]`, `[[input-buffering|Input Buffering]]` 형식을 `/wiki/input-buffering/` 링크로 변환한다.

## Graph Data

```bash
npm run graph
```

`public/graph-data.json`을 생성한다. 현재는 노드/링크만 준비하고 Graphify/LLM UI는 구현하지 않는다.

## 배포

`.github/workflows/deploy.yml`은 Astro 공식 GitHub Pages Action을 사용한다. GitHub repo Settings → Pages → Source를 `GitHub Actions`로 설정한다.
