import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { canUseFeature } from '../lib/plan'
import { getCached, setCache } from '../lib/youtube'
import { getDateBefore } from '../lib/date'
import { formatNumber } from '../lib/format'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
const TIMING_STATE_VERSION = 'v1'
const MAX_PERSISTED_RESULTS = 8
const MAX_PERSISTED_VIDEOS = 10

function normalizeVideo(item) {
  if (!item || typeof item !== 'object') return null
  const rawViewCount = item.statistics?.viewCount ?? item.viewCount ?? 0
  const viewCount = Number(rawViewCount)
  return {
    id: item.id || item.videoId || '',
    title: item.snippet?.title || item.title || '제목 없음',
    channel: item.snippet?.channelTitle || item.channel || '',
    publishedAt: item.snippet?.publishedAt || item.publishedAt || null,
    viewCount: Number.isFinite(viewCount) ? viewCount : 0,
  }
}

function serializeResultForStorage(result) {
  return {
    id: result.id,
    topic: result.topic,
    contentType: result.contentType,
    analysis: result.analysis,
    data: {
      totalResults: result.data?.totalResults || 0,
      videos: Array.isArray(result.data?.videos) ? result.data.videos.slice(0, MAX_PERSISTED_VIDEOS) : [],
    },
  }
}

function sanitizeResult(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.topic !== 'string') return null

  const videosSource = Array.isArray(raw.data?.videos) ? raw.data.videos : []
  const videos = videosSource.map(normalizeVideo).filter(Boolean)
  const totalResults = Number(raw.analysis?.totalResults ?? raw.data?.totalResults ?? raw.totalResults ?? 0)
  const analysis = analyzeData(videos, Number.isFinite(totalResults) ? totalResults : 0)

  const id = Number(raw.id)
  return {
    id: Number.isFinite(id) ? id : Date.now(),
    topic: raw.topic.trim(),
    contentType: raw.contentType === '숏폼' ? '숏폼' : '롱폼',
    data: { videos, totalResults: analysis.totalResults },
    analysis,
  }
}

function persistTimingState(storageKey, payload) {
  let compactResults = [...payload.results]

  while (compactResults.length > 0) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...payload, results: compactResults }))
      return
    } catch {
      compactResults = compactResults.slice(1)
    }
  }
}

async function fetchTopicData(topic, contentType) {
  const cacheKey = `timing_${topic}_${contentType}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const after30 = getDateBefore(30)
  const durationParam = contentType === '숏폼' ? '&videoDuration=short' : ''
  const url = `/api/youtube?_ep=search&part=snippet&regionCode=KR&type=video&q=${encodeURIComponent(topic)}&order=viewCount&maxResults=20&publishedAfter=${encodeURIComponent(after30)}${durationParam}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.error) throw new Error(data.error.message || '데이터를 불러오지 못했습니다.')
  if (!data.items?.length) throw new Error(`"${topic}" 관련 최근 영상 데이터가 없습니다.`)

  const ids = data.items.map(i => i.id.videoId).join(',')
  const detailUrl = `/api/youtube?_ep=videos&part=snippet,statistics&id=${encodeURIComponent(ids)}`
  const detailRes = await fetch(detailUrl)
  const detailData = await detailRes.json()

  const totalResults = data.pageInfo?.totalResults || 0
  const videos = (detailData.items || []).map(normalizeVideo).filter(Boolean)
  const result = { videos, totalResults }

  setCache(cacheKey, result)
  return result
}

function analyzeData(videos, totalResults) {
  const viewCounts = videos.map(v => Number(v.viewCount || 0))
  const avgViews = Math.round(viewCounts.reduce((a, b) => a + b, 0) / (viewCounts.length || 1))

  const dayHourCounts = {}
  const dayDist = {}

  videos.forEach(v => {
    const iso = v.publishedAt
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

// ─── 멀티 키워드 비교 그리드 ──────────────────────────────────────────────────

function ComparisonGrid({ results }) {
  return (
    <div className="timing-compare-grid">
      {results.map(r => (
        <div key={r.id} className="timing-compare-card">
          <div className="timing-compare-card-header">
            <span className="timing-compare-keyword">"{r.topic}"</span>
            <span className="content-type-badge">{r.contentType}</span>
          </div>
          <div className="timing-compare-metrics">
            <div className="timing-compare-metric">
              <div className="timing-metric-label">최근 30일 업로드</div>
              <div className="timing-metric-value">
                약 {formatNumber(r.analysis.totalResults)}
                <span className="timing-metric-unit">개</span>
              </div>
              <div className="timing-metric-note">한국(KR) · 30일 기준</div>
            </div>
            <div className="timing-compare-divider" aria-hidden="true" />
            <div className="timing-compare-metric">
              <div className="timing-metric-label">상위 영상 평균 조회수</div>
              <div className="timing-metric-value">
                {formatNumber(r.analysis.avgViews)}
                <span className="timing-metric-unit">회</span>
              </div>
              <div className="timing-metric-note">조회수 상위 20개 기준</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 해석 가이드 ──────────────────────────────────────────────────────────────

const GUIDE_SCENARIOS = [
  {
    signals: [{ label: '업로드 ↑', dir: 'up' }, { label: '조회수 ↑', dir: 'up' }],
    desc: '수요와 공급이 함께 큰 구간으로 해석할 수도 있어요. 다만 채널 규모가 큰 영상 비중이 높으면 조회수가 과대하게 보일 수 있습니다.',
  },
  {
    signals: [{ label: '업로드 ↓', dir: 'down' }, { label: '조회수 ↑', dir: 'up' }],
    desc: '상대적으로 덜 다뤄졌는데 반응은 큰 구간으로 볼 수도 있어요. 진입 여지를 시사할 수 있지만 표본 수가 적을 가능성도 함께 확인해보세요.',
  },
  {
    signals: [{ label: '업로드 ↑', dir: 'up' }, { label: '조회수 ↓', dir: 'down' }],
    desc: '공급이 많은데 개별 반응은 약한 구간으로 읽을 수도 있어요. 주제 자체보다 썸네일/제목 경쟁이 심한 상태일 가능성도 있습니다.',
  },
  {
    signals: [{ label: '업로드 ↓', dir: 'down' }, { label: '조회수 ↓', dir: 'down' }],
    desc: '시장 규모가 아직 작거나 탐색 단계인 구간으로 해석할 수 있어요. 키워드를 더 구체화하면 다른 패턴이 나올 수도 있습니다.',
  },
]

function DataGuide() {
  return (
    <div className="timing-guide">
      <div className="timing-guide-header">
        <span className="timing-guide-icon" aria-hidden="true">◈</span>
        <div className="timing-guide-title">이 두 수치, 어떻게 읽을 수 있을까요?</div>
      </div>
      <p className="timing-guide-intro">
        업로드 수는 얼마나 많은 영상이 올라왔는지, 평균 조회수는 그 영상들이 얼마나 주목받았는지를 보여줍니다.
        두 수치를 함께 보면 시장의 성격을 가늠해보는 데 도움이 될 수 있어요.
        아래는 가능한 해석의 예시이며, 콘텐츠 성과에는 알고리즘·채널 규모·시기 등 다양한 요인이 작용합니다.
      </p>
      <div className="timing-guide-rules">
        {GUIDE_SCENARIOS.map((s, i) => (
          <div key={i} className="timing-guide-rule">
            <div className="guide-signals">
              {s.signals.map((sig, j) => (
                <span key={j} className={`guide-signal ${sig.dir}`}>{sig.label}</span>
              ))}
            </div>
            <div className="guide-rule-desc">{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="timing-calc-guide" role="note" aria-label="업로드·조회수 비교 계산기 읽는 법">
        <div className="timing-calc-guide-title">업로드·조회수 비교 계산기 읽는 법</div>
        <div className="timing-calc-guide-grid">
          <div className="timing-calc-guide-item">
            <strong>업로드 비율</strong>
            <span>`1.00x`보다 크면 경쟁 영상이 더 많고, 작으면 상대적으로 덜 올라온 주제예요.</span>
          </div>
          <div className="timing-calc-guide-item">
            <strong>조회수 비율</strong>
            <span>`1.00x`보다 크면 기준 키워드보다 주목도가 높고, 작으면 상대적으로 약해요.</span>
          </div>
          <div className="timing-calc-guide-item">
            <strong>반응 밀도</strong>
            <span>조회수 대비 업로드 밀도예요. `1.00x`보다 크면 공급 대비 반응 효율이 높은 편입니다.</span>
          </div>
        </div>
      </div>
      <p className="timing-guide-disclaimer">
        조회수는 상위 20개 영상 기준으로, 실제 해당 주제의 평균과 다를 수 있습니다.
        업로드 수도 YouTube API의 추정치예요.
      </p>
    </div>
  )
}

// ─── 업로드/조회수 관계 계산기 ───────────────────────────────────────────────

function RelationCalculator({ results, baseId, onChangeBase }) {
  const base = results.find(r => r.id === baseId) || results[0]

  const rows = useMemo(() => {
    if (!base) return []
    const baseUpload = Math.max(base.analysis.totalResults, 1)
    const baseViews = Math.max(base.analysis.avgViews, 1)
    const baseEfficiency = baseViews / baseUpload

    return results.map(r => {
      const upload = Math.max(r.analysis.totalResults, 1)
      const views = Math.max(r.analysis.avgViews, 1)
      const uploadRatio = upload / baseUpload
      const viewsRatio = views / baseViews
      const efficiency = views / upload
      const efficiencyRatio = efficiency / Math.max(baseEfficiency, 1e-9)

      return {
        id: r.id,
        topic: r.topic,
        upload: r.analysis.totalResults,
        views: r.analysis.avgViews,
        uploadRatio,
        viewsRatio,
        efficiency,
        efficiencyRatio,
      }
    })
  }, [results, base])

  if (!base || results.length < 2) return null

  return (
    <div className="timing-calc-card">
      <div className="timing-calc-head">
        <div>
          <div className="timing-calc-title">업로드·조회수 비교 계산기</div>
          <p className="timing-calc-sub">
            기준 키워드 대비 상대 비율을 계산해 비교합니다. 수치는 참고값이며 단정적 결론 대신 방향성 판단에 활용해보세요.
          </p>
        </div>
        <label className="timing-calc-base">
          <span>기준 키워드</span>
          <select value={base.id} onChange={e => onChangeBase(Number(e.target.value))} className="form-select">
            {results.map(r => (
              <option key={r.id} value={r.id}>{r.topic}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="timing-calc-grid" role="table" aria-label="키워드 관계 계산 결과">
        <div className="timing-calc-row timing-calc-row-head" role="row">
          <span role="columnheader">키워드</span>
          <span role="columnheader">업로드 비율</span>
          <span role="columnheader">조회수 비율</span>
          <span role="columnheader">반응 밀도</span>
        </div>
        {rows.map(r => (
          <div key={r.id} className={`timing-calc-row${r.id === base.id ? ' active' : ''}`} role="row">
            <span role="cell">"{r.topic}"</span>
            <span role="cell">{r.uploadRatio.toFixed(2)}x</span>
            <span role="cell">{r.viewsRatio.toFixed(2)}x</span>
            <span role="cell">{r.efficiencyRatio.toFixed(2)}x</span>
          </div>
        ))}
      </div>
      <p className="timing-calc-footnote">
        반응 밀도 = 평균 조회수 ÷ 업로드 수 (기준 키워드 대비 상대값)
      </p>
    </div>
  )
}

// ─── 포지셔닝 맵 (스캐터 플롯) ───────────────────────────────────────────────

const DOT_COLORS = ['#0F766E', '#EA580C', '#0369A1', '#16A34A', '#B45309', '#334155']

function ScatterPlot({ results }) {
  const longestTopicLength = Math.max(...results.map(r => r.topic.length), 1)
  const W = Math.min(980, Math.max(420, 420 + (results.length - 2) * 52 + Math.max(0, longestTopicLength - 8) * 10))
  const H = Math.min(560, Math.max(290, 290 + Math.max(0, results.length - 4) * 16))
  const PAD = {
    top: 32,
    right: Math.min(230, Math.max(120, 120 + Math.max(0, longestTopicLength - 8) * 5)),
    bottom: 48,
    left: 56,
  }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const points = results.map(r => ({
    id: r.id,
    topic: r.topic,
    x: r.analysis.totalResults,
    y: r.analysis.avgViews,
  }))

  const maxX = Math.max(...points.map(p => p.x), 1)
  const maxY = Math.max(...points.map(p => p.y), 1)
  const xDomainMax = maxX * 1.08
  const yDomainMax = maxY * 1.08

  const toSVG = (x, y) => ({
    px: PAD.left + (x / xDomainMax) * plotW,
    py: PAD.top + (1 - y / yDomainMax) * plotH,
  })

  const midX = PAD.left + plotW / 2
  const midY = PAD.top + plotH / 2

  return (
    <div className="timing-section-card timing-scatter-card" style={{ marginBottom: 16 }}>
      <div className="timing-section-title">키워드 포지셔닝 맵</div>
      <p className="timing-section-note" style={{ marginBottom: 12, marginTop: 0 }}>
        각 키워드의 업로드 수(가로)와 평균 조회수(세로)를 기준으로 나타낸 참고 지도예요.
      </p>
      <div className="timing-scatter-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', maxWidth: W, minWidth: W, display: 'block' }}
          aria-label="키워드 업로드 수 및 평균 조회수 포지셔닝 맵"
          role="img"
        >
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="var(--timing-map-bg)"
            stroke="var(--timing-map-border)"
            strokeWidth="1"
            rx="10"
          />

          {/* 사분면 배경 */}
          <rect x={PAD.left} y={PAD.top} width={plotW / 2} height={plotH / 2} fill="var(--timing-map-q2)" />
          <rect x={midX} y={PAD.top} width={plotW / 2} height={plotH / 2} fill="var(--timing-map-q1)" />
          <rect x={PAD.left} y={midY} width={plotW / 2} height={plotH / 2} fill="var(--timing-map-q3)" />
          <rect x={midX} y={midY} width={plotW / 2} height={plotH / 2} fill="var(--timing-map-q4)" />

          {/* 사분면 레이블 */}
          <text x={PAD.left + 6} y={PAD.top + 14} fontSize="9" fill="var(--timing-map-label-strong)" fontFamily="inherit">업로드↓ · 조회수↑</text>
          <text x={midX + 6} y={PAD.top + 14} fontSize="9" fill="var(--timing-map-label-strong)" fontFamily="inherit">업로드↑ · 조회수↑</text>
          <text x={PAD.left + 6} y={H - PAD.bottom - 6} fontSize="9" fill="var(--timing-map-label)" fontFamily="inherit">업로드↓ · 조회수↓</text>
          <text x={midX + 6} y={H - PAD.bottom - 6} fontSize="9" fill="var(--timing-map-label)" fontFamily="inherit">업로드↑ · 조회수↓</text>

          {/* 축선 */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="var(--timing-map-axis)" strokeWidth="1.5" />
          <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="var(--timing-map-axis)" strokeWidth="1.5" />

          {/* 중간선 */}
          <line x1={midX} y1={PAD.top} x2={midX} y2={H - PAD.bottom} stroke="var(--timing-map-midline)" strokeWidth="1" strokeDasharray="4,3" />
          <line x1={PAD.left} y1={midY} x2={W - PAD.right} y2={midY} stroke="var(--timing-map-midline)" strokeWidth="1" strokeDasharray="4,3" />

          {/* 축 레이블 */}
          <text x={PAD.left + plotW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--timing-map-label)" fontFamily="inherit">업로드 수 많음 →</text>
          <text
            x={14} y={PAD.top + plotH / 2}
            textAnchor="middle" fontSize="11" fill="var(--timing-map-label)" fontFamily="inherit"
            transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}
          >평균 조회수 높음 ↑</text>

          {/* 점 + 레이블 */}
          {points.map((p, i) => {
            const { px, py } = toSVG(p.x, p.y)
            const color = DOT_COLORS[i % DOT_COLORS.length]
            const label = p.topic.length > 9 ? p.topic.slice(0, 8) + '…' : p.topic
            const putLeft = px > W - PAD.right - 56
            return (
              <g key={p.id}>
                <circle cx={px} cy={py} r={9} fill={color} opacity={0.9} />
                <circle cx={px} cy={py} r={9} fill="none" stroke="var(--timing-map-dot-ring)" strokeWidth="1.5" opacity={0.7} />
                <text
                  x={putLeft ? px - 14 : px + 14}
                  y={py + 4}
                  textAnchor={putLeft ? 'end' : 'start'}
                  fontSize="12"
                  fill="var(--timing-map-point-label)"
                  stroke="var(--timing-map-point-label-stroke)"
                  strokeWidth="3"
                  paintOrder="stroke"
                  fontFamily="inherit"
                  fontWeight="700"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 범례 */}
      <div className="scatter-legend">
        {results.map((r, i) => (
          <div key={r.id} className="scatter-legend-item">
            <span className="scatter-legend-dot" style={{ background: DOT_COLORS[i % DOT_COLORS.length] }} aria-hidden="true" />
            <span className="scatter-legend-label">"{r.topic}"</span>
            <span className="scatter-legend-vals">업로드 약 {formatNumber(r.analysis.totalResults)}개 · 조회수 {formatNumber(r.analysis.avgViews)}회</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 상세 탭 선택 ─────────────────────────────────────────────────────────────

function DetailTabs({ results, selectedId, onSelect }) {
  if (results.length <= 1) return null
  return (
    <div className="timing-detail-tabs">
      <span className="timing-detail-tabs-label">상세 데이터 보기</span>
      <div className="timing-detail-tabs-list" role="tablist">
        {results.map(r => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === selectedId}
            className={`timing-detail-tab${r.id === selectedId ? ' active' : ''}`}
            onClick={() => onSelect(r.id)}
          >
            {r.topic}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 업로드 요일 차트 ─────────────────────────────────────────────────────────

function DayChart({ result }) {
  const { analysis } = result
  const dayMax = Math.max(...Object.values(analysis.dayDist), 1)

  return (
    <div className="timing-section-card" style={{ marginBottom: 16 }}>
      <div className="timing-section-title">"{result.topic}" 주목받은 영상의 업로드 요일</div>
      <div className="timing-day-bars" role="img" aria-label="요일별 업로드 분포 막대 그래프">
        {DAYS.map((day, i) => {
          const count = analysis.dayDist[i] || 0
          const pct = Math.round((count / dayMax) * 100)
          const isTop = count === dayMax && count > 0
          return (
            <div key={day} className="timing-day-bar-item">
              <div className="timing-day-bar-count">{count > 0 ? count : ''}</div>
              <div className="timing-day-bar-track">
                <div className={`timing-day-bar-fill${isTop ? ' top' : ''}`} style={{ height: `${pct}%` }} />
              </div>
              <div className={`timing-day-bar-label${isTop ? ' top' : ''}`}>{day}</div>
            </div>
          )
        })}
      </div>
      {analysis.topTimings.length > 0 && (
        <div className="timing-top-slots">
          <span className="timing-top-slots-label">집중 시간대</span>
          <div className="timing-slot-tags">
            {analysis.topTimings.map(t => (
              <span key={t} className="timing-slot-tag">{t}</span>
            ))}
          </div>
          <span className="timing-top-slots-note">KST 기준</span>
        </div>
      )}
      <p className="timing-section-note">상위 20개 영상 표본 기준입니다. 표본이 적을수록 참고용으로만 활용하세요.</p>
    </div>
  )
}

// ─── 최근 주목받은 영상 ───────────────────────────────────────────────────────

function RecentVideos({ result }) {
  const topVideos = useMemo(() => [...result.data.videos]
    .sort((a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0))
    .slice(0, 10), [result.data.videos])

  return (
    <div className="recent-videos" style={{ marginBottom: 20 }}>
      <div className="recent-videos-header">
        <span className="recent-videos-title">"{result.topic}" 최근 주목받은 영상</span>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>최근 30일 기준</span>
      </div>
      {topVideos.length === 0 ? (
        <div className="empty-state"><div className="empty-title">영상 목록 없음</div></div>
      ) : topVideos.map((v, i) => {
        const title = v.title || '제목 없음'
        const channel = v.channel || ''
        const published = v.publishedAt
        const views = formatNumber(Number(v.viewCount || 0))
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
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function Timing() {
  const { user, userData } = useAuth()

  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('롱폼')
  const [results, setResults] = useState([]) // [{ id, topic, contentType, data, analysis }]
  const [loadingTopic, setLoadingTopic] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [calcBaseId, setCalcBaseId] = useState(null)
  const timingStorageKey = useMemo(
    () => `momento_timing_state_${TIMING_STATE_VERSION}_${user?.id || 'guest'}`,
    [user?.id]
  )
  const [timingHydrated, setTimingHydrated] = useState(false)

  const userDataLoading = userData === null
  const canUse = canUseFeature(userData, 'timing')

  const selectedResult = results.find(r => r.id === selectedId) || results[results.length - 1] || null

  useEffect(() => {
    if (!user?.id) return
    try {
      const raw = localStorage.getItem(timingStorageKey)
      if (!raw) {
        setTimingHydrated(true)
        return
      }
      const saved = JSON.parse(raw)
      const savedResults = Array.isArray(saved.results)
        ? saved.results.map(sanitizeResult).filter(Boolean)
        : []
      const selectedExists = savedResults.some(r => r.id === saved.selectedId)
      const calcBaseExists = savedResults.some(r => r.id === saved.calcBaseId)

      setTopic(typeof saved.topic === 'string' ? saved.topic : '')
      setContentType(saved.contentType === '숏폼' ? '숏폼' : '롱폼')
      setResults(savedResults)
      setSelectedId(selectedExists ? saved.selectedId : (savedResults[savedResults.length - 1]?.id ?? null))
      setCalcBaseId(calcBaseExists ? saved.calcBaseId : (savedResults[0]?.id ?? null))
    } catch {
      // ignore invalid persisted state
    } finally {
      setTimingHydrated(true)
    }
  }, [timingStorageKey, user?.id])

  useEffect(() => {
    if (!timingHydrated || !user?.id || loadingTopic) return

    const payload = {
      topic,
      contentType,
      results: results.slice(-MAX_PERSISTED_RESULTS).map(serializeResultForStorage),
      selectedId,
      calcBaseId,
    }

    persistTimingState(timingStorageKey, payload)
  }, [timingHydrated, timingStorageKey, user?.id, topic, contentType, results, selectedId, calcBaseId, loadingTopic])

  const handleAdd = async () => {
    const t = topic.trim()
    if (!t) { alert('키워드를 입력해주세요.'); return }
    if (results.some(r => r.topic === t && r.contentType === contentType)) {
      alert(`"${t}"은(는) 이미 분석된 키워드예요.`); return
    }
    setLoadingTopic(t)
    setErrorMsg('')
    try {
      const data = await fetchTopicData(t, contentType)
      const analysis = analyzeData(data.videos, data.totalResults)
      const newResult = { id: Date.now(), topic: t, contentType, data, analysis }
      setResults(prev => [...prev, newResult])
      setSelectedId(newResult.id)
      setCalcBaseId(prev => prev ?? newResult.id)
      setTopic('')
    } catch (e) {
      setErrorMsg(e.message || '데이터를 가져오는 중 오류가 발생했습니다.')
    } finally {
      setLoadingTopic(null)
    }
  }

  const handleRemove = (id) => {
    setResults(prev => {
      const next = prev.filter(r => r.id !== id)
      if (selectedId === id) setSelectedId(next[next.length - 1]?.id ?? null)
      if (calcBaseId === id) setCalcBaseId(next[0]?.id ?? null)
      return next
    })
  }

  const handleClearAll = () => {
    setResults([])
    setSelectedId(null)
    setCalcBaseId(null)
    try { localStorage.removeItem(timingStorageKey) } catch { /* ignore */ }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleAdd() }

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
              <p className="page-desc">키워드를 입력하면 최근 30일간 그 시장의 흐름을 수치로 확인합니다. 여러 키워드를 추가해 비교할 수 있어요.</p>
            </div>

            <div className="timing-layout">
              <aside className="input-panel">
                <h2 className="input-panel-title">키워드 입력</h2>
                <div className="input-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="topic-input">영상 주제 또는 키워드</label>
                    <input
                      type="search" id="topic-input" name="topic" className="form-input"
                      placeholder="예: 다이어트, 재테크, 혼자 여행…"
                      maxLength={60} autoComplete="off" inputMode="search"
                      value={topic} onChange={e => setTopic(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={loadingTopic !== null}
                    />
                    <span className="form-hint">한 단어 또는 짧은 문장으로 입력하세요.</span>
                  </div>

                  <div className="form-group">
                    <span className="form-label" id="timing-content-type-label">콘텐츠 유형</span>
                    <div className="content-type-toggle" role="group" aria-labelledby="timing-content-type-label">
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
                    onClick={handleAdd}
                    disabled={loadingTopic !== null}
                  >
                    {loadingTopic ? `"${loadingTopic}" 분석 중…` : results.length === 0 ? '시장 현황 분석' : '키워드 추가'}
                  </button>

                  {errorMsg && (
                    <div
                      className="alert alert-error"
                      style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13 }}
                      role="alert"
                      aria-live="assertive"
                    >
                      {errorMsg}
                    </div>
                  )}
                </div>

                {results.length > 0 && (
                  <div className="timing-keyword-list">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div className="timing-keyword-list-title" style={{ marginBottom: 0 }}>분석된 키워드 ({results.length})</div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleClearAll}
                        aria-label="분석된 키워드 전체 지우기"
                        style={{ touchAction: 'manipulation', padding: '4px 10px', fontSize: 12 }}
                      >
                        전체 지우기
                      </button>
                    </div>
                    {results.map(r => (
                      <div
                        key={r.id}
                        className={`timing-keyword-item${r.id === selectedId ? ' active' : ''}`}
                      >
                        <button
                          type="button"
                          className="timing-keyword-select"
                          onClick={() => setSelectedId(r.id)}
                          aria-pressed={r.id === selectedId}
                        >
                          <div className="timing-keyword-info">
                            <span className="timing-keyword-name">"{r.topic}"</span>
                            <span className="timing-keyword-stat">{formatNumber(r.analysis.totalResults)}개 · {formatNumber(r.analysis.avgViews)}회</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="timing-keyword-remove"
                          aria-label={`"${r.topic}" 제거`}
                          onClick={() => handleRemove(r.id)}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </aside>

              <section id="timing-result">
                {results.length === 0 ? (
                  loadingTopic ? (
                    <div className="result-loading" role="status" aria-live="polite" aria-busy="true">
                      <div className="spinner" />
                      <span>"{loadingTopic}" 영상 데이터를 분석하는 중…</span>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
                      <div className="empty-icon">◇</div>
                      <div className="empty-title">시장 현황이 여기에 표시됩니다</div>
                      <div className="empty-desc">왼쪽에 키워드를 입력하고 분석을 시작하세요. 여러 키워드를 추가해 비교할 수 있어요.</div>
                    </div>
                  )
                ) : (
                  <>
                    {loadingTopic && (
                      <div className="timing-loading-bar" role="status" aria-live="polite" aria-busy="true">
                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        <span>"{loadingTopic}" 분석 중…</span>
                      </div>
                    )}

                    <ComparisonGrid results={results} />
                    <RelationCalculator
                      results={results}
                      baseId={calcBaseId}
                      onChangeBase={setCalcBaseId}
                    />
                    <DataGuide />
                    {results.length >= 2 && <ScatterPlot results={results} />}
                    <DetailTabs results={results} selectedId={selectedId} onSelect={setSelectedId} />

                    {selectedResult && (
                      <>
                        <DayChart result={selectedResult} />
                        <RecentVideos result={selectedResult} />
                      </>
                    )}

                    <p style={{ fontSize: 12, color: 'var(--text-3)', padding: '0 4px' }}>
                      데이터 출처: YouTube Data API v3 · 한국(KR) 기준
                    </p>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </>
  )
}
