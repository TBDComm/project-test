// 테마 초기화 — FOUC 방지를 위해 모든 페이지 <head>에서 가장 먼저 로드
(function () {
  var t = localStorage.getItem('momento_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();
