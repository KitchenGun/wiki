---
title: Common UI Workflow
description: Unreal Common UI 기반 포커스, 레이어, 액션 바 UI 구현 노트.
date: 2026-04-29
tags: [unreal, ui, common-ui]
draft: false
visibility: public
aliases: [common ui]
---

Common UI는 컨트롤러/키보드/마우스 입력을 함께 고려하는 UI 구조에 적합하다.

경력기술서 기준 경험:

- Common UI Plugin 도입
- Action Bar 기반 Hot Key 기능
- Widget 레이어 관리
- 포커스 유실을 줄이는 UI 흐름 설계
- Widget Animation을 통한 정보 전달

UI 구현에서 중요한 것은 화면을 만드는 것보다 입력 흐름과 포커스 상태를 잃지 않는 것이다.

관련 노트: [[unreal-client-programming]], [[game-options-localization]]
