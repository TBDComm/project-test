import { CACHE_TTL_MS } from './constants'

// 제목 구조 유형 분류
export function detectTitleStructure(title) {
  if (/[?？]/.test(title) || /^(왜|어떻게|무엇|뭐|어디|누가|언제)\s/.test(title)) return '질문형'
  if (/\d+/.test(title) && /(가지|개|번|위|등|명|곳|단계)/.test(title)) return '숫자·리스트형'
  if (/[!！]/.test(title) || /(대박|미쳤|레전드|역대급|충격|헐|실화)/.test(title)) return '감탄·강조형'
  if (/(방법|가이드|총정리|완벽|알아보|해봤|리뷰|추천|후기)/.test(title)) return '정보·가이드형'
  if (/(vs|VS|비교|차이|선택|고민)/.test(title)) return '비교·선택형'
  return '일반형'
}

// 제목 감정 트리거 분류
export function detectEmotionTrigger(title) {
  if (/(왜|비밀|숨겨진|알고보니|사실은|실제로|진짜|몰랐던|충격적인)/.test(title)) return '궁금증 유발형'
  if (/(충격|위험|경고|망함|실패|최악|주의|절대|망했|큰일)/.test(title)) return '경각심형'
  if (/(솔직히|나만|우리|힘든|공감|이런거|솔담|현실|고백)/.test(title)) return '공감·감성형'
  if (/(대박|미쳤|레전드|역대급|최고|완벽|신기|놀라운|꿀팁)/.test(title)) return '기대·흥미형'
  return '일반형'
}

// YouTube API 캐시 (localStorage)
export function getCached(key) {
  try {
    const raw = localStorage.getItem('yt_cache_' + key)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem('yt_cache_' + key); return null }
    return data
  } catch { return null }
}

export function setCache(key, data) {
  try { localStorage.setItem('yt_cache_' + key, JSON.stringify({ ts: Date.now(), data })) } catch {}
}
