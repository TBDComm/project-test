# University Course Registration System

## Overview

이 프로젝트는 현대적이고 직관적인 대학교 수강신청 프론트엔드 시스템입니다. 사용자는 강의를 검색하고, 본인의 시간표를 시각적으로 확인하며, 실시간으로 수강 신청 및 취소를 수행할 수 있습니다. 프레임워크 없이 Web Components와 최신 CSS 표준을 사용하여 구축되었습니다.

## Style, Design, and Features

*   **Aesthetics:** 깔끔한 대학교 포털 스타일, 신뢰감을 주는 블루/화이트 테마, 세련된 타이포그래피.
*   **Responsiveness:** 데스크톱 최적화 레이아웃과 모바일 대응 그리드 시스템.
*   **Key Features:**
    *   **강의 검색 및 필터링:** 과목명, 교수명 등으로 실시간 검색.
    *   **수강 바구니 (Cart):** 관심 있는 강의를 담아두고 시간표 중복 여부 확인.
    *   **시각적 시간표 (Timetable):** 등록된 강의를 주간 시간표 그리드에 시각화.
    *   **학점 제한 로직:** 최대 수강 가능 학점 제한 및 경고 알림.
    *   **애니메이션:** 부드러운 전환 효과와 마우스 호버 효과.

## Current Plan

1.  **데이터 구조 설계**: 강의명, 시간, 학점, 교수진 정보를 포함한 Mock Data 생성.
2.  **UI 컴포넌트 개발**:
    *   `<course-search>`: 검색 바 및 필터.
    *   `<course-list>`: 검색 결과 및 강의 목록.
    *   `<course-cart>`: 선택한 강의 목록 및 합계 학점.
    *   `<registration-timetable>`: 주간 시간표 그리드.
3.  **비즈니스 로직 구현**: 강의 추가/삭제 시 시간표 업데이트 및 중복 시간 체크.
4.  **배포**: GitHub Pages를 통한 웹 호스팅 환경 설정.

## Layout Structure

*   **Sidebar/Header:** 사용자 정보 및 총 이수 학점 요약.
*   **Main Content:** 강의 검색 결과 (좌측) 및 실시간 시간표 (우측).
*   **Bottom/Overlay:** 수강 바구니 및 신청 내역.
