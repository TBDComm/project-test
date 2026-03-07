// auth.js — Supabase 인증 (이메일 + Google)
import { supabase } from './supabase-config.js';

// URL 파라미터 파싱
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');       // 'signup' or null
const redirect = params.get('redirect') || '/dashboard.html';

// 이미 로그인된 경우 리다이렉트
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) window.location.href = redirect;
});

// 패널 전환
const loginPanel  = document.getElementById('login-panel');
const signupPanel = document.getElementById('signup-panel');

function showLogin()  { loginPanel.classList.remove('hidden'); signupPanel.classList.add('hidden'); }
function showSignup() { signupPanel.classList.remove('hidden'); loginPanel.classList.add('hidden'); }

document.getElementById('to-signup').addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
document.getElementById('to-login').addEventListener('click',  (e) => { e.preventDefault(); showLogin(); });

// URL 파라미터에 따라 초기 패널 결정
if (mode === 'signup') showSignup(); else showLogin();

// 에러 메시지 표시
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(id) {
  document.getElementById(id).classList.add('hidden');
}

// Supabase 에러 메시지 → 한국어
function authErrorMsg(message) {
  if (!message) return '오류가 발생했습니다. 다시 시도해주세요.';
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return '이미 사용 중인 이메일입니다.';
  if (m.includes('password should be at least'))
    return '비밀번호는 6자 이상이어야 합니다.';
  if (m.includes('unable to validate email'))
    return '올바른 이메일 형식이 아닙니다.';
  if (m.includes('email not confirmed'))
    return '이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.';
  if (m.includes('too many requests'))
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (m.includes('network'))
    return '네트워크 오류가 발생했습니다.';
  return '오류가 발생했습니다. 다시 시도해주세요.';
}

// 이메일 로그인
document.getElementById('email-login-btn').addEventListener('click', async () => {
  hideError('login-error');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showError('login-error', '이메일과 비밀번호를 모두 입력해주세요.');
    return;
  }

  const btn = document.getElementById('email-login-btn');
  btn.textContent = '로그인 중...';
  btn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showError('login-error', authErrorMsg(error.message));
    btn.textContent = '로그인';
    btn.disabled = false;
  } else {
    window.location.href = redirect;
  }
});

// 이메일 회원가입
document.getElementById('email-signup-btn').addEventListener('click', async () => {
  hideError('signup-error');
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!email || !password) {
    showError('signup-error', '이메일과 비밀번호를 모두 입력해주세요.');
    return;
  }
  if (password.length < 8) {
    showError('signup-error', '비밀번호는 8자 이상이어야 합니다.');
    return;
  }

  const btn = document.getElementById('email-signup-btn');
  btn.textContent = '가입 중...';
  btn.disabled = true;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    showError('signup-error', authErrorMsg(error.message));
    btn.textContent = '무료로 시작하기';
    btn.disabled = false;
  } else if (data.session) {
    // 이메일 인증 불필요 — 바로 대시보드로
    window.location.href = redirect;
  } else {
    // 이메일 인증 필요 — 안내 메시지 표시
    btn.textContent = '무료로 시작하기';
    btn.disabled = false;
    const el = document.getElementById('signup-error');
    el.textContent = '가입이 완료됐습니다! 받은 메일함에서 인증 링크를 클릭한 후 로그인해주세요.';
    el.style.color = 'var(--text-1)';
    el.classList.remove('hidden');
  }
});

// Google 로그인/가입 (공통) — OAuth 리다이렉트 방식
async function googleAuth(errorId) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + redirect,
    },
  });
  if (error) {
    showError(errorId, authErrorMsg(error.message));
  }
}

document.getElementById('google-login-btn').addEventListener('click',  () => googleAuth('login-error'));
document.getElementById('google-signup-btn').addEventListener('click', () => googleAuth('signup-error'));

// Enter 키 처리
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('email-login-btn').click();
});

document.getElementById('signup-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('email-signup-btn').click();
});
