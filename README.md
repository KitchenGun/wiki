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

## Weekly Profile Update

`weekly-profile-update/`는 Wiki/GitHub 활동을 LinkedIn, Facebook Page, Instagram, X 수동 게시 준비물로 변환하는 승인 기반 Job Registry 산출물이다. 현재 자동 게시 API는 비활성화되어 있으며 모든 플랫폼의 `publish_enabled`는 `false`로 유지한다.

주요 명령 흐름:

```text
/weekly-profile preview target:x
/weekly-profile approve publish target:x
/weekly-profile approve publish target:all
/weekly-profile assets
```

Discord 첨부 이미지는 원본 URL/token을 저장하지 않고, 승인된 첨부만 `weekly-profile-update/assets/cache/`에 attachment id 기반 안전한 파일명으로 캐시하는 구조를 사용한다. `publishing/publish-plan.md`와 `publishing/publish-results.md`는 dry-run/manual-ready 상태만 기록한다.

## Weekly Profile Update Job Registry

`weekly-profile-update/`는 주간 SNS 업로드 승인 파이프라인의 운영 상태를 보관한다. 현재 대상 플랫폼은 LinkedIn, Facebook Page, Instagram, X이며, 모든 플랫폼의 `publish_enabled`는 `false`로 유지한다.

- Discord 명령 preview/approve publish는 X를 포함한다.
- 승인된 Discord 첨부 이미지는 `weekly-profile-update/assets/cache/`에 attachment id 기반 안전 파일명으로 캐시할 수 있다.
- `publishing/publish-plan.md`와 `publishing/publish-results.md`는 dry-run/manual-ready 문서만 생성하며 실제 SNS API는 호출하지 않는다.
