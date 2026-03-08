import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const FAQ_ITEMS = [
  {
    q: '해지하면 어떻게 되나요?',
    a: '언제든 해지할 수 있습니다. 해지해도 결제한 달 말까지는 모든 기능이 유지됩니다. 다음 달부터 무료 플랜으로 전환됩니다.',
  },
  {
    q: '무료 플랜 5회는 어떻게 계산되나요?',
    a: 'Spotlight Compare를 분석할 때마다 1회가 차감됩니다. 매월 1일에 5회로 초기화됩니다.',
  },
  {
    q: '어떤 결제 수단을 지원하나요?',
    a: '신용카드, 체크카드, 간편결제(카카오페이, 토스페이 등)를 지원합니다. 토스페이먼츠를 통해 안전하게 결제됩니다.',
  },
  {
    q: '데이터는 얼마나 최신 정보인가요?',
    a: 'YouTube Data API v3를 사용해 실시간으로 데이터를 가져옵니다. Spotlight Compare는 최근 7일 내 인기 영상, Timing Report는 최근 30일 기준입니다.',
  },
  {
    q: '환불이 가능한가요?',
    a: '결제일로부터 7일 이내, 서비스를 5회 이하 사용한 경우 전액 환불이 가능합니다. 환불 문의는 support@momento.kr로 연락해주세요.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="faq-item">
      <button
        className="faq-question"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        type="button"
      >
        {q}
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  )
}

export default function Pricing() {
  const { user } = useAuth()

  const subscribeHref = (plan) =>
    user
      ? `/payment?plan=${plan}`
      : `/auth?mode=signup&redirect=${encodeURIComponent(`/payment?plan=${plan}`)}`

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main id="main-content">
        <section className="section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">요금제</span>
              <h1 className="section-title">필요한 만큼만 구독하세요</h1>
              <p className="section-desc">
                무료 플랜으로 먼저 체험해보고, 필요할 때 업그레이드하세요.<br />
                언제든 해지 가능합니다.
              </p>
            </div>

            <div className="pricing-page-grid">
              {/* 무료 */}
              <div className="pricing-page-card">
                <div className="plan-name">무료</div>
                <div className="plan-price">0 <span className="unit">원</span></div>
                <div className="plan-period">영원히 무료</div>
                <ul className="plan-feature-list">
                  <li className="plan-feature-row"><i className="fi-check">✓</i> Spotlight Compare 월 5회</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 제목 길이 · 구조 · 감정 트리거 비교</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 업로드 시간대 패턴 비교</li>
                  <li className="plan-feature-row"><i className="fi-cross">✗</i> Timing Report</li>
                  <li className="plan-feature-row"><i className="fi-cross">✗</i> 무제한 Spotlight</li>
                </ul>
                {user ? (
                  <Link to="/dashboard" className="btn btn-secondary btn-full">대시보드로 이동</Link>
                ) : (
                  <Link to="/auth?mode=signup" className="btn btn-secondary btn-full">무료로 시작하기</Link>
                )}
              </div>

              {/* STARTER */}
              <div className="pricing-page-card featured">
                <div className="plan-badge">가장 인기</div>
                <div className="plan-name">STARTER</div>
                <div className="plan-price">9,900 <span className="unit">원</span></div>
                <div className="plan-period">/월 · 언제든 해지 가능</div>
                <ul className="plan-feature-list">
                  <li className="plan-feature-row"><i className="fi-check">✓</i> Spotlight Compare <strong>무제한</strong></li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> Timing Report 무제한</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 제목 길이 · 구조 · 감정 트리거 비교</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 업로드 시간대 패턴 비교</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 포화도 시장 현황 리포트</li>
                </ul>
                <Link className="btn btn-primary btn-full" to={subscribeHref('starter')}>
                  STARTER 구독하기
                </Link>
              </div>

              {/* PRO */}
              <div className="pricing-page-card">
                <div className="plan-name">PRO</div>
                <div className="plan-price">19,900 <span className="unit">원</span></div>
                <div className="plan-period">/월 · 언제든 해지 가능</div>
                <ul className="plan-feature-list">
                  <li className="plan-feature-row"><i className="fi-check">✓</i> STARTER 모든 기능</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 우선 분석 처리</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 리포트 PDF 내보내기</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 월간 트렌드 요약 리포트</li>
                  <li className="plan-feature-row"><i className="fi-check">✓</i> 우선 고객 지원</li>
                </ul>
                <Link className="btn btn-secondary btn-full" to={subscribeHref('pro')}>
                  PRO 구독하기
                </Link>
              </div>
            </div>

            <div className="pricing-faq">
              <h2 className="faq-title">자주 묻는 질문</h2>
              {FAQ_ITEMS.map(item => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
