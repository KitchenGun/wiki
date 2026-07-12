---
title: Personal Hermes Agent
description: 개인 Hermes Agent 운영 프로필과 Job Registry를 공개 가능한 형태로 정리한 저장소.
date: 2026-05-12
tags: [ai-tools, agent, automation, hermes]
draft: false
visibility: public
aliases: [personal-hermes-agent]
related: [unreal-mcp, hermes-personal-pt, hermes-daily-dev-brief, hermes-game-jobs-pipeline]
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-05-12"
owner: "kang"
decision_summary: "개인 Hermes Agent 운영 프로필과 Job Registry를 공개 가능한 형태로 정리한 저장소."
next_actions: []
---

Personal Hermes Agent는 개인 AI 에이전트 운영 구조를 공개 가능한 형태로 정리한 저장소다.

포트폴리오 기준 의미:

- Memory, Skills, Tools, Gateway, Cron, Delegation, Provider Routing 구조 문서화
- 자연어 요청으로 `jobs/.../*.yaml` Job Registry를 생성·갱신하는 흐름 제시
- 실제 토큰, OAuth, Discord 채널 ID, 개인 메모리, 로그, DB를 제외한 sanitized 예시 구성
- secret scan, example validation, job registry validation 스크립트 포함
- Discord 기반 운동 기록, InBody OCR 기록, 데이터 기반 운동 루틴 초안을 다루는 [[hermes-personal-pt]] 운영 사례
- Hermes Agent로 AI/개발 도구 최신 정보를 수집하고 개발 환경 적용 포인트를 정리하는 [[hermes-daily-dev-brief]] 운영 사례
- 공개 게임 채용 공고를 공개 프로필과 대조해 사람 검토용 후보와 근거를 정리하는 [[hermes-game-jobs-pipeline]] 운영 사례

이 프로젝트는 [[unreal-mcp]]와 함께 AI 도구를 실제 개발 루틴에 연결하려는 개인 R&D 흐름에 속한다.
