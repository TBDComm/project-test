import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { canUseFeature, getCached, setCache, getDateBefore, formatNumber } from '../lib/utils'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

async function fetchTopicData(topic) {
  const cacheKey = `timing_${topic}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const after30 = getDateBefore(30)
  const url = `/api/youtube?_ep=search&part=snippet&regionCode=KR&type=video&q=${encodeURIComponent(topic)}&order=viewCount&maxResults=20&publishedAfter=${encodeURIComponent(after30)}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.error) throw new Error(data.error.message || '데이터를 불러오지 못했습니다.')
  if (!data.items?.length) throw new Error(`"${topic}" 관련 최근 영상 데이터가 없습니다.`)

  const ids = data.items.map(i => i.id.videoId).join(',')
  const detailUrl = `/api/youtube?_ep=videos&part=snippet,statistics&id=${encodeURIComponent(ids)}`
  const detailRes = await fetch(detailUrl)
  const detailData = await detailRes.json()

  const totalResults = data.pageInfo?.totalResults || 0
  const result = { videos: detailData.items || [], totalResults }

  setCache(cacheKey, result)
  return result
}

function analyzeData(videos, totalResults) {
  const viewCounts = videos.map(v => Number(v.statistics?.viewCount || 0))
  const avgViews = Math.round(viewCounts.reduce((a, b) => a + b, 0) / (viewCounts.length || 1))

  const dayHourCounts = {}
  videos.forEach(v => {
    const iso = v.snippet?.publishedAt
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

  let saturation, satPct
  if (totalResults > 500)      { saturation = 'high';   satPct = 90 }
  else if (totalResults > 100) { saturation = 'medium'; satPct = 55 }
  else                         { saturation = 'low';    satPct = 20 }

  return { avgViews, topTimings, saturation, satPct, totalResults }
}

export default function Timing() {
  const { userData } = useAuth()

  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('empty') // empty | loading | result | error
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)

  const canUse = canUseFeature(userData, 'timing')

  const handleAnalyze = async () => {
    if (!topic.trim()) { alert('영상 주제를 입력해주세요.'); return }
    setStatus('loading')
    try {
      const data = await fetchTopicData(topic.trim())
      setResult({ topic: topic.trim(), data })
      setStatus('result')
    } catch (e) {
      setErrorMsg(e.message || '데이터를 가져오는 중 오류가 발생했습니다.')
      setStatus('error')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="app-main" id="main-content">
        {!canUse ? (
          <div style={{ paddingTop: 40 }}>
            <div className="upgrade-prompt">
              <div className="up-icon">◇</div>
              <h2 className="up-title">Timing Report는 STARTER 플랜부터 사용 가능합니다</h2>
              <p className="up-desc">
                영상 주제의 시장 현황, 포화도, 최근 업로드 빈도, 주목받은 타이밍을<br />
                STARTER 플랜 이상에서 무제한으로 확인할 수 있습니다.
              </p>
              <Link to="/pricing" className="btn btn-primary btn-lg">플랜 업그레이드하기</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="page-header">
              <h1 className="page-title">◇ Timing Report</h1>
              <p className="page-desc">주제를 입력하면 최근 30일간 그 시장에서 어떤 흐름이 있었는지 수치로 확인합니다.</p>
            </div>

            <div className="timing-layout">
              <aside className="input-panel">
                <h2 className="input-panel-title">주제 입력</h2>
                <div className="input-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="topic-input">영상 주제 또는 키워드</label>
                    <input
                      type="text" id="topic-input" name="topic" className="form-input"
                      placeholder="예: 다이어트, 재테크, 혼자 여행…"
                      maxLength={60} autoComplete="off"
                      value={topic} onChange={e => setTopic(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <span className="form-hint">주제를 한 단어 또는 짧은 문장으로 입력하세요.</span>
                  </div>
                  <button
                    className="btn btn-primary btn-full" type="button"
                    style={{ padding: 13 }}
                    onClick={handleAnalyze}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? '분석 중…' : '시장 현황 분석'}
                  </button>
                </div>
              </aside>

              <section>
                {status === 'empty' && (
                  <div className="empty-state" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
                    <div className="empty-icon">◇</div>
                    <div className="empty-title">시장 현황이 여기에 표시됩니다</div>
                    <div className="empty-desc">왼쪽에 영상 주제를 입력하고 분석을 시작하세요.</div>
                  </div>
                )}

                {status === 'loading' && (
                  <div className="result-loading">
                    <div className="spinner" />
                    <span>주제 관련 영상 데이터를 분석하는 중…</span>
                  </div>
                )}

                {status === 'error' && (
                  <div className="alert alert-error" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
                    <span aria-hidden="true">✕</span>
                    <div>{errorMsg}</div>
                  </div>
                )}

                {status === 'result' && result && (
                  <TimingResult topic={result.topic} data={result.data} />
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </>
  )
}

function TimingResult({ topic, data }) {
  const a = analyzeData(data.videos, data.totalResults)

  const satLabel = { low: '낮음', medium: '보통', high: '높음' }[a.saturation]
  const satDesc = {
    low:    '이 주제를 다룬 최근 영상이 비교적 적습니다.',
    medium: '이 주제를 다룬 영상이 꾸준히 올라오고 있습니다.',
    high:   '이 주제를 다룬 영상이 매우 많이 올라오고 있습니다.',
  }[a.saturation]

  const now = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date())

  const topVideos = [...data.videos]
    .sort((a, b) => Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0))
    .slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '0 4px' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>"{topic}" 주제 현황</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>분석 시각: {now}</div>
      </div>

      <div className="saturation-gauge">
        <div className="gauge-title">주제 포화도</div>
        <div className={`gauge-value ${a.saturation}`}>{satLabel}</div>
        <div className="gauge-bar">
          <div className={`gauge-fill ${a.saturation}`} style={{ width: `${a.satPct}%` }} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{satDesc}</div>
      </div>

      <div className="timing-stat-list">
        <div className="timing-stat-item">
          <div className="timing-stat-label">최근 30일 업로드 수</div>
          <div className="timing-stat-value">약 {formatNumber(a.totalResults)}개</div>
          <div className="timing-stat-note">최근 30일 이내 유튜브 한국 기준</div>
        </div>
        <div className="timing-stat-item">
          <div className="timing-stat-label">주목받은 영상의 업로드 시간대</div>
          <div className="timing-stat-value">{a.topTimings.length ? a.topTimings.join(', ') : '—'}</div>
          <div className="timing-stat-note">분석된 상위 영상들의 업로드 집중 시간 (KST)</div>
        </div>
        <div className="timing-stat-item">
          <div className="timing-stat-label">평균 조회수</div>
          <div className="timing-stat-value">{formatNumber(a.avgViews)}회</div>
          <div className="timing-stat-note">최근 주목받은 관련 영상 평균 조회수</div>
        </div>
      </div>

      <div className="recent-videos" style={{ marginTop: 20 }}>
        <div className="recent-videos-header">
          <span className="recent-videos-title">최근 주목받은 관련 영상</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>최근 30일 기준</span>
        </div>
        {topVideos.length === 0 ? (
          <div className="empty-state"><div className="empty-title">영상 목록 없음</div></div>
        ) : topVideos.map((v, i) => {
          const title = v.snippet?.title || '제목 없음'
          const channel = v.snippet?.channelTitle || ''
          const published = v.snippet?.publishedAt
          const views = formatNumber(Number(v.statistics?.viewCount || 0))
          const dateStr = published ? dateFormatter.format(new Date(published)) : ''
          return (
            <div className="video-item" key={v.id || i}>
              <div className="video-rank">{i + 1}</div>
              <div className="video-info">
                <div className="video-title">{title}</div>
                <div className="video-meta">
                  <span>{channel}</span>
                  <span>조회수 {views}</span>
                  {dateStr && <span>{dateStr}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', padding: '0 4px' }}>
        데이터 출처: YouTube Data API v3 · 한국(KR) 기준
      </p>
    </div>
  )
}
