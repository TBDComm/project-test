import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // 인증 페이지 — 최소 네비게이션
  if (location.pathname === '/auth') {
    return (
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="nav-logo">
            <span className="logo-icon" aria-hidden="true">M</span>
            MOMENTO
          </Link>
          <div className="nav-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggle}
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              <span className="theme-icon" aria-hidden="true">{theme === 'dark' ? '◆' : '◇'}</span>
            </button>
          </div>
        </div>
      </nav>
    )
  }

  // 결제 페이지 — 최소 네비게이션
  if (location.pathname === '/payment') {
    return (
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="nav-logo">
            <span className="logo-icon" aria-hidden="true">M</span>
            MOMENTO
          </Link>
          <div className="nav-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggle}
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              <span className="theme-icon" aria-hidden="true">{theme === 'dark' ? '◆' : '◇'}</span>
            </button>
            <Link to="/pricing" className="btn btn-ghost btn-sm">← 요금제로 돌아가기</Link>
          </div>
        </div>
      </nav>
    )
  }

  // 로그인 상태 — 앱 네비게이션
  if (user) {
    return (
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="nav-logo">
            <span className="logo-icon" aria-hidden="true">M</span>
            MOMENTO
          </Link>
          <div className="nav-links">
            <Link to="/dashboard" className={`nav-link${isActive('/dashboard') ? ' active' : ''}`}>대시보드</Link>
            <Link to="/spotlight" className={`nav-link${isActive('/spotlight') ? ' active' : ''}`}>Spotlight</Link>
            <Link to="/timing"    className={`nav-link${isActive('/timing')    ? ' active' : ''}`}>Timing</Link>
            <Link to="/pricing"   className={`nav-link${isActive('/pricing')   ? ' active' : ''}`}>요금제</Link>
          </div>
          <div className="nav-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggle}
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              <span className="theme-icon" aria-hidden="true">{theme === 'dark' ? '◆' : '◇'}</span>
            </button>
            <Link to="/mypage" className="btn btn-ghost btn-sm">마이페이지</Link>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      </nav>
    )
  }

  // 비로그인 상태 — 랜딩/공개 네비게이션
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-logo">
          <span className="logo-icon" aria-hidden="true">M</span>
          MOMENTO
        </Link>
        <div className="nav-links">
          <Link to="/pricing"  className={`nav-link${isActive('/pricing')  ? ' active' : ''}`}>요금제</Link>
          <a href="#features"  className="nav-link">기능</a>
        </div>
        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            <span className="theme-icon" aria-hidden="true">{theme === 'dark' ? '◆' : '◇'}</span>
          </button>
          <Link to="/auth"              className="btn btn-ghost btn-sm">로그인</Link>
          <Link to="/auth?mode=signup"  className="btn btn-primary btn-sm">무료로 시작하기</Link>
        </div>
      </div>
    </nav>
  )
}
