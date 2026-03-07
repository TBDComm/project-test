// main.js — 랜딩 페이지 스크립트
// 이미 로그인된 사용자는 대시보드로 리다이렉트

import { supabase } from './supabase-config.js';

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    // 로그인 상태면 네비게이션 버튼 업데이트
    const loginBtn   = document.querySelector('a[href="/auth.html"]');
    const signupBtn  = document.querySelector('a[href="/auth.html?mode=signup"]');
    if (loginBtn)  { loginBtn.href = '/dashboard.html';  loginBtn.textContent = '대시보드'; }
    if (signupBtn) { signupBtn.href = '/dashboard.html'; signupBtn.textContent = '대시보드로 이동'; }
  }
});

// 히어로 → 미리보기 스크롤 애니메이션
document.querySelectorAll('a[href="#preview"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' });
  });
});

document.querySelectorAll('a[href="#features"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  });
});

// Intersection Observer — fade-in-up 트리거
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in-up').forEach(el => {
  el.style.animationPlayState = 'paused';
  observer.observe(el);
});
