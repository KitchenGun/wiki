---
title: Audio Visual and Sequencer
description: MetaSound, Attenuation, AnimNotify, Sequencer 기반 연출 구현 노트.
date: 2026-04-29
tags: [unreal, audio, sequencer]
draft: false
visibility: public
aliases: [metasound, sequencer]
status: "evergreen"
source_type: "compiled"
source_url: ""
captured_at: "2026-04-29"
owner: "kang"
decision_summary: "MetaSound, Attenuation, AnimNotify, Sequencer 기반 연출 구현 노트."
next_actions: []
---

공포 게임에서는 사운드와 시퀀스가 별도 연출로 끝나지 않고 플레이어 입력과 게임 상태에 맞춰 실행되어야 한다. 저는 퍼즐 해결, 상호작용, 애니메이션 타이밍을 하나의 흐름으로 연결하기 위해 MetaSound, AnimNotify, Sequencer를 함께 사용했다.

사운드 경험:

- MetaSound 도입으로 Blueprint에 집중된 오디오 로직 분산
- 3D 공간 음향과 계층화된 사운드 설계
- Attenuation 세분화와 Curve 조정 구조
- AnimNotify로 시청각 타이밍 일치
- Sound Class 계층을 UI 옵션과 연동

시퀀스 경험:

- Sequencer Actor를 활용한 인게임 연출
- 특정 레벨에 종속되지 않는 범용 연출 시스템
- Event Track으로 퍼즐 기믹과 사운드 재생 연결
- 연출용 Actor를 동적으로 생성하고 실행
- 퍼즐 해결 보상 연출을 표준화

시퀀스는 컷신이 아니라 게임 상태를 바꾸는 연출 시스템으로 다뤄야 한다.

포트폴리오에서는 Occlusion을 활용한 폐쇄 공간 사운드와 Sequencer 기반 연출을 함께 확인할 수 있습니다. 사운드 파라미터와 연출 이벤트를 분리해, 게임 상태에 따라 재생 시점과 공간감을 조정했습니다.

![Occlusion을 적용한 폐쇄 공간 사운드 장면](./assets/portfolio/portfolio-audio-occlusion.jpg)
![Sequencer 기반 연출 장면](./assets/portfolio/portfolio-sequencer-scene.jpg)
![연출 중 상호작용을 구현한 장면](./assets/portfolio/portfolio-sequencer-interaction.jpg)

관련 노트: [[game-options-localization]], [[interaction-component-architecture]], [[unreal-client-programming]]
