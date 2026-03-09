import { PLANS } from './constants'

// 기능 사용 가능 여부 확인
export function canUseFeature(userData, feature) {
  if (!userData) return false
  if (userData.isAdmin) return true
  const plan = userData.plan || 'free'
  if (feature === 'spotlight') {
    if (plan !== 'free') return true
    return (userData.monthlyUsage || 0) < PLANS.free.monthlyLimit
  }
  if (feature === 'timing') {
    return plan === 'starter' || plan === 'pro'
  }
  if (feature === 'channelAnalysis') {
    return plan === 'starter' || plan === 'pro'
  }
  return false
}

// 이번 달 남은 Spotlight 횟수
export function getRemainingUses(userData) {
  if (!userData) return 0
  if (userData.isAdmin || userData.plan !== 'free') return Infinity
  return Math.max(0, PLANS.free.monthlyLimit - (userData.monthlyUsage || 0))
}
