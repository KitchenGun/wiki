---
title: Unreal UAsset Text Diff
description: Unreal Editor Python으로 uasset의 CDO 프로퍼티와 컴포넌트 변경을 텍스트로 비교하는 유틸리티 구현 노트.
date: 2026-07-03
tags: [unreal, python, tooling, asset-diff]
draft: false
visibility: public
aliases: [uasset diff, unreal asset diff, blueprint text diff]
related: [unreal-client-programming, unreal-mcp, interaction-component-architecture]
slug: unreal-uasset-text-diff
status: evergreen
source_type: compiled
source_url: ""
captured_at: 2026-07-03
owner: kang
decision_summary: Binary Unreal assets are hard to review in Git, so reusable editor tooling can turn selected asset changes into stable text diffs.
next_actions: []
---

Unreal의 `.uasset` 변경은 Git diff만으로 내용을 판단하기 어렵다. 특히 Blueprint나 에셋 설정 변경은 스크린샷, 에디터 UI 확인, 수동 비교에 의존하기 쉽다.

이 유틸리티의 목적은 이전 리비전의 에셋 파일을 임시 패키지로 로드하고, 현재 에셋과 CDO(Class Default Object) 기준으로 비교해 사람이 읽을 수 있는 텍스트 diff를 만드는 것이다.

## Approach

- 이전 버전의 에셋 파일을 임시 패키지 위치로 복사한다.
- Unreal Asset Registry를 갱신해 임시 패키지를 로드 가능하게 만든다.
- 이전 에셋과 현재 에셋의 CDO를 각각 얻는다.
- 공통 editor property를 순회하면서 값 차이를 비교한다.
- ActorComponent 목록을 이름 기준으로 비교해 추가, 삭제, 프로퍼티 변경을 출력한다.
- UObject 참조는 메모리 주소가 아니라 path name으로 정규화한다.
- 구조체는 가능한 경우 dictionary 형태로 풀어 실제 필드값을 비교한다.
- 임시 패키지 경로에서 발생하는 자기 참조 차이는 현재 패키지 경로로 치환해 거짓 diff를 줄인다.

## Why It Matters

이 방식은 binary asset을 완전히 text asset으로 바꾸는 것이 아니라, 리뷰에 필요한 일부 신호를 안정적으로 뽑아내는 보조 도구다.

실제로 유용한 지점은 다음과 같다.

- 에셋 변경을 스크린샷 없이 로그로 공유할 수 있다.
- Blueprint의 기본값, 컴포넌트 구성, 컴포넌트 프로퍼티 변경을 빠르게 확인할 수 있다.
- Git revision에서 이전 에셋을 직접 꺼내 비교할 수 있어, 별도 백업 파일을 만들 필요가 줄어든다.
- 임시 패키지 이름을 호출마다 다르게 만들어 파일 잠금이나 정리 실패가 다음 비교에 영향을 주지 않게 할 수 있다.

## Limits

CDO 리플렉션 기반 비교는 이벤트 그래프 노드나 Blueprint 로직 변경을 직접 감지하지 못한다. 로직 변경이 중요할 때는 Unreal Editor의 내장 Blueprint diff 도구를 함께 써야 한다.

또한 이 방식은 공개 리뷰용 요약에는 적합하지만, private 프로젝트의 원본 에셋 경로, 내부 명명, 실제 diff 전문을 그대로 공개하는 용도는 아니다. 공개 문서에는 구조와 판단 기준만 남기고, 원본 커밋과 raw 비교 결과는 private memory에 유지한다.

## Reuse Notes

이 유틸리티는 프로젝트별 게임 로직에 의존하지 않게 작성하는 편이 좋다. 필요한 전제는 Unreal Editor Python 실행 환경과 비교 대상 에셋의 패키지 경로뿐이다.

운영 흐름은 다음처럼 잡을 수 있다.

1. Git revision에서 이전 `.uasset` 파일을 임시 파일로 추출한다.
2. 현재 에셋 패키지 경로와 이전 파일을 비교 함수에 넘긴다.
3. 출력된 텍스트 diff를 로그나 검토 메모에 붙인다.
4. 이벤트 그래프 로직 변경이 의심되면 내장 diff 도구로 보강 검토한다.

관련 노트: [[unreal-client-programming]], [[unreal-mcp]], [[interaction-component-architecture]]
