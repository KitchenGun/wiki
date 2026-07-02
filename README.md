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
status: evergreen
source_type: compiled
source_url: ""
captured_at: 2026-04-29
decision_summary: Why this note matters later
next_actions: []
slug: stable-url-slug
```

빌드/목록/graph-data 대상은 `draft: false`, `visibility: public`뿐이다. 비공개 Vault, private, internal, drafts 폴더는 repo에 넣지 않는다.

## LLM Wiki Memory

이 repo는 private Obsidian vault가 아니라 공개 compiled layer다. 원자료, 작업 로그, 개인 정보, 회사 내부 정보는 repo 밖 private vault에 둔다. 공개 가능한 판단 요약과 연결 정보만 `src/content/publish`에 복사한다.

```text
Private Obsidian vault
  -> compiled public note
  -> src/content/publish
  -> public/graph-data.json
  -> graphify-out
```

공개 전 검사:

```bash
npm run memory:normalize
npm run content:check
```

`content:check`는 공개 콘텐츠의 이메일, 전화번호, 로컬 사용자 경로, API token, Google 문서 ID URL 같은 민감 패턴과 LLM 회수용 frontmatter 누락을 차단한다.

## Wikilink

`[[input-buffering]]`, `[[input-buffering|Input Buffering]]` 형식을 `/wiki/input-buffering/` 링크로 변환한다.

## Graph Data

```bash
npm run graph
```

`public/graph-data.json`을 생성한다. 현재는 노드/링크만 준비하고 Graphify/LLM UI는 구현하지 않는다.

Graphify 기반 에이전트 회수 그래프 갱신:

```bash
npm run graphify:update
```

## 배포

`.github/workflows/deploy.yml`은 Astro 공식 GitHub Pages Action을 사용한다. GitHub repo Settings → Pages → Source를 `GitHub Actions`로 설정한다.
