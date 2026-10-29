---
title: "Claude Code Game Studios로 FrontLine 개발을 정리하기"
description: "Claude Code Game Studios를 FrontLine에 적용하고, 스토리·완료 조건·의존 관계와 읽기 전용 보드로 AI 개발 작업을 관리한 기록."
date: 2026-10-29
tags: [frontline, claude-code, ai-agent, workflow, project-management, unreal]
draft: false
visibility: public
aliases: []
related: [frontline-ai-art-pipeline, dualfire-commit-explanation-workflow]
slug: frontline-claude-code-game-studios
status: "evergreen"
source_type: "compiled"
source_url: "https://github.com/Donchitos/Claude-Code-Game-Studios"
captured_at: "2026-10-29"
owner: "kang"
decision_summary: "AI 개발 요청을 완료 조건과 의존 관계가 있는 스토리로 나누고, 프로젝트용 보드에서 진행 상태와 남은 검증 범위를 확인한다."
next_actions: []
---

AI와 게임을 개발하다 보면 기능을 구현하는 것만큼, 지금 무엇을 먼저 해야 하는지 정리하는 일이 중요해진다. 기능 추가와 수정 요청이 이어질수록 작업 순서와 완료 기준을 대화만으로 관리하기는 어려워진다.

최근 FrontLine에 [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)를 적용했다. 기획·프로그래밍·아트·사운드·QA 등의 역할과 작업 절차를 정의한 템플릿이다. 내게 도움이 된 부분은 에이전트의 수보다, 요청을 작업 단위로 정리하고 검증 결과까지 남기는 흐름이었다.

## 요청을 스토리로 정리하기

이제 기능을 요청할 때 구현 내용뿐 아니라 배경, 완료 조건, 수정 범위와 선행 작업을 스토리 문서에 함께 적는다.

예를 들어 “전투가 너무 어렵다”는 피드백도 바로 수치를 바꾸는 요청으로 넘기지 않았다. 카메라가 보여주는 범위, 적의 공격 거리와 탄속, 피격 중 조작 가능 여부를 나눠 확인하고 작업 순서를 정했다. 피격 시 조작이 끊기는 문제를 먼저 정리해야 이후 밸런스를 판단할 수 있다는 의존 관계도 기록했다.

작업 흐름은 다음 명령으로 이어간다.

```text
/create-stories   작업을 스토리로 나누기
/story-readiness  착수 조건 확인
/dev-story        해당 스토리 구현
/story-done       완료 조건과 검증 결과 확인
```

AI에게 무엇을 만들지 설명하는 데서 끝나는 것이 아니라, 어디까지 만들면 이번 작업이 끝나는지도 먼저 정하게 됐다.

## 문서 상태를 보드에서 확인하기

FrontLine에는 스토리 문서를 읽어 상태를 보여주는 읽기 전용 보드도 붙였다. 아래 화면은 프레임워크의 기본 제공 화면이 아니라, 프로젝트 작업을 확인하기 위해 추가한 보드다.

![FrontLine 스토리 보드와 작업별 진행 상태](./assets/frontline-story-board.png)

작업은 `Draft`, `Ready`, `In Progress`, `Blocked`, `Complete`로 구분한다. 카드에는 완료 조건의 진행 상황과 선행 작업이 표시되고, 각 상태에서 이어서 사용할 명령도 함께 나온다.

로비 인트로 카메라를 먼저 정리한 뒤 시작 연출을 검증하는 것처럼, 무엇이 다른 작업을 기다리고 있는지 한눈에 볼 수 있다. 보드에서 상태를 직접 바꾸는 방식은 아니다. 필요한 명령을 복사해 Claude Code에서 실행하고, 변경된 스토리 문서가 보드에 반영되도록 했다.

## 완료 표시와 검증 범위를 구분하기

특히 유용했던 부분은 작업을 닫을 때 남는 기록이다. `/story-done`에서는 완료 조건별 근거와 기획에서 달라진 부분, 아직 확인하지 못한 항목을 정리한다.

실제로 500m 클리어 검증 문서에는 조건 5개 중 4개 통과, 1개 미검증이 기록돼 있다. 완료 상태로 정리했더라도 무엇까지 확인했는지, 어떤 조건이 남았는지를 다시 볼 수 있다.

사격감이나 재장전처럼 실제 화면과 조작으로 판단해야 하는 작업도 별도로 관리했다. 코드가 작성됐다는 것과 플레이하면서 확인했다는 것을 같은 완료 보고로 묶지 않기 위해서다.

## 필요한 만큼 적용하기

FrontLine에서는 절차를 가볍게 적용하는 `minimal` 설정을 사용하고 있다. 모든 기능에 긴 설계 문서를 만드는 대신, 지금 필요한 작업과 완료 조건을 중심으로 관리하려는 선택이다.

적용 후 가장 체감하는 변화는 다음 작업을 고르기 쉬워졌다는 점이다. 대화 기록을 거슬러 올라가기보다 보드와 스토리 문서에서 현재 상태, 남은 조건, 선행 작업을 확인할 수 있다.

게임의 방향과 플레이 감각은 여전히 내가 판단한다. Claude Code Game Studios는 그 판단을 대신하기보다, AI와 진행하는 작업을 나누고 이어가는 데 도움이 됐다.
