---
title: Common UI Workflow
description: Unreal Common UI 기반 포커스, 레이어, 액션 바 UI 구현 노트.
date: 2026-04-29
tags: [unreal, ui, common-ui]
draft: false
visibility: public
aliases: [common ui]
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-04-29"
owner: "kang"
decision_summary: "Unreal Common UI 기반 포커스, 레이어, 액션 바 UI 구현 노트."
next_actions: []
---

Common UI는 컨트롤러/키보드/마우스 입력을 함께 고려하는 UI 구조에 적합하다.

경력기술서 기준 경험:

- Common UI Plugin 도입
- Action Bar 기반 Hot Key 기능
- Widget 레이어 관리
- 포커스 유실을 줄이는 UI 흐름 설계
- Widget Animation을 통한 정보 전달
- 입력 장치 변경을 실시간 감지
- PC/Xbox 등 입력 장치에 맞는 UI 표기 전환

Widget Navigation만으로 복잡한 UI 포커스를 관리하면 포커싱이 끊길 수 있다. 레이어와 Action Bar를 함께 설계하면 UI 제작/수정 시간을 줄이고 입력 장치 전환 UX를 안정화할 수 있다.

관련 노트: [[unreal-client-programming]], [[game-options-localization]]
