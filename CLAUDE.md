# MOMENTO — 프로젝트 개발 규칙

## Web Interface Guidelines (필수 적용)

모든 코드 작성 및 수정 시 아래 가이드라인을 항상 준수한다.
가이드라인 원문: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

### 핵심 규칙 요약

**접근성**
- 아이콘 전용 버튼에 `aria-label` 필수
- 폼 컨트롤에 `<label>` 또는 `aria-label` 필수
- 네비게이션에는 반드시 `<a>`/`<Link>`, 액션에는 `<button>` 사용 (`<div onclick>` 금지)
- 장식용 SVG/아이콘에 `aria-hidden="true"` 필수
- 시맨틱 HTML 우선 (`<button>`, `<a>`, `<label>`, `<table>`)
- 모든 페이지에 skip link 포함

**포커스**
- `outline: none` / `outline-none` 단독 사용 금지 — 반드시 `focus-visible` 대체 스타일 제공
- `:focus-visible` 사용 (`:focus` 대신)

**폼**
- input에 `name`, `autocomplete`, 올바른 `type` 속성 필수
- `<label>`에 `for` 속성 필수 (또는 input을 감싸는 형태)
- email/코드/username input에 `spellcheck="false"`
- placeholder는 `…`으로 끝내기

**애니메이션**
- `prefers-reduced-motion` 미디어 쿼리 항상 적용
- `transform`/`opacity`만 애니메이션 (compositor-friendly)
- `transition: all` 금지 — 개별 프로퍼티 명시

**타이포그래피**
- `…` 사용 (`...` 금지)
- 로딩 상태: `"Loading…"`, `"저장 중…"` 형식
- 헤딩에 `text-wrap: balance` 또는 `text-pretty`

**터치 & 인터랙션**
- 버튼/링크에 `touch-action: manipulation`

**로케일**
- 날짜/시간: `Intl.DateTimeFormat` 사용 (하드코딩 금지)
- 숫자/통화: `Intl.NumberFormat` 사용

**Anti-patterns (절대 금지)**
- `transition: all`
- `outline: none` (대체 없이)
- `<div>`/`<span>` click 핸들러 → `<button>` 사용
- `<a>` 없는 onclick 네비게이션
- form input에 label 없음
- 아이콘 버튼에 `aria-label` 없음
- 날짜/숫자 하드코딩 (`Intl.*` 사용)

## 코드 수정 시 체크리스트

새 UI 코드를 작성하거나 기존 코드를 수정할 때:
1. 위 규칙 위반 여부 확인
2. 위반 사항 발견 시 즉시 함께 수정
3. 별도 요청 없어도 가이드라인 준수 코드 작성
