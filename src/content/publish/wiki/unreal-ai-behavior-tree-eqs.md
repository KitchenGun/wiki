---
title: Unreal AI Behavior Tree and EQS
description: Behavior Tree, Blackboard, AI Perception, EQS를 활용한 Unreal AI 구현 노트.
date: 2026-04-29
tags: [unreal, ai, gameplay]
draft: false
visibility: public
aliases: [behavior tree, eqs, unreal ai]
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-04-29"
owner: "kang"
decision_summary: "Behavior Tree, Blackboard, AI Perception, EQS를 활용한 Unreal AI 구현 노트."
next_actions: []
---

Unreal AI 구현 경험은 Behavior Tree, Blackboard, AI Perception, EQS를 중심으로 정리한다.

경력기술서에서 공개 가능한 범위:

- AI Behavior Tree 기반 행동 분기
- Blackboard를 통한 상태 공유
- AI Perception으로 감지 이벤트 처리
- EQS로 위치/대상 후보 평가
- Anim Notify를 통해 특정 동작 타이밍을 AI 이벤트로 전달
- Animation Blueprint로 비정상적 움직임 연출

AI는 단순 추적보다 상태 전환과 연출 타이밍이 중요하다. UI/옵션과 달리 플레이어가 의도를 바로 읽기 어렵기 때문에 디버깅 가능한 구조가 필요하다.

포트폴리오 추가 정리:

- Hide & Seek 구조처럼 플레이어가 숨고 추적당하는 AI 구현
- 물리 시뮬레이션 결과가 AI Behavior Tree에 영향을 주도록 연결
- 소음을 줄이도록 플레이어를 유도하는 공포 UX 설계
- Timer 기반 수동 감지의 연산 부담을 확인하고 Sense 교체 방식으로 시야각 런타임 변경 해결
- EQS를 사용해 수색 시 부자연스럽게 왕복하는 현상 완화

관련 노트: [[unreal-client-programming]]
