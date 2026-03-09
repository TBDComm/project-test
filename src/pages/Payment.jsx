import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { supabase, TOSS_CLIENT_KEY } from '../lib/supabase'

const PLANS = {
  starter: { name: 'STARTER', price: 9900 },
  pro:     { name: 'PRO',     price: 19900 },
}

export default function Payment() {
  const { user, userData } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const planKey = searchParams.get('plan') || 'starter'
  const plan = PLANS[planKey] || PLANS.starter

  const [payerEmail, setPayerEmail] = useState('')
  const [payerName, setPayerName] = useState('')
  const [payError, setPayError] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (user) {
      setPayerEmail(user.email || '')
      setPayerName(user.user_metadata?.full_name || '')
    }
  }, [user])

  // 이미 해당 플랜이면 대시보드로
  useEffect(() => {
    if (userData?.plan === planKey) {
      navigate('/dashboard', { replace: true })
    }
  }, [userData, planKey, navigate])

  const handlePay = async () => {
    if (!payerEmail.trim() || !payerName.trim()) {
      setPayError('이름과 이메일을 입력해주세요.')
      return
    }
    setPayError('')

    if (TOSS_CLIENT_KEY === 'YOUR_TOSS_CLIENT_KEY') {
      await simulatePayment()
      return
    }

    setPaying(true)
    try {
      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY)
      const orderId = `MOMENTO-${user.id.slice(0, 8)}-${Date.now()}`
      await tossPayments.requestPayment('카드', {
        amount: plan.price,
        orderId,
        orderName: `MOMENTO ${plan.name} 구독`,
        customerEmail: payerEmail.trim(),
        customerName: payerName.trim(),
        successUrl: `${window.location.origin}/payment?plan=${planKey}&orderId=${orderId}&success=1`,
        failUrl: `${window.location.origin}/payment?plan=${planKey}&error=payment_failed`,
      })
    } catch (e) {
      if (e.code !== 'USER_CANCEL') {
        setPayError('결제 중 오류가 발생했습니다: ' + e.message)
      }
      setPaying(false)
    }
  }

  const simulatePayment = async () => {
    setPaying(true)
    await new Promise(r => setTimeout(r, 1500))

    const end = new Date()
    end.setMonth(end.getMonth() + 1)

    await supabase.from('users').update({
      plan: planKey,
      subscription_end: end.toISOString(),
    }).eq('id', user.id)

    alert(`[데모] ${plan.name} 구독이 활성화되었습니다!\n실제 서비스에서는 토스페이먼츠 결제가 진행됩니다.`)
    navigate('/dashboard', { replace: true })
  }

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="app-main page-shell-narrow" id="main-content">
        <div className="page-header">
          <h1 className="page-title">결제</h1>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-header-row">
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</h2>
            <span className="badge badge-purple">구독</span>
          </div>
          <hr className="divider" />
          <div className="info-list" style={{ fontSize: 15 }}>
            <div className="info-row">
              <span style={{ color: 'var(--text-2)' }}>플랜</span>
              <span style={{ fontWeight: 600 }}>{plan.name}</span>
            </div>
            <div className="info-row">
              <span style={{ color: 'var(--text-2)' }}>결제 금액</span>
              <span style={{ fontWeight: 700, fontSize: 18 }}>
                {new Intl.NumberFormat('ko-KR').format(plan.price)}원/월
              </span>
            </div>
            <div className="info-row">
              <span style={{ color: 'var(--text-2)' }}>결제 주기</span>
              <span>매월 자동 결제</span>
            </div>
            <div className="info-row">
              <span style={{ color: 'var(--text-2)' }}>해지</span>
              <span>언제든 가능</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>주문자 정보</h3>
          <div className="info-list">
            <div className="form-group">
              <label className="form-label" htmlFor="payer-email">이메일</label>
              <input
                type="email" id="payer-email" name="email" className="form-input"
                placeholder="결제 확인 이메일…"
                autoComplete="email" spellCheck="false"
                value={payerEmail} onChange={e => setPayerEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="payer-name">이름</label>
              <input
                type="text" id="payer-name" name="name" className="form-input"
                placeholder="홍길동…"
                autoComplete="name"
                value={payerName} onChange={e => setPayerName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <span aria-hidden="true">ℹ</span>
          <div>결제 후 즉시 플랜이 활성화됩니다. 해지 후에도 결제한 달 말까지 유지됩니다.</div>
        </div>

        {payError && (
          <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>{payError}</div>
        )}

        <button
          className="btn btn-primary btn-full btn-lg" type="button"
          onClick={handlePay}
          disabled={paying}
        >
          {paying ? '처리 중…' : '결제하기'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}>
          토스페이먼츠를 통한 안전한 결제
        </p>
      </main>
    </>
  )
}
