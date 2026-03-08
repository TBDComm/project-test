import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { PLANS, getRemainingUses } from '../lib/utils'

const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

export default function MyPage() {
  const { user, userData } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [activeSection, setActiveSection] = useState('profile')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

  const plan = userData?.plan || 'free'
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '크리에이터'
  const avatarLetter = name[0]?.toUpperCase() || '?'
  const joinedStr = user?.created_at ? dateFormatter.format(new Date(user.created_at)) : '—'

  const endDate = userData?.subscriptionEnd ? new Date(userData.subscriptionEnd) : null
  const endStr = endDate ? dateFormatter.format(endDate) : '—'

  const usage = userData?.monthlyUsage || 0
  const isUnlim = plan !== 'free'
  const usageLimit = isUnlim ? '∞' : '5'
  const usagePct = isUnlim ? 0 : Math.min(100, (usage / 5) * 100)
  const remaining = getRemainingUses(userData)

  const handleCancelConfirm = async () => {
    setCancelLoading(true)
    try {
      await supabase.from('users').update({ cancel_requested: true }).eq('id', user.id)
      setCancelDone(true)
      setCancelOpen(false)
    } catch {
      alert('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setCancelLoading(false)
    }
  }

  const sections = [
    { key: 'profile',      label: '◇ 프로필' },
    { key: 'subscription', label: '◇ 구독 관리' },
    { key: 'usage',        label: '◇ 사용 현황' },
    { key: 'settings',     label: '◇ 설정' },
  ]

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="app-main" id="main-content">
        <div className="page-header">
          <h1 className="page-title">마이페이지</h1>
        </div>

        <div className="mypage-grid">
          <aside className="mypage-sidebar">
            {sections.map(s => (
              <button
                key={s.key}
                className={`mypage-nav-item${activeSection === s.key ? ' active' : ''}`}
                type="button"
                onClick={() => setActiveSection(s.key)}
              >
                {s.label}
              </button>
            ))}
          </aside>

          <div>
            {/* 프로필 */}
            {activeSection === 'profile' && (
              <div className="mypage-section active">
                <div className="card">
                  <div className="profile-avatar">{avatarLetter}</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{name}</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>{user?.email || ''}</p>
                  <hr className="divider" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-2)' }}>가입일</span>
                      <span>{joinedStr}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-2)' }}>현재 플랜</span>
                      <span style={{ fontWeight: 600 }}>{PLANS[plan]?.name || '무료'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 구독 관리 */}
            {activeSection === 'subscription' && (
              <div className="mypage-section active">
                <div className="subscription-status-card">
                  <div className="sub-status-label">현재 플랜</div>
                  <div className="sub-status-plan">{PLANS[plan]?.name || '무료'}</div>
                  <div className="sub-status-note">
                    {plan === 'free' ? '월 5회 Spotlight Compare' : `${endStr}까지 구독 중`}
                  </div>
                </div>

                {plan === 'free' ? (
                  <div>
                    <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 24 }}>
                      무료 플랜을 이용 중입니다. STARTER 플랜으로 업그레이드하면 Spotlight Compare를 무제한으로 사용하고
                      Timing Report도 이용할 수 있습니다.
                    </p>
                    <Link to="/pricing" className="btn btn-primary">플랜 업그레이드하기</Link>
                  </div>
                ) : (
                  <div>
                    {cancelDone && (
                      <div className="alert alert-success" style={{ marginBottom: 16 }}>
                        <span aria-hidden="true">✓</span>
                        <div>해지 신청이 완료되었습니다. 구독 만료일까지 서비스를 계속 이용할 수 있습니다.</div>
                      </div>
                    )}
                    <div className="card" style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>결제 정보</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-2)' }}>다음 결제일</span>
                          <span>{endStr}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-2)' }}>결제 금액</span>
                          <span>{(PLANS[plan]?.price || 0).toLocaleString('ko-KR')}원</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-2)' }}>결제 수단</span>
                          <span>등록된 카드</span>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-warning" style={{ marginBottom: 24 }}>
                      <span aria-hidden="true">!</span>
                      <div>해지 후에도 결제한 달 말까지는 현재 플랜을 계속 이용할 수 있습니다.</div>
                    </div>

                    {!cancelDone && (
                      <button className="btn btn-danger" type="button" onClick={() => setCancelOpen(true)}>
                        구독 해지하기
                      </button>
                    )}

                    {cancelOpen && (
                      <div style={{ marginTop: 24 }}>
                        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--error)' }}>
                            정말 해지하시겠습니까?
                          </h3>
                          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20 }}>
                            해지 후에도 <strong>{endStr}</strong>까지는 현재 플랜을 이용할 수 있습니다.
                            이후 무료 플랜으로 전환됩니다.
                          </p>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              className="btn btn-danger" type="button"
                              onClick={handleCancelConfirm}
                              disabled={cancelLoading}
                            >
                              {cancelLoading ? '처리 중…' : '네, 해지합니다'}
                            </button>
                            <button className="btn btn-secondary" type="button" onClick={() => setCancelOpen(false)}>
                              취소
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 사용 현황 */}
            {activeSection === 'usage' && (
              <div className="mypage-section active">
                <div className="card">
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>이번 달 사용 현황</h3>
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                      <span style={{ color: 'var(--text-2)' }}>Spotlight Compare</span>
                      <span>{usage} / {usageLimit}회</span>
                    </div>
                    <div className="usage-bar-track">
                      <div className="usage-bar-fill" style={{ width: `${usagePct}%` }} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>
                      매월 1일 초기화됩니다.
                    </p>
                  </div>
                  <hr className="divider" />
                  <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    {isUnlim
                      ? '현재 플랜에서는 Spotlight Compare를 무제한으로 사용할 수 있습니다.'
                      : `이번 달 ${remaining}회 남았습니다. 다음 달 1일에 5회로 초기화됩니다.`
                    }
                  </div>
                </div>
              </div>
            )}

            {/* 설정 */}
            {activeSection === 'settings' && (
              <div className="mypage-section active">
                <div className="card">
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>화면 설정</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>화면 모드</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>다크 모드와 라이트 모드 중 선택하세요.</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={toggleTheme}>
                      {theme === 'dark' ? '다크 모드' : '라이트 모드'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
