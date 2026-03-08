import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { canUseFeature } from '../lib/plan'
import { getCached, setCache } from '../lib/youtube'
import { getDateBefore } from '../lib/date'
import { formatNumber } from '../lib/format'

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
  const dayDist = {} // dayIndex(0-6) → count

  videos.forEach(v => {
    const iso = v.snippet?.publishedAt
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

  return { avgViews, topTimings, totalResults, dayDist }
}

export default function Timing() {
  const { userData } = useAuth()

  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('empty') // empty | loading | result | error
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)

  const userDataLoading = userData === null
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
        {userDataLoading ? (
          <div className="loading-overlay">
            <div className="spinner" />
            <span>잠시만 기다려주세요…</span>
          </div>
        ) : !canUse ? (
          <div style={{ paddingTop: 40 }}>
            <div className="upgrade-prompt">
              <div className="up-icon">◇</div>
              <h2 className="up-title">Timing Report는 STARTER 플랜부터 사용 가능합니다</h2>
              <p className="up-desc">
                영상 주제의 시장 현황, 최근 업로드 빈도, 주목받은 타이밍을<br />
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
  const a = useMemo(() => analyzeData(data.videos, data.totalResults), [data.videos, data.totalResults])

  const now = useMemo(() =>
    new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date()),
    []
  )

  const topVideos = useMemo(() => [...data.videos]
    .sort((a, b) => Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0))
    .slice(0, 10), [data.videos])

  const dayMax = useMemo(() => Math.max(...Object.values(a.dayDist), 1), [a.dayDist])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '0 4px' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>"{topic}" 주제 현황</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>분석 시각: {now}</div>
      </div>

      {/* 핵심 지표 2개 */}
      <div className="timing-metric-grid">
        <div className="timing-metric-card">
          <div className="timing-metric-label">최근 30일 업로드 수</div>
          <div className="timing-metric-value">약 {formatNumber(a.totalResults)}<span className="timing-metric-unit">개</span></div>
          <div className="timing-metric-note">한국(KR) · 최근 30일 기준</div>
        </div>
        <div className="timing-metric-card">
          <div className="timing-metric-label">상위 영상 평균 조회수</div>
          <div className="timing-metric-value">{formatNumber(a.avgViews)}<span className="timing-metric-unit">회</span></div>
          <div className="timing-metric-note">조회수 상위 20개 영상 기준</div>
        </div>
      </div>

      {/* 업로드 요일 분포 */}
      <div className="timing-section-card">
        <div className="timing-section-title">주목받은 영상의 업로드 요일</div>
        <div className="timing-day-bars" role="img" aria-label="요일별 업로드 분포 막대 그래프">
          {DAYS.map((day, i) => {
            const count = a.dayDist[i] || 0
            const pct = Math.round((count / dayMax) * 100)
            const isTop = count === dayMax && count > 0
            return (
              <div key={day} className="timing-day-bar-item">
                <div className="timing-day-bar-count">{count > 0 ? count : ''}</div>
                <div className="timing-day-bar-track">
                  <div
                    className={`timing-day-bar-fill${isTop ? ' top' : ''}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <div className={`timing-day-bar-label${isTop ? ' top' : ''}`}>{day}</div>
              </div>
            )
          })}
        </div>
        {a.topTimings.length > 0 && (
          <div className="timing-top-slots">
            <span className="timing-top-slots-label">집중 시간대</span>
            <div className="timing-slot-tags">
              {a.topTimings.map(t => (
                <span key={t} className="timing-slot-tag">{t}</span>
              ))}
            </div>
            <span className="timing-top-slots-note">KST 기준</span>
          </div>
        )}
        <p className="timing-section-note">
          상위 20개 영상 표본 기준입니다. 표본이 적을수록 참고용으로만 활용하세요.
        </p>
      </div>

      {/* 데이터 해석 가이드 */}
      <div className="timing-guide">
        <div className="timing-guide-header">
          <span className="timing-guide-icon" aria-hidden="true">◈</span>
          <div className="timing-guide-title">이 수치를 어떻게 읽을까요?</div>
        </div>
        <p className="timing-guide-intro">
          MOMENTO는 포화도를 하나의 점수로 압축하지 않습니다. 점수로 압축하는 순간 실제 맥락이
          사라지기 때문에, 두 수치를 직접 보고 판단하실 수 있도록 했습니다.
        </p>
        <div className="timing-guide-rules">
          <div className="timing-guide-rule">
            <div className="guide-signals">
              <span className="guide-signal up">업로드 ↑</span>
              <span className="guide-signal up">조회수 ↑</span>
            </div>
            <div className="guide-rule-desc">시장이 크고 경쟁도 치열합니다. 차별화된 시각이나 포맷이 필요해요.</div>
          </div>
          <div className="timing-guide-rule">
            <div className="guide-signals">
              <span className="guide-signal up">업로드 ↑</span>
              <span className="guide-signal down">조회수 ↓</span>
            </div>
            <div className="guide-rule-desc">공급 과잉 가능성이 있습니다. 시청자 수요 대비 영상이 너무 많을 수 있어요.</div>
          </div>
          <div className="timing-guide-rule">
            <div className="guide-signals">
              <span className="guide-signal down">업로드 ↓</span>
              <span className="guide-signal up">조회수 ↑</span>
            </div>
            <div className="guide-rule-desc">수요 대비 공급이 적은 기회 주제일 수 있습니다. 진입 타이밍을 검토해보세요.</div>
          </div>
          <div className="timing-guide-rule">
            <div className="guide-signals">
              <span className="guide-signal down">업로드 ↓</span>
              <span className="guide-signal down">조회수 ↓</span>
            </div>
            <div className="guide-rule-desc">시청자 관심도 자체가 낮은 주제일 수 있습니다. 키워드를 바꿔 다시 검색해보세요.</div>
          </div>
        </div>
        <p className="timing-guide-disclaimer">
          조회수는 상위 20개 영상 기준이므로 실제 평균보다 높을 수 있습니다.
          절대적인 기준이 아닌 방향성을 파악하는 참고 지표로 활용하세요.
        </p>
      </div>

      {/* 최근 주목받은 영상 */}
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
