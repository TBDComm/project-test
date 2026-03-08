// 현재 연-월 (사용량 초기화 기준)
export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 날짜를 N일 전 ISO 문자열로
export function getDateBefore(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
