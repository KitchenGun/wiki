# Hermes Goal: weekly-profile-update

## Goal

매주 Wiki와 GitHub 활동을 수집해 LinkedIn, Facebook Page, Instagram, X 게시물 초안을 만들고, Discord 채널에서 사용자 승인 후 게시한다.

관리 Discord 채널: `1504020211194662994`

핵심 원칙:
- 게시 전 Discord 승인 필수
- 사용자가 Discord에 업로드하고 승인한 이미지만 사용
- 에이전트가 이미지를 직접 고르지 않음
- 비공개/민감 정보는 제거하거나 `NEEDS_REVIEW`로 분리
- 토큰/시크릿은 저장소에 저장 금지

## MVP Scope

1차 구현은 자동 게시보다 안전한 초안/승인 파이프라인을 우선한다.

1. 주간 작업 시작 알림
2. Wiki 변경 수집
3. GitHub 최근 7일 활동 수집
4. 공개 가능 요약 생성
5. 플랫폼별 게시물 초안 생성
6. 필요한 이미지 목록 요청
7. Discord에서 초안/이미지 검토
8. 최종 승인 상태 기록
9. 수동 게시 fallback 문서 생성

자동 게시는 2차 구현:
- LinkedIn
- Facebook Page
- Instagram feed
- X
- X

Instagram Story 자동 게시는 API 제약 확인 후 별도 구현한다.

## Workflow

```text
weekly-profile-update
├── 01_start_weekly_job
├── 02_collect_wiki_changes
├── 03_collect_github_activity
├── 04_summarize_weekly_work
├── 05_extract_public_claims
├── 06_generate_posts
├── 07_request_user_images
├── 08_user_review
├── 09_user_approve_publish
└── 10_publish_posts
```

## Required Behavior

### 01_start_weekly_job

- 매주 지정된 요일/시간에 시작
- Discord 채널 `1504020211194662994`에 시작 알림 전송
- 사용자가 승인해야 다음 단계 진행

### 02_collect_wiki_changes

- `ssh hermes-pc-wsl` 사용
- Windows `E:\Wiki`를 WSL `/mnt/e/Wiki`로 접근
- 최근 변경된 공개 후보 수집
- 민감 정보는 제외하거나 `NEEDS_REVIEW` 표시

### 03_collect_github_activity

- 최근 7일 활동 수집
- 커밋, PR, 이슈, 릴리스, README/docs 변경 포함
- 활동 로그가 아니라 게시물에 쓸 수 있는 작업 요약으로 변환

### 04_summarize_weekly_work

- Wiki와 GitHub 내용을 합쳐 이번 주 작업 요약 생성
- “무엇을 만들었고 어떤 의미가 있는지” 중심으로 작성

### 05_extract_public_claims

- 공개 가능 문구와 검토 필요 문구 분리
- 과장 표현, 고객사명, 내부 구현 세부사항, 서버/IP/토큰/계정 정보 제거

### 06_generate_posts

- LinkedIn: 전문적, 기술/문제해결/성과 중심
- Facebook Page: 짧고 자연스러운 근황 공유
- Instagram feed: 짧은 캡션, 해시태그 포함
- X: 짧은 작업 요약과 핵심 메시지 중심
- Instagram story: 수동 게시용 짧은 문구 우선

### 07_request_user_images

- 필요한 이미지 종류만 요청
- 이미지는 사용자가 Discord에 업로드해야 함
- 승인된 이미지 ID/파일명만 기록

요청 예시:

```text
필요한 이미지:
- LinkedIn 대표 프로젝트 스크린샷 1장
- Facebook Page 이미지 1장
- Instagram feed 정사각형/세로 이미지 1~3장
- Instagram Story 세로 이미지 1장
```

### 08_user_review

Discord 명령:

```text
/weekly-profile status
/weekly-profile approve draft
/weekly-profile reject draft
/weekly-profile rerun github
/weekly-profile rerun linkedin
/weekly-profile rerun facebook
/weekly-profile rerun instagram
/weekly-profile preview target:x
/weekly-profile rerun x
/weekly-profile assets
/weekly-profile approve assets
/weekly-profile pause
/weekly-profile resume
```

### 09_user_approve_publish

게시 직전 최종 승인 필수.

```text
/weekly-profile approve publish linkedin
/weekly-profile approve publish facebook
/weekly-profile approve publish instagram
/weekly-profile approve publish x
/weekly-profile approve publish all
```

### 10_publish_posts

- 승인된 플랫폼만 게시
- 실패 시 Discord에 오류 보고
- 성공 시 게시 URL 저장
- MVP에서는 수동 게시 checklist 생성까지 허용

## Output Structure

```text
weekly-profile-update/
├── GOAL.md
├── 00_state.yaml
├── profile-update/
│   ├── source-evidence.md
│   ├── public-claims.md
│   ├── needs-review.md
│   └── asset-requests.md
├── github-summary/
│   ├── commits.md
│   ├── pull-requests.md
│   ├── issues.md
│   ├── repositories.md
│   ├── weekly-summary.md
│   └── public-post-candidates.md
├── posts/
│   ├── linkedin.md
│   ├── facebook.md
│   ├── instagram-feed.md
│   ├── instagram-story.md
│   ├── x.md
│   └── hashtags.md
├── assets/
│   ├── requested-assets.md
│   ├── submitted-assets.md
│   ├── approved-assets.md
│   └── cache/
├── publishing/
│   ├── publish-plan.md
│   ├── publish-results.md
│   └── failed-publishes.md
└── checklists/
    ├── review-checklist.md
    └── fallback-manual-posting.md
```

## Initial State File

Create `00_state.yaml`:

```yaml
job_id: weekly_profile_update
schedule: weekly
control_channel_id: "1504020211194662994"
status: waiting_for_user
current_step: start_weekly_job

sources:
  wiki_path: "/mnt/e/Wiki"
  github_window_days: 7

platforms:
  linkedin:
    enabled: true
    publish_enabled: false
  facebook:
    enabled: true
    publish_enabled: false
    target: page
  instagram:
    enabled: true
    publish_enabled: false
    account_type_required: business_or_creator
  x:
    enabled: true
    publish_enabled: false
    target: profile

image_policy:
  agent_selects_images: false
  user_upload_required: true
  require_user_approval: true

publish_policy:
  require_final_approval: true
  allow_platform_partial_publish: true
```

## Required User Inputs

Ask only for missing values.

- GitHub username
- GitHub repo list
- public/private repo scope
- Discord bot token
- LinkedIn target: member or organization page
- Facebook Page ID
- Instagram account type: Business/Creator 여부
- public-ban keywords/projects
- weekly schedule day/time

## Security Rules

- Never commit tokens, app secrets, OAuth refresh tokens, or cookies
- Store secrets in env/secret manager only
- Log secret presence only, never secret value
- Require Discord user allowlist for approval commands
- Prevent duplicate publish with job lock and published URL history

## Acceptance Criteria

- `00_state.yaml` exists and tracks step/status
- Draft posts are generated for all enabled platforms
- `public-claims.md` and `needs-review.md` are separated
- Asset request is generated without agent-selected images
- Discord approval is required before publish status changes
- Manual posting fallback exists before any API auto-publish work


## Current Safety Notes

- LinkedIn/Facebook/Instagram/X `publish_enabled=false` 유지.
- X API 실제 연동은 다음 단계로 미룬다.
- Discord 첨부 원본 URL/token은 state와 Markdown에 저장하지 않고, 승인된 첨부만 `assets/cache/`에 attachment id 기반 파일명으로 저장한다.
