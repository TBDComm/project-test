import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { canUseFeature, getRemainingUses } from '../lib/plan'
import { incrementUsage } from '../lib/user'
import {
  detectTitleStructure, detectEmotionTrigger,
  getCached, setCache, isLongForm,
  STRUCTURE_DISPLAY, STRUCTURE_DESC, STRUCTURE_TIP,
  EMOTION_DISPLAY, EMOTION_DESC, EMOTION_TIP,
} from '../lib/youtube'

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

const LENGTH_BUCKETS = [
  { label: '~10자', min: 0, max: 10 },
  { label: '11~15자', min: 11, max: 15 },
  { label: '16~20자', min: 16, max: 20 },
  { label: '21~25자', min: 21, max: 25 },
  { label: '26~30자', min: 26, max: 30 },
  { label: '31자+', min: 31, max: Infinity },
]
const SPOTLIGHT_STATE_VERSION = 'v1'

function persistSpotlightState(storageKey, payload) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload))
    return
  } catch {
    // fall through
  }

  const lightPayload = {
    ...payload,
    result: payload.result
      ? {
          myTitle: payload.result.myTitle || '',
          myThumb: payload.result.myThumb || '',
          categoryId: payload.result.categoryId || '',
          contentType: payload.result.contentType === '숏폼' ? '숏폼' : '롱폼',
        }
      : null,
    status: payload.result ? 'result' : payload.status,
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(lightPayload))
  } catch {
    // ignore storage quota errors
  }
}

async function fetchTrendingVideos(categoryId, contentType) {
  const cacheKey = `spotlight_${categoryId}_${contentType}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  let videos

  if (contentType === '숏폼') {
    const url = `/api/youtube?_ep=search&part=snippet&regionCode=KR&type=video&videoCategoryId=${categoryId}&videoDuration=short&order=viewCount&maxResults=20`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || '데이터를 불러오지 못했습니다.')

    if (!data.items?.length) {
      // 카테고리 제한 없이 재시도
      const url2 = `/api/youtube?_ep=search&part=snippet&regionCode=KR&type=video&videoDuration=short&order=viewCount&maxResults=20`
      const res2 = await fetch(url2)
      const data2 = await res2.json()
      if (!data2.items?.length) throw new Error('숏폼 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      const ids2 = data2.items.map(i => i.id.videoId).join(',')
      const det2 = await fetch(`/api/youtube?_ep=videos&part=snippet,statistics&id=${encodeURIComponent(ids2)}`)
      const detData2 = await det2.json()
      videos = detData2.items || []
    } else {
      const ids = data.items.map(i => i.id.videoId).join(',')
      const det = await fetch(`/api/youtube?_ep=videos&part=snippet,statistics&id=${encodeURIComponent(ids)}`)
      const detData = await det.json()
      videos = detData.items || []
    }
  } else {
    // 롱폼: mostPopular 차트, contentDetails로 필터링
    const url = `/api/youtube?_ep=videos&part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=KR&videoCategoryId=${categoryId}&maxResults=50`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || '데이터를 불러오지 못했습니다.')

    const all = data.items || []
    const long = all.filter(v => isLongForm(v.contentDetails?.duration))
    videos = (long.length >= 5 ? long : all).slice(0, 20)

    if (!videos.length) {
      const url2 = `/api/youtube?_ep=videos&part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=KR&maxResults=20`
      const res2 = await fetch(url2)
      const data2 = await res2.json()
      if (!data2.items?.length) throw new Error('데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.')
      videos = data2.items
    }
  }

  setCache(cacheKey, videos)
  return videos
}

function analyzeVideos(videos) {
  const titles = videos.map(v => v.snippet?.title || '')
  const publishedAts = videos.map(v => v.snippet?.publishedAt || '')

  const lengths = titles.map(t => t.length).filter(l => l > 0)
  const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1))
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
  const dayDist = {}
  publishedAts.forEach(iso => {
    if (!iso) return
    const d = new Date(iso)
    const kstHour = (d.getUTCHours() + 9) % 24
    const dayIndex = d.getDay()
    const dayName = DAYS[dayIndex]
    const key = `${dayName}요일 ${kstHour}시`
    dayHourCounts[key] = (dayHourCounts[key] || 0) + 1
    dayDist[dayIndex] = (dayDist[dayIndex] || 0) + 1
  })

  const topTimings = Object.entries(dayHourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)

  const topByCount = (counts) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  return {
    titleLengthAvg: avgLen,
    titleLengthRange: `${minLen}~${maxLen}자`,
    lengths,
    structureCounts,
    emotionCounts,
    topStructure: topByCount(structureCounts),
    topEmotion: topByCount(emotionCounts),
    topTimings,
    dayDist,
    total: videos.length,
  }
}

function pct(count, total) {
  return Math.round((count / total) * 100)
}

function BarChart({ counts, total, topN = 3, displayMap = {} }) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, topN)
  return (
    <div className="metric-bar">
      {sorted.map(([key, count]) => {
        const p = pct(count, total)
        return (
          <div className="metric-bar-item" key={key}>
            <span className="metric-bar-label">{displayMap[key] || key}</span>
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

function LengthHistogram({ lengths, myLength }) {
  const counts = LENGTH_BUCKETS.map(b => lengths.filter(l => l >= b.min && l <= b.max).length)
  const maxCount = Math.max(...counts, 1)
  const myBucketIdx = LENGTH_BUCKETS.findIndex(b => myLength >= b.min && myLength <= b.max)

  return (
    <div className="len-histogram" role="img" aria-label="제목 길이 분포 그래프">
      {LENGTH_BUCKETS.map((b, i) => {
        const fillPct = Math.round((counts[i] / maxCount) * 100)
        const isMe = i === myBucketIdx
        return (
          <div key={b.label} className="len-histo-col">
            <div className="len-histo-marker-row">
              {isMe && <span className="len-histo-marker" aria-label="내 영상 위치">▼</span>}
            </div>
            <div className="len-histo-bar-track">
              <div
                className={`len-histo-bar-fill${isMe ? ' me' : ''}`}
                style={{ height: `${fillPct}%` }}
              />
            </div>
            <div className={`len-histo-label${isMe ? ' me' : ''}`}>{b.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function DayBars({ dayDist }) {
  const dayMax = Math.max(...Object.values(dayDist), 1)
  return (
    <div className="day-bars-compact" role="img" aria-label="요일별 업로드 분포">
      {DAYS.map((day, i) => {
        const count = dayDist[i] || 0
        const fillPct = Math.round((count / dayMax) * 100)
        const isTop = count === dayMax && count > 0
        return (
          <div key={day} className="day-bar-compact-item">
            <div className="day-bar-compact-track">
              <div
                className={`day-bar-compact-fill${isTop ? ' top' : ''}`}
                style={{ height: `${fillPct}%` }}
              />
            </div>
            <div className={`day-bar-compact-label${isTop ? ' top' : ''}`}>{day}</div>
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
  const [contentType, setContentType] = useState('롱폼')
  const [status, setStatus] = useState('empty')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const [localUserData, setLocalUserData] = useState(userData)
  const spotlightStorageKey = useMemo(
    () => `momento_spotlight_state_${SPOTLIGHT_STATE_VERSION}_${user?.id || 'guest'}`,
    [user?.id]
  )
  const [spotlightHydrated, setSpotlightHydrated] = useState(false)

  useEffect(() => {
    if (userData !== null && localUserData === null) {
      setLocalUserData(userData)
    }
  }, [userData, localUserData])

  useEffect(() => {
    if (!user?.id) return
    try {
      const raw = localStorage.getItem(spotlightStorageKey)
      if (!raw) {
        setSpotlightHydrated(true)
        return
      }
      const saved = JSON.parse(raw)
      setVideoTitle(typeof saved.videoTitle === 'string' ? saved.videoTitle : '')
      setThumbnailText(typeof saved.thumbnailText === 'string' ? saved.thumbnailText : '')
      setCategory(typeof saved.category === 'string' ? saved.category : '')
      setContentType(saved.contentType === '숏폼' ? '숏폼' : '롱폼')
      const hydratedResult = saved.result?.analysis ? saved.result : null
      setResult(hydratedResult)
      setErrorMsg(typeof saved.errorMsg === 'string' ? saved.errorMsg : '')
      setStatus(hydratedResult ? 'result' : (saved.status === 'error' ? 'error' : 'empty'))
    } catch {
      // ignore invalid persisted state
    } finally {
      setSpotlightHydrated(true)
    }
  }, [spotlightStorageKey, user?.id])

  useEffect(() => {
    if (!spotlightHydrated || !user?.id || status === 'loading') return
    const payload = {
      videoTitle,
      thumbnailText,
      category,
      contentType,
      status,
      errorMsg,
      result,
    }
    persistSpotlightState(spotlightStorageKey, payload)
  }, [spotlightHydrated, spotlightStorageKey, user?.id, videoTitle, thumbnailText, category, contentType, status, errorMsg, result])

  const isDirty = status !== 'empty' || videoTitle !== '' || thumbnailText !== '' || category !== ''

  const handleClearAll = () => {
    setVideoTitle('')
    setThumbnailText('')
    setCategory('')
    setContentType('롱폼')
    setStatus('empty')
    setErrorMsg('')
    setResult(null)
    try { localStorage.removeItem(spotlightStorageKey) } catch { /* ignore */ }
  }

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
      const videos = await fetchTrendingVideos(category, contentType)
      const analysis = analyzeVideos(videos)

      if (!localUserData?.isAdmin && localUserData?.plan === 'free') {
        await incrementUsage(user.id)
        const updated = { ...localUserData, monthlyUsage: (localUserData.monthlyUsage || 0) + 1 }
        setLocalUserData(updated)
        if (setUserData) setUserData(updated)
      }

      setResult({ analysis, myTitle: videoTitle.trim(), myThumb: thumbnailText.trim(), categoryId: category, contentType })
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 className="input-panel-title" style={{ marginBottom: 0 }}>내 영상 정보 입력</h2>
                {isDirty && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleClearAll}
                    aria-label="입력 내용 및 분석 결과 전체 초기화"
                    style={{ touchAction: 'manipulation', flexShrink: 0 }}
                  >
                    전체 초기화
                  </button>
                )}
              </div>
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

                <div className="form-group">
                  <span className="form-label" id="content-type-label">콘텐츠 유형</span>
                  <div className="content-type-toggle" role="group" aria-labelledby="content-type-label">
                    {['롱폼', '숏폼'].map(type => (
                      <button
                        key={type}
                        type="button"
                        className={`content-type-btn${contentType === type ? ' active' : ''}`}
                        onClick={() => setContentType(type)}
                        aria-pressed={contentType === type}
                      >
                        {type === '롱폼' ? '롱폼 (일반 영상)' : '숏폼 (Shorts)'}
                      </button>
                    ))}
                  </div>
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

            <section id="result-panel" aria-live="polite" aria-busy={status === 'loading'}>
              {status === 'empty' && (
                <div className="empty-state" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
                  <div className="empty-icon" aria-hidden="true">✦</div>
                  <div className="empty-title">분석{"\u00A0"}결과가{"\u00A0"}여기에{"\u00A0"}표시됩니다</div>
                  <div className="empty-desc">왼쪽에{"\u00A0"}영상{"\u00A0"}정보를{"\u00A0"}입력하고 비교{"\u00A0"}분석을{"\u00A0"}시작하세요.</div>
                </div>
              )}

              {status === 'loading' && (
                <div className="result-loading" role="status" aria-live="polite" aria-busy="true">
                  <div className="spinner" />
                  <span>유튜브 트렌드 데이터를 가져오는 중…</span>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>최대 10초가 소요될 수 있습니다.</span>
                </div>
              )}

              {status === 'error' && (
                <div className="alert alert-error" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }} role="alert" aria-live="assertive">
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

function SpotlightResult({ result }) {
  const { analysis: a, myTitle, myThumb, categoryId, contentType } = result
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

  const topStructPct = pct(a.structureCounts[a.topStructure] || 0, a.total)
  const topEmotPct = pct(a.emotionCounts[a.topEmotion] || 0, a.total)

  const structureMatch = myStructure === a.topStructure
  const structureNote = structureMatch
    ? '인기 영상들과 같은 제목 구조예요'
    : `인기 영상 ${topStructPct}%가 사용하는 구조와 다른 방향이에요`

  const emotionMatch = myEmotion === a.topEmotion
  const emotionNote = emotionMatch
    ? '인기 영상들과 같은 분위기예요'
    : `인기 영상 ${topEmotPct}%가 사용하는 분위기와 다른 방향이에요`

  const now = useMemo(() =>
    new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date()),
    []
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{categoryName} · 상위 20개 기준</span>
          <span className="content-type-badge">{contentType}</span>
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
            <div className="cell-metric-sub">분포 {a.titleLengthRange}</div>
            <LengthHistogram lengths={a.lengths} myLength={myTitleLen} />
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">제목 길이</div>
            <div className="cell-metric-value">{myTitleLen}자</div>
            <div className={`cell-metric-sub${diff === 0 ? ' match' : ''}`}>{titleNote}</div>
          </div>
        </div>

        {/* 제목 구조 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">제목 구조</div>
            <div className="cell-metric-value">{STRUCTURE_DISPLAY[a.topStructure]} {topStructPct}%</div>
            <BarChart counts={a.structureCounts} total={a.total} topN={3} displayMap={STRUCTURE_DISPLAY} />
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">제목 구조</div>
            <div className="cell-metric-value">{STRUCTURE_DISPLAY[myStructure]}</div>
            <div className="cell-metric-sub">{STRUCTURE_DESC[myStructure]}</div>
            <div className={`cell-metric-sub${structureMatch ? ' match' : ''}`} style={{ marginTop: 6 }}>
              {structureMatch ? '✓\u00A0' : ''}{structureNote}
            </div>
            {STRUCTURE_TIP[myStructure] && (
              <div className="cell-metric-tip">→ {STRUCTURE_TIP[myStructure]}</div>
            )}
          </div>
        </div>

        {/* 감정 분위기 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">감정 분위기</div>
            <div className="cell-metric-value">{EMOTION_DISPLAY[a.topEmotion]} {topEmotPct}%</div>
            <BarChart counts={a.emotionCounts} total={a.total} topN={3} displayMap={EMOTION_DISPLAY} />
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">감정 분위기</div>
            <div className="cell-metric-value">{EMOTION_DISPLAY[myEmotion]}</div>
            <div className="cell-metric-sub">{EMOTION_DESC[myEmotion]}</div>
            <div className={`cell-metric-sub${emotionMatch ? ' match' : ''}`} style={{ marginTop: 6 }}>
              {emotionMatch ? '✓\u00A0' : ''}{emotionNote}
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
                  <div className="cell-metric-tip">→ 인기 영상 평균(9자)보다 길어요. 더 짧게 압축해보세요.</div>
                )}
              </>
            ) : (
              <>
                <div className="cell-metric-value">미입력</div>
                <div className="cell-metric-sub">썸네일 텍스트를 입력하면 비교할 수 있어요.</div>
              </>
            )}
          </div>
        </div>

        {/* 업로드 시간대 */}
        <div className="table-row">
          <div className="table-cell cell-spotlight">
            <div className="cell-metric-name">업로드 집중 시간대</div>
            {a.topTimings.length > 0 && (
              <div className="cell-metric-value">{a.topTimings[0]}</div>
            )}
            {Object.keys(a.dayDist).length > 0 && <DayBars dayDist={a.dayDist} />}
            {a.topTimings.length > 1 && (
              <div className="cell-metric-sub">{a.topTimings.slice(1).join(' · ')} 순</div>
            )}
            <div className="cell-metric-sub" style={{ marginTop: 4, fontSize: 12 }}>KST 기준</div>
          </div>
          <div className="table-cell">
            <div className="cell-metric-name">업로드 요일·시간</div>
            <div className="cell-metric-value" style={{ color: 'var(--text-2)' }}>—</div>
            <div className="cell-metric-sub">왼쪽 인기 영상의 집중 시간대를 참고해서 다음 업로드 시 활용해보세요.</div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', padding: '0 4px' }}>
        데이터 출처: YouTube Data API v3 · 한국(KR) 기준 · 최근 7일 내 업로드된 영상
      </p>
    </div>
  )
}
