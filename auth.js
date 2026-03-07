// auth.js — Firebase 인증 (이메일 + Google)
import { auth, googleProvider } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// URL 파라미터 파싱
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');       // 'signup' or null
const redirect = params.get('redirect') || '/dashboard.html';

// 이미 로그인된 경우 리다이렉트
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = redirect;
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

// Firebase 에러 코드 → 한국어 메시지
function authErrorMsg(code) {
  const map = {
    'auth/user-not-found':       '존재하지 않는 이메일입니다.',
    'auth/wrong-password':       '비밀번호가 올바르지 않습니다.',
    'auth/invalid-credential':   '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password':        '비밀번호는 6자 이상이어야 합니다.',
    'auth/invalid-email':        '올바른 이메일 형식이 아닙니다.',
    'auth/too-many-requests':    '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    'auth/popup-closed-by-user': '팝업이 닫혔습니다. 다시 시도해주세요.',
    'auth/network-request-failed': '네트워크 오류가 발생했습니다.',
  };
  return map[code] || '오류가 발생했습니다. 다시 시도해주세요.';
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

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = redirect;
  } catch (e) {
    showError('login-error', authErrorMsg(e.code));
    btn.textContent = '로그인';
    btn.disabled = false;
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

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = redirect;
  } catch (e) {
    showError('signup-error', authErrorMsg(e.code));
    btn.textContent = '무료로 시작하기';
    btn.disabled = false;
  }
});

// Google 로그인/가입 (공통)
async function googleAuth(errorId) {
  try {
    await signInWithPopup(auth, googleProvider);
    window.location.href = redirect;
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      showError(errorId, authErrorMsg(e.code));
    }
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
