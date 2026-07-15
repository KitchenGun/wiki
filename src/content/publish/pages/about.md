---
title: About
description: 강건 소개.
eyebrow: About
heading: 강건 / KitchenGun
imageAlt: 강건 프로필 사진
draft: false
visibility: public
tags: []
aliases: []
related: []
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-07-02"
owner: "kang"
decision_summary: "강건 소개."
next_actions: []
---

저는 Unreal Engine 중심의 클라이언트 프로그래머입니다. 플레이어가 직접 만지는 AI, UI, 옵션, 인벤토리와 콘텐츠 시스템을 구현하고, 현지화·Steamworks·빌드 운영처럼 출시 단계에서 필요한 조건까지 연결해 왔습니다. AIXLAB에서 호러 어드벤처 **골목길: 귀흔**과 **금지된 예술**의 초기 개발부터 출시와 운영에 참여했습니다. 두 작품은 각각 2025 스토브인디 어워즈 Top 10, 2024년 하반기 이달의 우수게임에 선정된 프로젝트입니다.

작업에서는 기능을 나열하기보다 플레이어 경험과 기술 제약을 먼저 분리합니다. Common UI에서는 입력 장치 전환 중 포커스를 유지하는 레이어 구조를, 옵션에서는 저장·적용 시점·지원 장치를 분리한 Custom GameUserSettings 확장을, AI에서는 상태 전환과 디버깅이 가능한 Behavior Tree·Blackboard·AI Perception·EQS 구성을 선택했습니다. RTX 2080 Ti, 4K 포트폴리오 테스트에서는 DLSS/FSR 적용 전후 평균 45fps와 75fps를 확인했습니다.

업무 밖에서는 같은 기준으로 Unreal Editor 작업과 AI 도구를 연결합니다. Unreal MCP와 Discord bot을 통해 자연어 요청을 에디터 작업으로 변환하고, Claude Code와 GitHub Copilot을 코드 검토와 작업 흐름에 적용해 보았습니다. 이 Wiki는 구현한 범위와 검증 조건을 분명히 남기기 위한 공개 기술 기록입니다.
