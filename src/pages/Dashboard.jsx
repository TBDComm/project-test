import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { PLANS } from '../lib/constants'
import { getRemainingUses, canUseFeature } from '../lib/plan'

export default function Dashboard() {
  const { user, userData } = useAuth()

  const isAdmin = userData?.isAdmin || false
  const plan = isAdmin ? 'pro' : (userData?.plan || 'free')
  const usage = userData?.monthlyUsage || 0
  const remaining = getRemainingUses(userData)
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '크리에이터'

  const usagePct = plan === 'free' ? Math.min(100, (usage / 5) * 100) : 0
  const usageLimit = plan === 'free' ? '5' : '∞'
  const usageNote = plan === 'free' ? `이번 달 남은 횟수: ${remaining}회` : '무제한 사용 가능'

  const planName = isAdmin ? 'ADMIN' : (PLANS[plan]?.name || '무료')
  const planNote = isAdmin ? '모든 기능 무제한'
    : plan === 'free'    ? '월 5회 Spotlight Compare'
    : plan === 'starter' ? 'Spotlight 무제한 + Timing Report'
    : '모든 기능 포함'

  const canTiming = plan === 'starter' || plan === 'pro' || isAdmin
  const canChannel = canUseFeature(userData, 'channelAnalysis')

  let subStatus = '미구독'
  let subNote = ''
  if (plan !== 'free') {
    subStatus = '구독 중'
    if (userData?.subscriptionEnd) {
      const end = new Date(userData.subscriptionEnd)
      subNote = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(end) + '까지'
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="app-main" id="main-content">
        <div className="dashboard-greeting">
          <h1 className="greeting-title">안녕하세요, <span>{name}</span>님</h1>
          <p className="greeting-sub">오늘도 좋은 영상 만드세요.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">이번 달 Spotlight 사용</div>
            <div className="stat-value">
              {usage}
              <span style={{ fontSize: 18, color: 'var(--text-2)' }}>/</span>
              <span style={{ fontSize: 18, color: 'var(--text-2)' }}>{usageLimit}</span>
            </div>
            <div className="usage-bar-track">
              <div className="usage-bar-fill" style={{ width: `${usagePct}%` }} />
            </div>
            <div className="stat-note">{usageNote}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">현재 플랜</div>
            <div className="stat-value">{planName}</div>
            <div className="stat-note">{planNote}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">구독 상태</div>
            <div className="stat-value">{subStatus}</div>
            <div className="stat-note">{subNote}</div>
          </div>
        </div>

        <div className="quick-actions">
          <Link to="/spotlight" className="action-card">
            <div className="action-icon" aria-hidden="true">✦</div>
            <div>
              <div className="action-name">Spotlight Compare</div>
              <div className="action-desc">내 영상 제목과 카테고리를 입력하면, 지금 스포트된 상위 영상들의 패턴과 나란히 비교해드립니다.</div>
            </div>
            <div className="action-footer">
              <span className="action-cta">비교{"\u00A0"}시작하기 <span aria-hidden="true">→</span></span>
              <span className={`badge ${plan === 'free' ? 'badge-purple' : 'badge-green'}`}>
                {plan === 'free' ? `이번\u00A0달 ${remaining}회\u00A0남음` : '무제한'}
              </span>
            </div>
          </Link>

          <Link
            to={canTiming ? '/timing' : '/pricing'}
            className={`action-card${canTiming ? '' : ' locked'}`}
          >
            <div className="action-icon" aria-hidden="true">◇</div>
            <div>
              <div className="action-name">Timing Report</div>
              <div className="action-desc">영상 주제를 입력하면, 지금 그 주제의 시장 현황—포화도, 최근 업로드 빈도, 주목받은 타이밍—을 보여드립니다.</div>
            </div>
            <div className="action-footer">
              {canTiming ? (
                <span className="action-cta">리포트{"\u00A0"}보기 <span aria-hidden="true">→</span></span>
              ) : (
                <>
                  <span className="action-cta" style={{ color: 'var(--text-3)' }}>업그레이드{"\u00A0"}필요</span>
                  <span className="lock-badge">STARTER+</span>
                </>
              )}
            </div>
          </Link>

          <Link
            to={canChannel ? '/channel' : '/pricing'}
            className={`action-card${canChannel ? '' : ' locked'}`}
          >
            <div className="action-icon" aria-hidden="true">◈</div>
            <div>
              <div className="action-name">채널 분석</div>
              <div className="action-desc">내 채널 최근 영상들이 현재 트렌드에서 얼마나 멀어지고 있는지, 영상별 적합도 점수와 추이를 보여드립니다.</div>
            </div>
            <div className="action-footer">
              {canChannel ? (
                <span className="action-cta">채널{"\u00A0"}분석하기 <span aria-hidden="true">→</span></span>
              ) : (
                <>
                  <span className="action-cta" style={{ color: 'var(--text-3)' }}>업그레이드{"\u00A0"}필요</span>
                  <span className="lock-badge">STARTER+</span>
                </>
              )}
            </div>
          </Link>
        </div>
      </main>
    </>
  )
}
