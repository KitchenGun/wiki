---
title: Engineering Persona
description: 플레이어가 직접 만지는 시스템을 출시와 운영 조건까지 연결하는 Unreal 클라이언트 프로그래머의 작업 기준.
date: 2026-07-15
tags: [unreal, client, portfolio, engineering]
draft: false
visibility: public
aliases: [writing-persona, engineering-principles]
related: [unreal-client-programming, game-options-localization, unreal-mcp]
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-07-15"
owner: "kang"
decision_summary: "공개 Wiki의 모든 글을 실제 구현 경험, 검증 조건, 책임 범위가 드러나는 작업 관점으로 작성한다."
next_actions: []
---

저는 플레이어가 직접 만지는 게임 시스템을 Unreal Engine으로 구현하고, 출시와 운영에 필요한 조건까지 연결하는 클라이언트 프로그래머다. AI, UI, 인벤토리, 옵션, 현지화, 사운드·연출을 각각의 기능으로 보지 않고 하나의 플레이 흐름에서 검증한다.

## 작업 방식

- 요구를 기능 목록으로 받더라도, 먼저 플레이어가 무엇을 보고 입력하며 어떤 상태 변화를 겪는지 나눈다.
- 반복되는 문제는 컴포넌트·인터페이스·DataTable·String Table처럼 재사용 가능한 구조로 정리한다.
- 엔진 기능을 그대로 붙이는 데서 멈추지 않고, 저장·입력 전환·지원 장치·배포 같은 실제 사용 조건까지 통합한다.
- 로그, 테스트, 프로파일링, 플랫폼 검증으로 확인 가능한 결과만 남긴다.

## 근거가 된 경험

AIXLAB에서 **금지된 예술**과 **골목길: 귀흔**의 초기 개발부터 출시와 운영에 참여했다. 이 과정에서 Behavior Tree·Blackboard·AI Perception·EQS, Common UI, Custom GameUserSettings, DLSS/FSR, 인벤토리, 현지화, MetaSound, Sequencer, Steam 도전과제와 Depot을 구현하거나 통합했다. Ribbon Games에서는 Data Asset과 DataTable 기반 인벤토리 데이터 구조와 UI를 구현했다.

개인 R&D에서도 같은 기준을 사용한다. Unreal MCP와 Hermes 기반 도구는 자연어 요청을 무단 실행하는 자동화가 아니라, 작업 대상·입력·검증·승인 경계를 분명히 한 개발 보조 도구로 기록한다.

## 이 Wiki의 작성 원칙

각 글은 가능하면 `문제 -> 선택한 구조 -> 구현 또는 통합 -> 검증 범위 -> 한계` 순서로 쓴다. 프로젝트 수상은 개인 수상이 아니라 참여 프로젝트의 이력으로 표기한다. 성능 수치는 테스트 장비와 조건을 함께 적고, 확인하지 못한 결과는 단정하지 않는다.

관련 노트: [[unreal-client-programming]], [[common-ui-workflow]], [[game-options-localization]], [[unreal-mcp]]
