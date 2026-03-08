import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { canUseFeature, getRemainingUses } from '../lib/plan'
import { incrementUsage } from '../lib/user'
import { detectTitleStructure, detectEmotionTrigger, getCached, setCache } from '../lib/youtube'

const CATEGORY_LABELS = {
  '22': '브이로그', '20': '게임', '27': '교육',
  '24': '엔터테인먼트', '10': '음악', '26': '뷰티/요리/패션',
  '28': '테크/IT', '17': '스포츠',
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const CATEGORIES = [
  { value: '22', label: '브이로그' },
  { value: '20', label: '게임' },
  { value: '27', label: '교육' },
  { value: '24', label: '엔터테인먼트' },
  { value: '10', label: '음악' },
  { value: '26', label: '뷰티/패션' },
  { value: '28', label: '테크/IT' },
  { value: '17', label: '스포츠' },
]

async function fetchTrendingVideos(categoryId) {
  const cacheKey = `spotlight_${categoryId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const url = `/api/youtube?_ep=videos&part=snippet,statistics&chart=mostPopular&regionCode=KR&videoCategoryId=${categoryId}&maxResults=20`
  const res = await fetch(url)
  const data = await res.json()

  if (data.error) throw new Error(data.error.message || '데이터를 불러오지 못했습니다.')

  if (!data.items?.length) {
    const fallbackKey = 'spotlight_all'
    const cachedFallback = getCached(fallbackKey)
    if (cachedFallback) return cachedFallback

    const url2 = `/api/youtube?_ep=videos&part=snippet,statistics&chart=mostPopular&regionCode=KR&maxResults=20`
    const res2 = await fetch(url2)
    const data2 = await res2.json()
    if (!data2.items?.length) throw new Error('데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.')
    setCache(fallbackKey, data2.items)
    return data2.items
  }

  setCache(cacheKey, data.items)
  return data.items
}

function analyzeVideos(videos) {
  const titles = videos.map(v => v.snippet?.title || '')
  const publishedAts = videos.map(v => v.snippet?.publishedAt || '')

  const lengths = titles.map(t => t.length).filter(l => l > 0)
  const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
  const minLen = Math.min(...lengths)
  const maxLen = Math.max(...lengths)

  const structureCounts = {}
  titles.forEach(t => {
    const s = detectTitleStructure(t)
    structureCounts[s] = (structureCounts[s] || 0) + 1
  })

  const emotionCounts = {}
  titles.forEach(t => {
    const e = detectEmotionTrigger(t)
    emotionCounts[e] = (emotionCounts[e] || 0) + 1
  })

  const dayHourCounts = {}
  publishedAts.forEach(iso => {
    if (!iso) return
    const d = new Date(iso)
    const kstHour = (d.getUTCHours() + 9) % 24
    const dayName = DAYS[d.getDay()]
    const key = `${dayName}요일 ${kstHour}시`
    dayHourCounts[key] = (dayHourCounts[key] || 0) + 1
  })

  const topTimings = Object.entries(dayHourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k)

  const topByCount = (counts) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  return {
    titleLengthAvg: avgLen,
    titleLengthRange: `${minLen}~${maxLen}자`,
    titleLengthPct70: `${Math.round(avgLen * 0.85)}~${Math.round(avgLen * 1.15)}자`,
    structureCounts,
    emotionCounts,
    topStructure: topByCount(structureCounts),
    topEmotion: topByCount(emotionCounts),
    topTimings,
    total: videos.length,
  }
}

function pct(count, total) {
  return Math.round((count / total) * 100)
}

function BarChart({ counts, total, topN = 3 }) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, topN)
  return (
    <div className="metric-bar">
      {sorted.map(([label, count]) => {
        const p = pct(count, total)
        return (
          <div className="metric-bar-item" key={label}>
            <span className="metric-bar-label">{label}</span>
            <div className="metric-bar-track">
              <div className="metric-bar-fill" style={{ width: `${p}%` }} />
            </div>
            <span className="metric-bar-pct">{p}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Spotlight() {
  const { user, userData, setUserData } = useAuth()

  const [videoTitle, setVideoTitle] = useState('')
  const [thumbnailText, setThumbnailText] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('empty') // empty | loading | result | error
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const [localUserData, setLocalUserData] = useState(userData)

  // AuthContext의 userData가 백그라운드에서 로드되면 최초 1회 동기화
  useEffect(() => {
    if (userData !== null && localUserData === null) {
      setLocalUserData(userData)
    }
  }, [userData, localUserData])

  const canUse = canUseFeature(localUserData, 'spotlight')
  const remaining = getRemainingUses(localUserData)

  const usageNotice = localUserData?.isAdmin
    ? '어드민 계정 · 모든 기능 무제한'
    : localUserData?.plan === 'free'
    ? `이번 달 ${remaining}회 남았습니다. (무료 플랜: 월 5회)`
    : `${localUserData?.plan === 'starter' ? 'STARTER' : 'PRO'} 플랜 · 무제한 사용 가능`

  const handleAnalyze = async () => {
    if (!videoTitle.trim()) { alert('영상 제목을 입력해주세요.'); return }
    if (!category) { alert('카테고리를 선택해주세요.'); return }
    if (!canUseFeature(localUserData, 'spotlight')) return

    setStatus('loading')
    try {
      const videos = await fetchTrendingVideos(category)
      const analysis = analyzeVideos(videos)

      if (!localUserData?.isAdmin && localUserData?.plan === 'free') {
        await incrementUsage(user.id)
        const updated = { ...localUserData, monthlyUsage: (localUserData.monthlyUsage || 0) + 1 }
        setLocalUserData(updated)
        if (setUserData) setUserData(updated)
      }

      setResult({ analysis, myTitle: videoTitle.trim(), myThumb: thumbnailText.trim(), categoryId: category })
      setStatus('result')
    } catch (e) {
      setErrorMsg(e.message || '데이터를 가져오는 중 오류가 발생했습니다.')
      setStatus('error')
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="app-main" id="main-content">
        <div className="page-header">
          <h1 className="page-title">✦ Spotlight Compare</h1>
          <p className="page-desc">지금 카테고리 상위 영상들의 패턴과 내 영상을 나란히 비교합니다.</p>
        </div>

        {localUserData === null ? (
          <div className="loading-overlay">
            <div className="spinner" />
            <span>잠시만 기다려주세요…</span>
          </div>
        ) : !canUse ? (
          <div className="upgrade-prompt">
            <div className="up-icon">◇</div>
            <h2 className="up-title">이번 달 무료 횟수를 모두 사용했습니다</h2>
            <p className="up-desc">
              무료 플랜은 월 5회 Spotlight Compare를 제공합니다.<br />
              STARTER 플랜으로 업그레이드하면 횟수 제한 없이 사용할 수 있습니다.
            </p>
            <Link to="/pricing" className="btn btn-primary btn-lg">플랜 업그레이드하기</Link>
          </div>
        ) : (
          <div className="spotlight-layout">
            <aside className="input-panel">
              <h2 className="input-panel-title">내 영상 정보 입력</h2>
              {usageNotice && <div className="usage-notice">{usageNotice}</div>}

              <div className="input-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="video-title">영상 제목</label>
                  <input
                    type="text" id="video-title" name="video-title" className="form-input"
                    placeholder="예: 혼자 도전한 제주 3박4일 브이로그…"
                    maxLength={100} autoComplete="off"
                    value={videoTitle} onChange={e => setVideoTitle(e.target.value)}
                  />
                  <span className="form-hint">실제 업로드한 제목을 그대로 입력하세요.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="thumbnail-text">썸네일 텍스트</label>
                  <input
                    type="text" id="thumbnail-text" name="thumbnail-text" className="form-input"
                    placeholder="예: 혼자 제주도 도전기…"
                    maxLength={60} autoComplete="off"
                    value={thumbnailText} onChange={e => setThumbnailText(e.target.value)}
                  />
                  <span className="form-hint">썸네일에 들어간 텍스트. 없으면 비워두세요.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="category">카테고리</label>
                  <select
                    id="category" name="category" className="form-select"
                    value={category} onChange={e => setCategory(e.target.value)}
                  >
                    <option value="">카테고리 선택</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary btn-full" type="button"
                  style={{ padding: 13 }}
                  onClick={handleAnalyze}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? '분석\u00A0중…' : '비교\u00A0분석\u00A0시작'}
                </button>
              </div>
            </aside>

            <section id="result-panel">
              {status === 'empty' && (
                <div className="empty-state" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
                  <div className="empty-icon" aria-hidden="true">✦</div>
                  <div className="empty-title">분석{"\u00A0"}결과가{"\u00A0"}여기에{"\u00A0"}표시됩니다</div>
                  <div className="empty-desc">왼쪽에{"\u00A0"}영상{"\u00A0"}정보를{"\u00A0"}입력하고 비교{"\u00A0"}분석을{"\u00A0"}시작하세요.</div>
                </div>
              )}

              {status === 'loading' && (
                <div className="result-loading">
                  <div className="spinner" />
                  <span>유튜브 트렌드 데이터를 가져오는 중…</span>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>최대 10초가 소요될 수 있습니다.</span>
                </div>
              )}

              {status === 'error' && (
                <div className="alert alert-error" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
                  <span aria-hidden="true">✕</span>
                  <div>{errorMsg}</div>
                </div>
              )}

              {status === 'result' && result && (
                <SpotlightResult result={result} />
              )}
            </section>
          </div>
        )}
      </main>
    </>
  )
}

// 구조 유형별 설명
const STRUCTURE_DESC = {
  '질문형':       '시청자가 "왜?", "어떻게?"를 떠올리게 만드는 구조예요',
  '숫자·리스트형': '숫자가 들어간 제목은 구체적이어서 클릭률이 높아요',
  '감탄·강조형':  '강한 단어로 시청자의 감정을 바로 자극하는 구조예요',
  '정보·가이드형': '검색 유입에 유리하고 내용을 명확히 전달하는 구조예요',
  '비교·선택형':  '선택 고민이 있는 시청자에게 어필하는 구조예요',
  '일반형':       '클릭을 끌어당기는 뚜렷한 구조가 없어요',
}
const STRUCTURE_TIP = {
  '일반형': '숫자("5가지"), 질문("왜?"), 강조어("실화", "레전드")를 넣어보세요',
}

// 감정 트리거별 설명
const EMOTION_DESC = {
  '궁금증 유발형': '숨겨진 정보·비밀을 암시해 클릭을 끌어당기는 분위기예요',
  '경각심형':     '위험·주의 경고로 강한 주목을 끄는 분위기예요',
  '공감·감성형':  '시청자의 감정과 공감대를 자극하는 분위기예요',
  '기대·흥미형':  '놀라움과 기대감으로 클릭을 유도하는 분위기예요',
  '일반형':       '감정적 자극 요소가 뚜렷하지 않아요',
}
const EMOTION_TIP = {
  '일반형': '"왜", "비밀", "충격", "실제로" 같은 단어로 궁금증을 유발해보세요',
}

function SpotlightResult({ result }) {
  const { analysis: a, myTitle, myThumb, categoryId } = result
  const categoryName = CATEGORY_LABELS[categoryId] || categoryId

  const myTitleLen = myTitle.length
  const diff = myTitleLen - a.titleLengthAvg
  const absDiff = Math.abs(diff)

  const titleNote = useMemo(() => {
    if (diff === 0) return '인기 영상 평균과 딱 맞는 길이예요'
    if (diff > 10)  return `평균보다 ${diff}자 더 길어요 — 핵심 키워드 중심으로 줄여보세요`
    if (diff > 0)   return `평균보다 ${diff}자 더 길어요`
    if (diff < -8)  return `평균보다 ${absDiff}자 더 짧아요 — 키워드를 조금 더 구체화해보세요`
    return `평균보다 ${absDiff}자 더 짧아요`
  }, [diff, absDiff])

  const myStructure = useMemo(() => detectTitleStructure(myTitle), [myTitle])
  const myEmotion = useMemo(() => detectEmotionTrigger(myTitle), [myTitle])

  const timingStr = a.topTimings.length ? a.topTimings.join(', ') : '데이터 없음'
  const topStructPct = pct(a.structureCounts[a.topStructure] || 0, a.total)
  const topEmotPct = pct(a.emotionCounts[a.topEmotion] || 0, a.total)

  const structureMatch = myStructure === a.topStructure
  const structureNote = structureMatch
    ? `인기 영상과 같은 구조예요`
    : `인기 영상 ${topStructPct}%가 '${a.topStructure}'인데, 내 영상은 '${myStructure}'예요`

  const emotionMatch = myEmotion === a.topEmotion
  const emotionNote = emotionMatch
    ? `인기 영상과 같은 분위기예요`
    : `인기 영상 ${topEmotPct}%가 '${a.topEmotion}'인데, 내 영상은 '${myEmotion}'예요`

  const now = useMemo(() => 
    new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date()),
    []
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {categoryName} · 상위 20개 영상 기준
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>분석 시각: {now}</div>
      </div>

      <div className="compare-table">
        <div className="compare-table-header">
          <div className="table-col-head col-spotlight"><span aria-hidden="true">✦</span> 지금 인기 영상 패턴 (상위 20개)</div>
          <div className="table-col-head col-mine">내 영상</div>
        </div>

        {/* 제목 길이 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">제목 길이</div>
            <div className="cell-metric-value">평균 {a.titleLengthAvg}자</div>
            <div className="cell-metric-sub">분포 {a.titleLengthRange} · 주요 구간 {a.titleLengthPct70}</div>
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">제목 길이</div>
            <div className="cell-metric-value">{myTitleLen}자</div>
            <div className={`cell-metric-sub${diff === 0 ? ' match' : ''}`}>{titleNote}</div>
          </div>
        </div>

        {/* 제목 구조 유형 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">제목 구조 유형</div>
            <div className="cell-metric-value">{a.topStructure} {topStructPct}%</div>
            <BarChart counts={a.structureCounts} total={a.total} topN={3} />
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">제목 구조 유형</div>
            <div className="cell-metric-value">{myStructure}</div>
            <div className="cell-metric-sub">{STRUCTURE_DESC[myStructure]}</div>
            <div className={`cell-metric-sub${structureMatch ? ' match' : ' mismatch'}`} style={{ marginTop: 4 }}>
              {structureMatch ? '✓ ' : ''}{structureNote}
            </div>
            {STRUCTURE_TIP[myStructure] && (
              <div className="cell-metric-tip">→ {STRUCTURE_TIP[myStructure]}</div>
            )}
          </div>
        </div>

        {/* 감정 트리거 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">감정 트리거</div>
            <div className="cell-metric-value">{a.topEmotion} {topEmotPct}%</div>
            <BarChart counts={a.emotionCounts} total={a.total} topN={3} />
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">감정 트리거</div>
            <div className="cell-metric-value">{myEmotion}</div>
            <div className="cell-metric-sub">{EMOTION_DESC[myEmotion]}</div>
            <div className={`cell-metric-sub${emotionMatch ? ' match' : ' mismatch'}`} style={{ marginTop: 4 }}>
              {emotionMatch ? '✓ ' : ''}{emotionNote}
            </div>
            {EMOTION_TIP[myEmotion] && (
              <div className="cell-metric-tip">→ {EMOTION_TIP[myEmotion]}</div>
            )}
          </div>
        </div>

        {/* 썸네일 텍스트 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">썸네일 텍스트</div>
            <div className="cell-metric-value">평균 9자</div>
            <div className="cell-metric-sub">짧고 강렬한 텍스트가 주류</div>
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">썸네일 텍스트</div>
            {myThumb ? (
              <>
                <div className="cell-metric-value">{myThumb.length}자</div>
                <div className="cell-metric-sub">"{myThumb.slice(0, 20)}{myThumb.length > 20 ? '…' : ''}"</div>
                {myThumb.length > 15 && (
                  <div className="cell-metric-tip">→ 인기 영상 평균(9자)보다 길어요. 더 짧게 압축해보세요</div>
                )}
              </>
            ) : (
              <>
                <div className="cell-metric-value">미입력</div>
                <div className="cell-metric-sub">썸네일 텍스트를 입력하면 비교할 수 있어요</div>
              </>
            )}
          </div>
        </div>

        {/* 업로드 시간대 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">업로드 집중 시간대</div>
            <div className="cell-metric-value">{timingStr}</div>
            <div className="cell-metric-sub">인기 영상 {a.total}개 기준</div>
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">업로드 요일·시간</div>
            <div className="cell-metric-value">—</div>
            <div className="cell-metric-sub">다음 영상 업로드 시 참고해보세요</div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', padding: '0 4px' }}>
        데이터 출처: YouTube Data API v3 · 한국(KR) 기준 · 최근 7일 내 업로드된 영상
      </p>
    </div>
  )
}
