import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

function authErrorMsg(message) {
  if (!message) return '오류가 발생했습니다. 다시 시도해주세요.'
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return '이미 사용 중인 이메일입니다.'
  if (m.includes('password should be at least'))
    return '비밀번호는 6자 이상이어야 합니다.'
  if (m.includes('unable to validate email'))
    return '올바른 이메일 형식이 아닙니다.'
  if (m.includes('email not confirmed'))
    return '이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.'
  if (m.includes('too many requests'))
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  if (m.includes('network'))
    return '네트워크 오류가 발생했습니다.'
  return '오류가 발생했습니다. 다시 시도해주세요.'
}

function normalizeRedirectPath(value) {
  if (!value || typeof value !== 'string') return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default function Auth() {
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode')
  const redirect = normalizeRedirectPath(searchParams.get('redirect'))
  const [panel, setPanel] = useState(mode === 'signup' ? 'signup' : 'login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const loginEmailRef = useRef(null)
  const loginPasswordRef = useRef(null)
  const signupEmailRef = useRef(null)
  const signupPasswordRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate(redirect, { replace: true })
  }, [user, navigate, redirect])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail) {
      setLoginError('이메일과 비밀번호를 모두 입력해주세요.')
      loginEmailRef.current?.focus()
      return
    }
    if (!loginPassword) {
      setLoginError('이메일과 비밀번호를 모두 입력해주세요.')
      loginPasswordRef.current?.focus()
      return
    }
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) { setLoginError(authErrorMsg(error.message)); setLoginLoading(false) }
    // 성공 시 useEffect가 redirect 처리
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setSignupError('')
    setSignupSuccess(false)
    if (!signupEmail) {
      setSignupError('이메일과 비밀번호를 모두 입력해주세요.')
      signupEmailRef.current?.focus()
      return
    }
    if (!signupPassword) {
      setSignupError('이메일과 비밀번호를 모두 입력해주세요.')
      signupPasswordRef.current?.focus()
      return
    }
    if (signupPassword.length < 8) {
      setSignupError('비밀번호는 8자 이상이어야 합니다.')
      signupPasswordRef.current?.focus()
      return
    }
    setSignupLoading(true)
    const { data, error } = await supabase.auth.signUp({ email: signupEmail, password: signupPassword })
    if (error) {
      setSignupError(authErrorMsg(error.message))
      setSignupLoading(false)
    } else if (data.session) {
      // 이메일 인증 불필요 — useEffect가 처리
    } else {
      setSignupLoading(false)
      setSignupSuccess(true)
    }
  }

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + redirect },
    })
    if (error) {
      if (panel === 'login') setLoginError(authErrorMsg(error.message))
      else setSignupError(authErrorMsg(error.message))
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="auth-page" id="main-content">
        <div className="auth-box">
          <div className="auth-logo">
            <span className="logo-icon" aria-hidden="true">M</span>
            MOMENTO
          </div>

          {/* 로그인 패널 */}
          {panel === 'login' && (
            <div>
              <h1 className="auth-title">로그인</h1>
              <p className="auth-sub">계속하려면 로그인해주세요.</p>

              <button className="btn-google" onClick={handleGoogle} type="button">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google로 계속하기
              </button>

              <div className="auth-divider"><span className="auth-divider-text">또는</span></div>

              <form className="auth-form" onSubmit={handleLogin} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">이메일</label>
                  <input
                    type="email" id="login-email" name="email"
                    className="form-input" placeholder="이메일 주소…"
                    ref={loginEmailRef}
                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    autoComplete="email" spellCheck="false" required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-password">비밀번호</label>
                  <input
                    type="password" id="login-password" name="password"
                    className="form-input" placeholder="비밀번호…"
                    ref={loginPasswordRef}
                    value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    autoComplete="current-password" required
                  />
                </div>
                {loginError && <div className="auth-error" role="alert">{loginError}</div>}
                <button type="submit" className="btn btn-primary btn-full" style={{ padding: 13 }} disabled={loginLoading}>
                  {loginLoading ? '로그인 중…' : '로그인'}
                </button>
              </form>
              <p className="auth-switch">
                계정이{"\u00A0"}없으신가요?{' '}
                <button type="button" className="btn-link" onClick={() => setPanel('signup')}>회원가입</button>
              </p>
            </div>
          )}

          {/* 회원가입 패널 */}
          {panel === 'signup' && (
            <div>
              <h1 className="auth-title">무료로 시작하기</h1>
              <p className="auth-sub">신용카드 없이 바로 시작할 수 있습니다.</p>

              <button className="btn-google" onClick={handleGoogle} type="button">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google로 계속하기
              </button>

              <div className="auth-divider"><span className="auth-divider-text">또는</span></div>

              <form className="auth-form" onSubmit={handleSignup} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-email">이메일</label>
                  <input
                    type="email" id="signup-email" name="email"
                    className="form-input" placeholder="이메일 주소…"
                    ref={signupEmailRef}
                    value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                    autoComplete="email" spellCheck="false" required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-password">비밀번호</label>
                  <input
                    type="password" id="signup-password" name="new-password"
                    className="form-input" placeholder="8자 이상…"
                    ref={signupPasswordRef}
                    value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                    autoComplete="new-password" required
                  />
                </div>
                {signupError && <div className="auth-error" role="alert">{signupError}</div>}
                {signupSuccess && (
                  <div className="auth-error" style={{ color: 'var(--text-1)', background: 'rgba(5,150,105,.08)', borderColor: 'rgba(5,150,105,.18)' }} role="status">
                    가입이 완료됐습니다! 받은 메일함에서 인증 링크를 클릭한 후 로그인해주세요.
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-full" style={{ padding: 13 }} disabled={signupLoading}>
                  {signupLoading ? '가입 중…' : '무료로 시작하기'}
                </button>
              </form>
              <p className="auth-switch">
                이미{"\u00A0"}계정이{"\u00A0"}있으신가요?{' '}
                <button type="button" className="btn-link" onClick={() => setPanel('login')}>로그인</button>
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
