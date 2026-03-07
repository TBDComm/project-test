// utils.js — 공통 유틸리티: 인증 가드, 사용자 데이터, 사용량 추적

import { supabase } from './supabase-config.js';

export const PLANS = {
  free:    { name: '무료',    monthlyLimit: 5,        price: 0 },
  starter: { name: 'STARTER', monthlyLimit: Infinity, price: 9900 },
  pro:     { name: 'PRO',     monthlyLimit: Infinity, price: 19900 },
};

// 로그인 필요 페이지에서 호출 — 미로그인 시 auth.html로 리다이렉트
export function requireAuth(callback) {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
      window.location.href = '/auth.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const userData = await getUserData(session.user.id);
    callback(session.user, userData);
  });
}

// Supabase DB에서 사용자 데이터 가져오기 (없으면 생성)
export async function getUserData(uid) {
  const currentMonth = getCurrentMonth();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single();

  if (error || !data) {
    const newUser = {
      id: uid,
      plan: 'free',
      monthly_usage: 0,
      usage_month: currentMonth,
      subscription_end: null,
    };
    await supabase.from('users').insert(newUser);
    return { plan: 'free', monthlyUsage: 0, usageMonth: currentMonth, subscriptionEnd: null };
  }

  // 월이 바뀌면 사용량 초기화
  if (data.usage_month !== currentMonth) {
    await supabase
      .from('users')
      .update({ monthly_usage: 0, usage_month: currentMonth })
      .eq('id', uid);
    data.monthly_usage = 0;
    data.usage_month = currentMonth;
  }

  return {
    plan: data.plan,
    monthlyUsage: data.monthly_usage,
    usageMonth: data.usage_month,
    subscriptionEnd: data.subscription_end,
  };
}

// Spotlight Compare 사용 1회 차감
export async function incrementUsage(uid) {
  const { data } = await supabase
    .from('users')
    .select('monthly_usage')
    .eq('id', uid)
    .single();

  await supabase
    .from('users')
    .update({ monthly_usage: (data?.monthly_usage || 0) + 1 })
    .eq('id', uid);
}

// 기능 사용 가능 여부 확인
export function canUseFeature(userData, feature) {
  const plan = userData.plan || 'free';
  if (feature === 'spotlight') {
    if (plan !== 'free') return true;
    return (userData.monthlyUsage || 0) < PLANS.free.monthlyLimit;
  }
  if (feature === 'timing') {
    return plan === 'starter' || plan === 'pro';
  }
  return false;
}

// 이번 달 남은 Spotlight 횟수
export function getRemainingUses(userData) {
  if (userData.plan !== 'free') return Infinity;
  return Math.max(0, PLANS.free.monthlyLimit - (userData.monthlyUsage || 0));
}

// 현재 연-월 (사용량 초기화 기준)
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 숫자를 한국어 단위로 포맷
export function formatNumber(n) {
  n = Number(n) || 0;
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000)     return (n / 10000).toFixed(1) + '만';
  if (n >= 1000)      return (n / 1000).toFixed(1) + '천';
  return n.toString();
}

// 로그아웃 (모든 페이지 공통)
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
}

// 날짜를 ISO 문자열로 (N일 전)
export function getDateBefore(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// 제목 구조 유형 분류
export function detectTitleStructure(title) {
  if (/[?？]/.test(title) || /^(왜|어떻게|무엇|뭐|어디|누가|언제)\s/.test(title)) return '질문형';
  if (/\d+/.test(title) && /(가지|개|번|위|등|명|곳|단계)/.test(title)) return '숫자형';
  if (/[!！]/.test(title) || /(대박|미쳤|레전드|역대급|충격|헐|실화)/.test(title)) return '감탄형';
  if (/(방법|가이드|총정리|완벽|알아보|해봤|리뷰|추천|후기)/.test(title)) return '정보형';
  if (/(vs|VS|비교|차이|선택|고민)/.test(title)) return '비교형';
  return '일반형';
}

// 제목 감정 트리거 분류
export function detectEmotionTrigger(title) {
  if (/(왜|비밀|숨겨진|알고보니|사실은|실제로|진짜|몰랐던|충격적인)/.test(title)) return '호기심형';
  if (/(충격|위험|경고|망함|실패|최악|주의|절대|망했|큰일)/.test(title)) return '공포/긴장형';
  if (/(솔직히|나만|우리|힘든|공감|이런거|솔담|현실|고백)/.test(title)) return '공감형';
  if (/(대박|미쳤|레전드|역대급|최고|완벽|신기|놀라운|꿀팁)/.test(title)) return '기대/흥미형';
  return '중립형';
}

// 네비게이션 활성화
export function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}
