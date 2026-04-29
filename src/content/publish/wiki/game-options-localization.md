---
title: Game Options and Localization
description: Unreal 옵션, 업스케일, 사운드, 현지화 작업 노트.
date: 2026-04-29
tags: [unreal, options, localization]
draft: false
visibility: public
aliases: [custom game user settings, localization]
---

옵션과 현지화는 출시 품질에 직접 연결되는 클라이언트 작업이다.

공개 가능한 경험:

- Custom GameUserSettings 구현
- DLSS 3.5 / FSR 3 업스케일 옵션 적용
- Virtual Texture 옵션 수정
- Meta Sound와 Sound Mixer 기반 사운드 옵션
- 현지화 대시보드 기반 텍스트 관리

옵션은 기능 구현보다 저장, 적용 시점, 재시작 필요 여부, 플랫폼별 지원 범위를 명확히 나누는 것이 중요하다.

관련 노트: [[unreal-client-programming]], [[common-ui-workflow]]
