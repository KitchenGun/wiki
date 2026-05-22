# Discord Approval Flow

관리 채널: `1504020211194662994`

## Commands

```text
/weekly-profile status
/weekly-profile approve draft
/weekly-profile reject draft
/weekly-profile rerun github
/weekly-profile rerun linkedin
/weekly-profile rerun facebook
/weekly-profile rerun instagram
/weekly-profile assets
/weekly-profile approve assets
/weekly-profile pause
/weekly-profile resume
/weekly-profile approve publish linkedin
/weekly-profile approve publish facebook
/weekly-profile approve publish instagram
/weekly-profile approve publish all
```

## State Transitions

```text
waiting_for_user
-> collecting_sources
-> generating_drafts
-> waiting_for_draft_review
-> waiting_for_assets
-> waiting_for_final_publish_approval
-> ready_for_manual_publish
-> published
```

## Guardrails

- 승인 명령은 allowlist 사용자만 실행한다.
- 승인되지 않은 문구와 이미지는 게시하지 않는다.
- 토큰 값은 로그에 출력하지 않는다.
- 중복 게시 방지를 위해 게시 URL과 job id를 기록한다.

