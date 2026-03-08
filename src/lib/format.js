// 숫자를 한국어 단위로 포맷
export function formatNumber(n) {
  n = Number(n) || 0
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억'
  if (n >= 10000)     return (n / 10000).toFixed(1) + '만'
  if (n >= 1000)      return (n / 1000).toFixed(1) + '천'
  return n.toString()
}
