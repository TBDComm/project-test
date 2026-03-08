import { CACHE_TTL_MS } from './constants'

// 제목 구조 유형 분류 (내부 키)
export function detectTitleStructure(title) {
  if (/[?？]/.test(title) || /^(왜|어떻게|무엇|뭐|어디|누가|언제)\s/.test(title)) return '질문형'
  if (/\d+/.test(title) && /(가지|개|번|위|등|명|곳|단계)/.test(title)) return '숫자·리스트형'
  if (/[!！]/.test(title) || /(대박|미쳤|레전드|역대급|충격|헐|실화)/.test(title)) return '감탄·강조형'
  if (/(방법|가이드|총정리|완벽|알아보|해봤|리뷰|추천|후기)/.test(title)) return '정보·가이드형'
  if (/(vs|VS|비교|차이|선택|고민)/.test(title)) return '비교·선택형'
  return '일반형'
}

// 제목 감정 분류 (내부 키)
export function detectEmotionTrigger(title) {
  if (/(왜|비밀|숨겨진|알고보니|사실은|실제로|진짜|몰랐던|충격적인)/.test(title)) return '궁금증 유발형'
  if (/(충격|위험|경고|망함|실패|최악|주의|절대|망했|큰일)/.test(title)) return '경각심형'
  if (/(솔직히|나만|우리|힘든|공감|이런거|솔담|현실|고백)/.test(title)) return '공감·감성형'
  if (/(대박|미쳤|레전드|역대급|최고|완벽|신기|놀라운|꿀팁)/.test(title)) return '기대·흥미형'
  return '일반형'
}

// 사용자에게 보이는 구조 레이블 (bar chart 등)
export const STRUCTURE_DISPLAY = {
  '질문형':       '질문·호기심형',
  '숫자·리스트형': '숫자·목록형',
  '감탄·강조형':  '강조·감탄형',
  '정보·가이드형': '정보·안내형',
  '비교·선택형':  '비교·선택형',
  '일반형':       '기타',
}

// 사용자에게 보이는 감정 레이블
export const EMOTION_DISPLAY = {
  '궁금증 유발형': '궁금증 유발형',
  '경각심형':     '경각심·경고형',
  '공감·감성형':  '공감·감성형',
  '기대·흥미형':  '기대·흥미형',
  '일반형':       '기타',
}

// 구조 유형 설명
export const STRUCTURE_DESC = {
  '질문형':       '"왜?", "어떻게?" 같은 질문 형태로 시청자의 궁금증을 자극하는 제목이에요.',
  '숫자·리스트형': '숫자를 활용해 구체적이고 신뢰감을 주는 제목이에요. 클릭률이 높은 편이에요.',
  '감탄·강조형':  '"대박", "레전드" 같은 강한 단어로 시청자의 감정을 즉각 자극하는 제목이에요.',
  '정보·가이드형': '검색 유입에 유리하고 영상 내용을 명확하게 전달하는 제목이에요.',
  '비교·선택형':  '"A vs B", "비교" 같은 구도로 선택 고민이 있는 시청자에게 어필하는 제목이에요.',
  '일반형':       '클릭을 끌어당기는 특별한 구조 요소가 없는 제목이에요.',
}

export const STRUCTURE_TIP = {
  '일반형': '숫자("5가지"), 질문("왜?"), 강조어("실화", "레전드")를 넣어보세요.',
}

// 감정 유형 설명
export const EMOTION_DESC = {
  '궁금증 유발형': '숨겨진 정보나 비밀을 암시해 클릭을 끌어당기는 분위기예요.',
  '경각심형':     '위험·경고를 앞세워 강한 주목을 끄는 분위기예요.',
  '공감·감성형':  '시청자의 감정과 공감대를 자극하는 분위기예요.',
  '기대·흥미형':  '놀라움과 기대감으로 클릭을 유도하는 분위기예요.',
  '일반형':       '감정적으로 클릭을 자극하는 요소가 뚜렷하지 않은 제목이에요.',
}

export const EMOTION_TIP = {
  '일반형': '"왜", "비밀", "충격", "실제로" 같은 단어를 넣어 궁금증을 자극해보세요.',
}

// 영상이 롱폼(4분 이상)인지 확인
export function isLongForm(duration) {
  if (!duration) return true
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return true
  const h = parseInt(match[1] || 0)
  const m = parseInt(match[2] || 0)
  return h > 0 || m >= 4
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
