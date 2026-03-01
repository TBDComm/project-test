# Lotto Number Generator

## Overview

이 프로젝트는 사용자가 무작위 로또 번호를 생성할 수 있는 웹 기반 도구입니다. 최신 웹 표준(Web Components)을 사용하여 캡슐화된 UI를 제공하며, 다크 모드와 라이트 모드를 지원하여 사용자 경험을 극대화합니다.

## Style, Design, and Features

*   **Aesthetics:** 현대적이고 깔끔한 인터페이스, 부드러운 애니메이션 효과.
*   **Responsiveness:** 모바일 및 데스크톱 환경 모두에 최적화된 반응형 디자인.
*   **Theme Support:** 시스템 설정 또는 사용자 선택에 따른 다크/라이트 모드 지원.
*   **Lotto Ball Logic:** 실제 로또 공의 색상 규칙(번호 대역별 색상 차별화) 적용.
*   **Web Component:** `<lotto-generator>` 커스텀 엘리먼트를 통한 모듈화.

## Current Plan (Lotto + Theme)

1.  **CSS 테마 시스템 구축**: `:root`에 컬러 변수를 정의하고 테마별 클래스를 통해 색상 전환.
2.  **로또 번호 생성 로직 개선**:
    *   1-45 사이의 중복 없는 6개 번호 추출.
    *   번호 대역에 따른 공 색상 지정 (노랑, 파랑, 빨강, 회색, 초록).
3.  **테마 전환 UI**: 상단에 아이콘 기반의 테마 전환 버튼 추가.
4.  **Git 배포**: 모든 변경 사항을 GitHub 저장소(`TBDComm/project-test`)에 푸시.
