---
title: Inventory System
description: Unreal 기반 인벤토리, DataTable, 3D 아이템 조사 기능 구현 노트.
date: 2026-04-29
tags: [unreal, inventory, ui]
draft: false
visibility: public
aliases: [inventory]
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-04-29"
owner: "kang"
decision_summary: "Unreal 기반 인벤토리, DataTable, 3D 아이템 조사 기능 구현 노트."
next_actions: []
---

인벤토리는 UI, 데이터, 연출, 입력이 함께 묶이는 클라이언트 시스템이다.

포트폴리오 기준 경험:

- Grid Panel 기반 인벤토리 UI 레이아웃
- GI Subsystem과 DataTable로 아이템 정보 관리
- 360도로 돌려보는 3D 아이템 조사 기능
- 관성 물리 효과를 포함한 아이템 조작감 구현
- 일시정지 상태에서도 보이스와 자막이 구동되는 로직
- 아이템 추가 시 코드 수정 없이 DataTable 추가로 대응 가능한 구조

인벤토리는 단순 목록 UI가 아니라 스토리 전달 장치가 될 수 있다. 특히 공포 게임에서는 조사 중 연출이 끊기지 않는 구조가 중요하다.

관련 노트: [[common-ui-workflow]], [[unreal-client-programming]]
