export const PLANS = {
  free:    { name: '무료',    monthlyLimit: 5,        price: 0 },
  starter: { name: 'STARTER', monthlyLimit: Infinity, price: 9900 },
  pro:     { name: 'PRO',     monthlyLimit: Infinity, price: 19900 },
}

// YouTube API 캐시 (localStorage, TTL 3시간)
export const CACHE_TTL_MS = 3 * 60 * 60 * 1000
