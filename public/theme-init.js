// 테마 초기화 — FOUC 방지를 위해 모든 페이지 <head>에서 가장 먼저 로드
// 우선순위: 1) localStorage 저장값  2) OS 설정  3) 라이트 모드
(function () {
  var saved = localStorage.getItem('momento_theme');
  var theme;
  if (saved === 'dark' || saved === 'light') {
    theme = saved;
  } else {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();

// 전역 테마 토글 함수 (모든 페이지에서 사용)
window.toggleTheme = function () {
  var current = document.documentElement.getAttribute('data-theme') || 'light';
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('momento_theme', next);

  // 토글 버튼 아이콘 갱신 (있는 경우)
  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.setAttribute('aria-label', next === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    var icon = btn.querySelector('.theme-icon');
    if (icon) icon.textContent = next === 'dark' ? '○' : '●';
  });

  // mypage 설정 탭 레이블 갱신 (있는 경우)
  var label = document.getElementById('theme-label');
  if (label) label.textContent = next === 'dark' ? '다크 모드' : '라이트 모드';
};
