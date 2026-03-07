// dashboard.js
import { requireAuth, getRemainingUses, PLANS, logout } from './utils.js';

requireAuth((user, userData) => {
  document.getElementById('auth-loading').classList.add('hidden');
  document.getElementById('dashboard-content').classList.remove('hidden');

  const isAdmin = userData.isAdmin || false;
  const plan = isAdmin ? 'pro' : (userData.plan || 'free');
  const usage = userData.monthlyUsage || 0;
  const remaining = getRemainingUses(userData);

  // 이름
  const name = user.displayName || user.email?.split('@')[0] || '크리에이터';
  document.getElementById('user-name').textContent = name;

  // 사용량
  document.getElementById('usage-count').textContent = usage;
  document.getElementById('usage-limit').textContent = plan === 'free' ? '5' : '∞';

  const usagePct = plan === 'free' ? Math.min(100, (usage / 5) * 100) : 0;
  document.getElementById('usage-bar').style.width = usagePct + '%';
  document.getElementById('usage-note').textContent =
    plan === 'free'
      ? `이번 달 남은 횟수: ${remaining}회`
      : '무제한 사용 가능';

  // 플랜
  document.getElementById('plan-name').textContent = isAdmin ? 'ADMIN' : (PLANS[plan]?.name || '무료');
  document.getElementById('plan-note').textContent = isAdmin ? '모든 기능 무제한' :
    plan === 'free'    ? '월 5회 Spotlight Compare' :
    plan === 'starter' ? 'Spotlight 무제한 + Timing Report' :
                         '모든 기능 포함';

  // 구독 상태
  if (plan === 'free') {
    document.getElementById('sub-status').textContent = '미구독';
  } else {
    document.getElementById('sub-status').textContent = '구독 중';
    if (userData.subscriptionEnd) {
      const end = userData.subscriptionEnd.toDate?.() || new Date(userData.subscriptionEnd);
      const fmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('sub-note').textContent = `${fmt.format(end)}까지`;
    }
  }

  // Spotlight 남은 횟수 배지
  const spBadge = document.getElementById('spotlight-remain');
  if (plan === 'free') {
    spBadge.textContent = `이번 달 ${remaining}회 남음`;
  } else {
    spBadge.textContent = '무제한';
    spBadge.classList.add('badge-green');
    spBadge.classList.remove('badge-purple');
  }

  // Timing Report 잠금 여부
  const canTiming = plan === 'starter' || plan === 'pro';
  const timingAction = document.getElementById('timing-action');
  const timingLock = document.getElementById('timing-lock');
  const timingCta  = document.getElementById('timing-cta');

  if (canTiming) {
    timingAction.href = '/timing.html';
    timingLock.classList.add('hidden');
  } else {
    timingAction.classList.add('locked');
    timingAction.href = '/pricing.html';
    timingLock.classList.remove('hidden');
    timingCta.textContent = '업그레이드 필요';
    timingCta.style.color = 'var(--text-3)';
  }
});

document.getElementById('logout-btn').addEventListener('click', logout);
