import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { canUseFeature } from '../lib/plan'
import {
  detectTitleStructure, detectEmotionTrigger,
  getCached, setCache, isLongForm,
  STRUCTURE_DISPLAY, EMOTION_DISPLAY,
} from '../lib/youtube'
import { formatNumber } from '../lib/format'

// ─── 상수 ───────────────────────────────────────────────────
const CATEGORY_LABELS = {
  '22': '브이로그', '20': '게임', '27': '교육',
  '24': '엔터테인먼트', '10': '음악', '26': '뷰티/패션',
  '28': '테크/IT', '17': '스포츠',
}

// ─── 채널 URL 파싱 ───────────────────────────────────────────
function parseChannelInput(raw) {
  const s = raw.trim()
  if (!s) return null

  if (/^UC[\w-]{22}$/.test(s)) return { type: 'id', value: s }
  if (/^@[\w.-]+$/.test(s)) return { type: 'handle', value: s.slice(1) }

  try {
    const urlStr = s.includes('://') ? s : 'https://' + s
    const url = new URL(urlStr)
    if (url.pathname.startsWith('/@')) {
      const handle = url.pathname.slice(2).split('/')[0]
      if (handle) return { type: 'handle', value: handle }
    }
    const channelMatch = url.pathname.match(/\/channel\/(UC[\w-]{22})/)
    if (channelMatch) return { type: 'id', value: channelMatch[1] }
    const legacyMatch = url.pathname.match(/\/(c|user)\/([^/]+)/)
    if (legacyMatch) return { type: 'username', value: legacyMatch[2] }
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length === 1) return { type: 'handle', value: parts[0] }
  } catch { /* ignore */ }

  const clean = s.replace(/^@/, '')
  if (clean) return { type: 'handle', value: clean }
  return null
}

// ─── API 호출 ───────────────────────────────────────────────
async function fetchChannelInfo(parsed) {
  let params = 'part=snippet,statistics'
  if (parsed.type === 'id') {
    params += `&id=${encodeURIComponent(parsed.value)}`
  } else if (parsed.type === 'handle') {
    params += `&forHandle=${encodeURIComponent('@' + parsed.value)}`
  } else {
    params += `&forUsername=${encodeURIComponent(parsed.value)}`
  }

  const res = await fetch(`/api/youtube?_ep=channels&${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || '채널 정보를 불러오지 못했습니다.')
  if (!data.items?.length) throw new Error('채널을 찾을 수 없습니다. URL이나 핸들(@)을 확인해주세요.')
  return data.items[0]
}

async function fetchRecentVideos(channelId) {
  const cacheKey = `ch_videos_${channelId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const searchRes = await fetch(
    `/api/youtube?_ep=search&part=snippet&channelId=${encodeURIComponent(channelId)}&order=date&type=video&maxResults=15`
  )
  const searchData = await searchRes.json()
  if (searchData.error) throw new Error(searchData.error.message || '영상 목록을 불러오지 못했습니다.')

  const ids = (searchData.items || []).map(i => i.id?.videoId).filter(Boolean)
  if (!ids.length) return []

  const detailRes = await fetch(
    `/api/youtube?_ep=videos&part=snippet,statistics,contentDetails&id=${encodeURIComponent(ids.join(','))}`
  )
  const detailData = await detailRes.json()
  const videos = detailData.items || []

  setCache(cacheKey, videos)
  return videos
}

async function fetchTrendingForCategory(categoryId) {
  const cacheKey = `ch_trending_${categoryId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const res = await fetch(
    `/api/youtube?_ep=videos&part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=KR&videoCategoryId=${categoryId}&maxResults=30`
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || '트렌드 데이터를 불러오지 못했습니다.')

  const all = data.items || []
  const long = all.filter(v => isLongForm(v.contentDetails?.duration))
  const videos = (long.length >= 5 ? long : all).slice(0, 20)

  setCache(cacheKey, videos)
  return videos
}

// ─── 트렌드 분석 ─────────────────────────────────────────────
function analyzeTrending(videos) {
  const titles = videos.map(v => v.snippet?.title || '').filter(Boolean)
  const lengths = titles.map(t => t.length)
  const total = titles.length || 1
  const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / total)
  const minLen = Math.min(...lengths)
  const maxLen = Math.max(...lengths)

  const structureCounts = {}
  const emotionCounts = {}
  titles.forEach(t => {
    const s = detectTitleStructure(t)
    const e = detectEmotionTrigger(t)
    structureCounts[s] = (structureCounts[s] || 0) + 1
    emotionCounts[e] = (emotionCounts[e] || 0) + 1
  })

  const topKey = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || '일반형'

  return {
    titleLengthAvg: avgLen,
    titleLengthMin: minLen,
    titleLengthMax: maxLen,
    structureCounts,
    emotionCounts,
    topStructure: topKey(structureCounts),
    topEmotion: topKey(emotionCounts),
    total,
  }
}

// ─── 영상별 갭 데이터 (점수 없음, 원시 데이터만) ────────────
function computeVideoGaps(video, trendAnalysis) {
  const title = video.snippet?.title || ''
  const myLen = title.length
  const myStructure = detectTitleStructure(title)
  const myEmotion = detectEmotionTrigger(title)

  const structureTrendPct = Math.round(
    ((trendAnalysis.structureCounts[myStructure] || 0) / trendAnalysis.total) * 100
  )
  const emotionTrendPct = Math.round(
    ((trendAnalysis.emotionCounts[myEmotion] || 0) / trendAnalysis.total) * 100
  )

  return {
    titleLength: myLen,
    lengthDiff: myLen - trendAnalysis.titleLengthAvg,
    myStructure,
    myEmotion,
    structureTrendPct,   // 트렌드에서 내 구조가 차지하는 비율
    emotionTrendPct,     // 트렌드에서 내 감정 유형이 차지하는 비율
  }
}

// ─── 채널 전체 관찰 (처방 없는 사실 서술만) ─────────────────
function generateObservations(analyzedVideos, trendAnalysis) {
  const observations = []

  // 제목 길이 갭
  const avgMyLen = Math.round(
    analyzedVideos.reduce((a, v) => a + v.gaps.titleLength, 0) / (analyzedVideos.length || 1)
  )
  const avgDiff = avgMyLen - trendAnalysis.titleLengthAvg
  if (Math.abs(avgDiff) >= 2) {
    const dir = avgDiff > 0 ? '더 깁니다' : '더 짧습니다'
    observations.push(
      `최근 ${analyzedVideos.length}개 영상 제목 평균은 ${avgMyLen}자입니다. 트렌드 상위 영상 평균(${trendAnalysis.titleLengthAvg}자)보다 ${Math.abs(avgDiff)}자 ${dir}.`
    )
  } else {
    observations.push(
      `최근 ${analyzedVideos.length}개 영상 제목 평균(${avgMyLen}자)이 트렌드 상위 영상 평균(${trendAnalysis.titleLengthAvg}자)과 비슷한 범위에 있습니다.`
    )
  }

  // 제목 구조 분포
  const myStructCounts = {}
  analyzedVideos.forEach(v => {
    myStructCounts[v.gaps.myStructure] = (myStructCounts[v.gaps.myStructure] || 0) + 1
  })
  const myTopStruct = Object.entries(myStructCounts).sort((a, b) => b[1] - a[1])[0]
  const myTopStructPct = Math.round((myTopStruct[1] / analyzedVideos.length) * 100)
  const trendTopStructPct = Math.round(
    ((trendAnalysis.structureCounts[trendAnalysis.topStructure] || 0) / trendAnalysis.total) * 100
  )
  observations.push(
    `내 채널 주요 제목 구조는 ${STRUCTURE_DISPLAY[myTopStruct[0]]}(${myTopStructPct}%)입니다. 트렌드 상위에서는 ${STRUCTURE_DISPLAY[trendAnalysis.topStructure]}(${trendTopStructPct}%)가 가장 많습니다.`
  )

  // 제목 길이 추이 (최근 vs 이전)
  if (analyzedVideos.length >= 6) {
    const half = Math.floor(analyzedVideos.length / 2)
    // analyzedVideos는 최신순(index 0 = 최신)이므로 newer = 앞쪽
    const newerAvg = Math.round(
      analyzedVideos.slice(0, half).reduce((a, v) => a + v.gaps.titleLength, 0) / half
    )
    const olderAvg = Math.round(
      analyzedVideos.slice(-half).reduce((a, v) => a + v.gaps.titleLength, 0) / half
    )
    const diff = newerAvg - olderAvg
    if (Math.abs(diff) >= 3) {
      const dir = diff > 0 ? '길어지는' : '짧아지는'
      observations.push(
        `최근 영상의 제목 길이가 이전보다 ${dir} 추세입니다. 최근 ${half}개 평균 ${newerAvg}자, 이전 ${half}개 평균 ${olderAvg}자.`
      )
    }
  }

  // 샘플 사이즈 안내
  if (analyzedVideos.length < 10) {
    observations.push(
      `분석된 영상이 ${analyzedVideos.length}개입니다. 공개 영상이 더 많을 경우 더 많은 패턴을 확인할 수 있습니다.`
    )
  }

  return observations.slice(0, 4)
}

// ─── 숫자 강조 헬퍼 ─────────────────────────────────────────
// 텍스트 내 숫자(+단위)를 브랜드 강조색으로 렌더링
function Highlight({ text }) {
  const parts = text.split(/(\d+(?:\.\d+)?[자개명%]?)/g)
  return (
    <>
      {parts.map((part, i) =>
        /^\d/.test(part)
          ? <strong key={i} className="ch-obs-num">{part}</strong>
          : part
      )}
    </>
  )
}

// ─── 저장된 채널 키 ──────────────────────────────────────────
const savedChannelKey = (uid) => `momento_saved_channel_${uid}`

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function Channel() {
  const { user, userData } = useAuth()
  const canUse = canUseFeature(userData, 'channelAnalysis')

  const [input, setInput] = useState('')
  const [status, setStatus] = useState('empty')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const [savedChannel, setSavedChannel] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    try {
      const raw = localStorage.getItem(savedChannelKey(user.id))
      if (raw) setSavedChannel(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [user?.id])

  const saveChannel = useCallback((channelId, title, avatar, handle) => {
    if (!user?.id) return
    const data = { channelId, title, avatar, handle, lastAnalyzed: new Date().toISOString() }
    setSavedChannel(data)
    try { localStorage.setItem(savedChannelKey(user.id), JSON.stringify(data)) } catch { /* ignore */ }
  }, [user?.id])

  const handleAnalyze = useCallback(async (overrideInput) => {
    const raw = overrideInput ?? input
    const parsed = parseChannelInput(raw)
    if (!parsed) {
      alert('채널 URL, 핸들(@handle), 또는 채널 ID를 입력해주세요.')
      return
    }

    setStatus('loading')
    setErrorMsg('')
    setResult(null)

    try {
      const channel = await fetchChannelInfo(parsed)
      const channelId = channel.id

      const videos = await fetchRecentVideos(channelId)
      if (!videos.length) throw new Error('분석할 영상이 없습니다. 공개된 영상이 있는 채널을 입력해주세요.')

      // 카테고리별 트렌드 데이터 (최대 3개)
      const categoryCounts = {}
      videos.forEach(v => {
        const cid = v.snippet?.categoryId || '24'
        categoryCounts[cid] = (categoryCounts[cid] || 0) + 1
      })
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cid]) => cid)

      const trendMap = {}
      await Promise.all(
        topCategories.map(async (cid) => {
          const tVideos = await fetchTrendingForCategory(cid)
          trendMap[cid] = analyzeTrending(tVideos)
        })
      )

      const dominantCategory = topCategories[0]
      const analyzedVideos = videos.map(v => {
        const cid = v.snippet?.categoryId || dominantCategory
        const trendAnalysis = trendMap[cid] || trendMap[dominantCategory]
        return {
          video: v,
          gaps: computeVideoGaps(v, trendAnalysis),
          categoryId: cid,
        }
      })

      const handle = channel.snippet?.customUrl || ''
      const avatar = channel.snippet?.thumbnails?.default?.url || ''
      saveChannel(channelId, channel.snippet?.title || '', avatar, handle)

      setResult({
        channel,
        analyzedVideos,
        trendAnalysis: trendMap[dominantCategory],
        categoryId: dominantCategory,
      })
      setStatus('result')
    } catch (e) {
      setErrorMsg(e.message || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setStatus('error')
    }
  }, [input, saveChannel])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  const now = useMemo(
    () => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date()),
    []
  )

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="app-main" id="main-content">
        <div className="page-header">
          <h1 className="page-title">◈ 채널 분석</h1>
          <p className="page-desc">내 채널 최근 영상들의 패턴이 지금 트렌드 상위 영상들과 어떻게 다른지 확인합니다.</p>
        </div>

        {userData === null ? (
          <div className="loading-overlay">
            <div className="spinner" />
            <span>잠시만 기다려주세요…</span>
          </div>
        ) : !canUse ? (
          <UpgradePrompt />
        ) : (
          <div className="channel-page-wrap">
            <div className="channel-input-section">
              <div className="channel-input-row">
                <label htmlFor="channel-url" className="visually-hidden">채널 URL 또는 핸들</label>
                <input
                  id="channel-url"
                  name="channel-url"
                  type="url"
                  className="form-input channel-url-input"
                  placeholder="@handle 또는 youtube.com/@ 주소를 입력하세요…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="url"
                  spellCheck="false"
                  disabled={status === 'loading'}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAnalyze()}
                  disabled={status === 'loading' || !input.trim()}
                  style={{ flexShrink: 0 }}
                >
                  {status === 'loading' ? '분석\u00A0중…' : '채널\u00A0분석'}
                </button>
              </div>

              {savedChannel && status !== 'loading' && (
                <div className="saved-channel-bar">
                  <span className="saved-channel-label">최근 분석:</span>
                  {savedChannel.avatar && (
                    <img
                      src={savedChannel.avatar}
                      alt=""
                      className="saved-channel-avatar"
                      aria-hidden="true"
                      width="20"
                      height="20"
                    />
                  )}
                  <span className="saved-channel-name">{savedChannel.title}</span>
                  <span className="saved-channel-time">
                    {new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(savedChannel.lastAnalyzed))}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleAnalyze(savedChannel.channelId)}
                    aria-label={`${savedChannel.title} 채널 다시 분석`}
                  >
                    다시 분석
                  </button>
                </div>
              )}

              <p className="channel-input-hint">
                예: <code>@channelhandle</code> · <code>youtube.com/@handle</code> · <code>youtube.com/channel/UC…</code>
              </p>
            </div>

            {status === 'loading' && (
              <div className="result-loading" role="status" aria-live="polite" aria-busy="true">
                <div className="spinner" />
                <span>채널 영상을 불러오는 중…</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>최대 15초가 소요될 수 있습니다.</span>
              </div>
            )}

            {status === 'error' && (
              <div className="alert alert-error" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }} role="alert" aria-live="assertive">
                <span aria-hidden="true">✕</span>
                <div>{errorMsg}</div>
              </div>
            )}

            {status === 'result' && result && (
              <ChannelResult result={result} now={now} />
            )}
          </div>
        )}
      </main>
    </>
  )
}

// ─── 업그레이드 안내 ─────────────────────────────────────────
function UpgradePrompt() {
  return (
    <div className="upgrade-prompt">
      <div className="up-icon" aria-hidden="true">◈</div>
      <h2 className="up-title">채널 분석은 STARTER 플랜부터 사용할 수 있습니다</h2>
      <p className="up-desc">
        내 채널 최근 영상들의 패턴과 지금 트렌드 상위 영상의 패턴을 나란히 확인하세요.<br />
        제목 길이, 구조, 감정 분위기가 트렌드와 어떻게 다른지 영상별로 볼 수 있습니다.
      </p>
      <Link to="/pricing" className="btn btn-primary btn-lg">플랜 업그레이드하기</Link>
    </div>
  )
}

// ─── 채널 결과 ───────────────────────────────────────────────
function ChannelResult({ result, now }) {
  const { channel, analyzedVideos, trendAnalysis, categoryId } = result

  const channelTitle = channel.snippet?.title || ''
  const channelAvatar = channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url || ''
  const channelHandle = channel.snippet?.customUrl || ''
  const subsRaw = parseInt(channel.statistics?.subscriberCount || '0')
  const videoCountRaw = parseInt(channel.statistics?.videoCount || '0')
  const categoryName = CATEGORY_LABELS[categoryId] || '기타'

  const subsFormatted = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(subsRaw)
  const videoCountFormatted = new Intl.NumberFormat('ko-KR').format(videoCountRaw)

  const observations = useMemo(
    () => generateObservations(analyzedVideos, trendAnalysis),
    [analyzedVideos, trendAnalysis]
  )

  // 채널 평균 계산
  const channelAvgLen = Math.round(
    analyzedVideos.reduce((a, v) => a + v.gaps.titleLength, 0) / (analyzedVideos.length || 1)
  )

  // 주요 구조 집계
  const myStructCounts = {}
  analyzedVideos.forEach(v => {
    myStructCounts[v.gaps.myStructure] = (myStructCounts[v.gaps.myStructure] || 0) + 1
  })
  const myTopStruct = Object.entries(myStructCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '일반형'
  const myTopStructPct = Math.round(((myStructCounts[myTopStruct] || 0) / analyzedVideos.length) * 100)

  const myEmotCounts = {}
  analyzedVideos.forEach(v => {
    myEmotCounts[v.gaps.myEmotion] = (myEmotCounts[v.gaps.myEmotion] || 0) + 1
  })
  const myTopEmot = Object.entries(myEmotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '일반형'
  const myTopEmotPct = Math.round(((myEmotCounts[myTopEmot] || 0) / analyzedVideos.length) * 100)

  const trendTopStructPct = Math.round(
    ((trendAnalysis.structureCounts[trendAnalysis.topStructure] || 0) / trendAnalysis.total) * 100
  )
  const trendTopEmotPct = Math.round(
    ((trendAnalysis.emotionCounts[trendAnalysis.topEmotion] || 0) / trendAnalysis.total) * 100
  )

  return (
    <div className="channel-result fade-in-up">
      {/* 채널 헤더 */}
      <div className="channel-header-card">
        <div className="channel-header-inner">
          {channelAvatar ? (
            <img
              src={channelAvatar}
              alt=""
              className="channel-avatar"
              aria-hidden="true"
              width="56"
              height="56"
              loading="lazy"
            />
          ) : (
            <div className="channel-avatar-placeholder" aria-hidden="true">
              {channelTitle[0] || 'C'}
            </div>
          )}
          <div className="channel-meta">
            <h2 className="channel-title-text">{channelTitle}</h2>
            <div className="channel-meta-row">
              {channelHandle && <span className="channel-handle">{channelHandle}</span>}
              {subsRaw > 0 && <span>구독자 {subsFormatted}명</span>}
              {videoCountRaw > 0 && <span>영상 {videoCountFormatted}개</span>}
            </div>
          </div>
          <a
            href={`https://www.youtube.com/${channelHandle || 'channel/' + channel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm channel-yt-link"
            aria-label={`${channelTitle} 유튜브 채널 열기`}
          >
            YouTube에서 보기
          </a>
        </div>
      </div>

      {/* 패턴 비교 요약 테이블 */}
      <div className="ch-section">
        <h3 className="ch-section-title">패턴 비교 — 내 채널 vs 트렌드 상위</h3>
        <p className="ch-section-desc">
          최근 {analyzedVideos.length}개 영상 기준 · 주요 카테고리: {categoryName} · {now} 분석
        </p>

        <div className="ch-compare-table" role="table" aria-label="채널 패턴과 트렌드 비교">
          <div className="ch-compare-head" role="row">
            <div role="columnheader">항목</div>
            <div role="columnheader">내 채널 (최근 {analyzedVideos.length}개)</div>
            <div role="columnheader">트렌드 상위 ({trendAnalysis.total}개)</div>
          </div>

          <div className="ch-compare-row" role="row">
            <div className="ch-compare-label" role="cell">제목 길이 평균</div>
            <div className="ch-compare-mine" role="cell">
              <span className="ch-compare-value">{channelAvgLen}자</span>
            </div>
            <div className="ch-compare-trend" role="cell">
              <span className="ch-compare-value">{trendAnalysis.titleLengthAvg}자</span>
              <span className="ch-compare-sub">{trendAnalysis.titleLengthMin}~{trendAnalysis.titleLengthMax}자 범위</span>
            </div>
          </div>

          <div className="ch-compare-row" role="row">
            <div className="ch-compare-label" role="cell">주요 제목 구조</div>
            <div className="ch-compare-mine" role="cell">
              <span className="ch-compare-value">{STRUCTURE_DISPLAY[myTopStruct]}</span>
              <span className="ch-compare-sub">{myTopStructPct}% 비율</span>
            </div>
            <div className="ch-compare-trend" role="cell">
              <span className="ch-compare-value">{STRUCTURE_DISPLAY[trendAnalysis.topStructure]}</span>
              <span className="ch-compare-sub">{trendTopStructPct}% 비율</span>
            </div>
          </div>

          <div className="ch-compare-row" role="row">
            <div className="ch-compare-label" role="cell">주요 감정 분위기</div>
            <div className="ch-compare-mine" role="cell">
              <span className="ch-compare-value">{EMOTION_DISPLAY[myTopEmot]}</span>
              <span className="ch-compare-sub">{myTopEmotPct}% 비율</span>
            </div>
            <div className="ch-compare-trend" role="cell">
              <span className="ch-compare-value">{EMOTION_DISPLAY[trendAnalysis.topEmotion]}</span>
              <span className="ch-compare-sub">{trendTopEmotPct}% 비율</span>
            </div>
          </div>
        </div>
      </div>

      {/* 제목 길이 추이 차트 */}
      <div className="ch-section">
        <h3 className="ch-section-title">제목 길이 추이</h3>
        <p className="ch-section-desc">
          최신 영상(왼쪽) → 과거 영상(오른쪽) 순서 · 점선: 트렌드 상위 평균({trendAnalysis.titleLengthAvg}자)
        </p>
        <TitleLengthChart analyzedVideos={analyzedVideos} trendAvg={trendAnalysis.titleLengthAvg} />
      </div>

      {/* 영상별 상세 + 관찰 */}
      <div className="ch-body-grid">
        <div className="ch-section">
          <h3 className="ch-section-title">영상별 패턴</h3>
          <ol className="video-pattern-list" aria-label="영상별 제목 패턴 목록">
            {analyzedVideos.map(({ video, gaps }) => {
              const vid = video.id || ''
              const title = video.snippet?.title || '제목 없음'
              const publishedAt = video.snippet?.publishedAt
              const viewCount = parseInt(video.statistics?.viewCount || '0')
              const dateStr = publishedAt
                ? new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(publishedAt))
                : ''

              return (
                <li key={vid} className="video-pattern-item">
                  <div className="video-pattern-len" aria-label={`제목 길이 ${gaps.titleLength}자`}>
                    <span className="video-pattern-len-num">{gaps.titleLength}</span>
                    <span className="video-pattern-len-unit">자</span>
                  </div>
                  <div className="video-pattern-info">
                    <a
                      href={`https://www.youtube.com/watch?v=${vid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="video-pattern-title"
                      aria-label={`${title} — YouTube에서 보기`}
                    >
                      {title}
                    </a>
                    <div className="video-pattern-meta">
                      {dateStr && <span>{dateStr}</span>}
                      {viewCount > 0 && <span>조회 {formatNumber(viewCount)}</span>}
                      <span>{STRUCTURE_DISPLAY[gaps.myStructure]}</span>
                      <span>{EMOTION_DISPLAY[gaps.myEmotion]}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="ch-section">
          <h3 className="ch-section-title">관찰된 패턴</h3>
          <ul className="ch-observation-list" aria-label="채널 패턴 관찰 내용">
            {observations.map((obs, i) => (
              <li key={i} className="ch-observation-item">
                <span className="ch-obs-bullet" aria-hidden="true">—</span>
                <p className="ch-obs-text"><Highlight text={obs} /></p>
              </li>
            ))}
          </ul>

          <div className="ch-trend-detail">
            <h4 className="ch-detail-title">트렌드 상위 제목 구조 분포 ({trendAnalysis.total}개 기준)</h4>
            {Object.entries(trendAnalysis.structureCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([key, count]) => {
                const pct = Math.round((count / trendAnalysis.total) * 100)
                return (
                  <div key={key} className="ch-dist-row">
                    <span className="ch-dist-label">{STRUCTURE_DISPLAY[key]}</span>
                    <div className="ch-dist-track">
                      <div
                        className="ch-dist-fill"
                        style={{ width: `${pct}%` }}
                        role="presentation"
                      />
                    </div>
                    <span className="ch-dist-pct">{pct}%</span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)', padding: '0 4px' }}>
        데이터 출처: YouTube Data API v3 · 한국(KR) 기준 인기 영상 상위 {trendAnalysis.total}개와 비교
      </p>
    </div>
  )
}

// ─── 제목 길이 추이 차트 ─────────────────────────────────────
function TitleLengthChart({ analyzedVideos, trendAvg }) {
  // 최신순 → 차트는 왼쪽이 최신
  const data = analyzedVideos.map(v => v.gaps.titleLength)
  const n = data.length
  if (n < 2) return null

  const W = 600, H = 130
  const pL = 36, pR = 16, pT = 16, pB = 28
  const iW = W - pL - pR
  const iH = H - pT - pB

  const maxLen = Math.max(...data, trendAvg + 5)
  const minLen = Math.max(0, Math.min(...data, trendAvg - 5) - 5)
  const range = maxLen - minLen || 1

  const xPos = i => pL + (n === 1 ? iW / 2 : (i / (n - 1)) * iW)
  const yPos = v => pT + iH - ((v - minLen) / range) * iH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yPos(d)}`).join(' ')
  const trendY = yPos(trendAvg)

  return (
    <div className="score-timeline-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="score-timeline-svg"
        role="img"
        aria-label={`제목 길이 추이 차트. 트렌드 평균 ${trendAvg}자 기준선 포함.`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 트렌드 평균 기준선 */}
        <line
          x1={pL} y1={trendY} x2={W - pR} y2={trendY}
          stroke="currentColor" strokeOpacity="0.35" strokeDasharray="5,4"
        />
        <text x={W - pR + 2} y={trendY} dominantBaseline="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
          {trendAvg}자
        </text>

        {/* 내 채널 라인 */}
        <path d={linePath} stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinejoin="round" />

        {/* 데이터 점 */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xPos(i)}
            cy={yPos(d)}
            r="4"
            fill="var(--accent)"
            style={{ stroke: 'var(--card)', strokeWidth: 2 }}
          />
        ))}

        {/* X축 레이블 */}
        <text x={pL} y={H - 6} fontSize="10" fill="currentColor" fillOpacity="0.45">최신</text>
        <text x={W - pR} y={H - 6} fontSize="10" fill="currentColor" fillOpacity="0.45" textAnchor="end">과거</text>
      </svg>
      <div className="ch-chart-legend">
        <span className="ch-chart-legend-item">
          <span className="ch-chart-line-sample accent" aria-hidden="true" />
          내 채널 제목 길이
        </span>
        <span className="ch-chart-legend-item">
          <span className="ch-chart-line-sample dashed" aria-hidden="true" />
          트렌드 상위 평균 ({trendAvg}자)
        </span>
      </div>
    </div>
  )
}
