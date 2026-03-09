import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  // 라우트 변경 시 메뉴 닫기
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (window.innerWidth > 720 || !menuOpen) return undefined

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflow
    }
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const closeMenu = () => setMenuOpen(false)

  const themeBtn = (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      <span className="theme-icon" aria-hidden="true">{theme === 'dark' ? '◆' : '◇'}</span>
    </button>
  )

  const hamburgerBtn = (
    <button
      type="button"
      className="hamburger-btn"
      onClick={() => setMenuOpen(prev => !prev)}
      aria-expanded={menuOpen}
      aria-controls="mobile-nav-menu"
      aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
    >
      <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
    </button>
  )

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
            {themeBtn}
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
            {themeBtn}
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
          <Link to="/" className="nav-logo" onClick={closeMenu}>
            <span className="logo-icon" aria-hidden="true">M</span>
            MOMENTO
          </Link>
          <div className="nav-links">
            <Link to="/dashboard" className={`nav-link${isActive('/dashboard') ? ' active' : ''}`}>대시보드</Link>
            <Link to="/spotlight" className={`nav-link${isActive('/spotlight') ? ' active' : ''}`}>Spotlight</Link>
            <Link to="/timing"    className={`nav-link${isActive('/timing')    ? ' active' : ''}`}>Timing</Link>
            <Link to="/channel"   className={`nav-link${isActive('/channel')   ? ' active' : ''}`}>채널 분석</Link>
            <Link to="/pricing"   className={`nav-link${isActive('/pricing')   ? ' active' : ''}`}>요금제</Link>
          </div>
          <div className="nav-actions">
            {themeBtn}
            <Link to="/mypage" className="btn btn-ghost btn-sm nav-action-desktop">마이페이지</Link>
            <button type="button" className="btn btn-secondary btn-sm nav-action-desktop" onClick={handleLogout}>로그아웃</button>
            {hamburgerBtn}
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu" id="mobile-nav-menu">
            <Link to="/dashboard" className={`mobile-menu-link${isActive('/dashboard') ? ' active' : ''}`} onClick={closeMenu}>대시보드</Link>
            <Link to="/spotlight" className={`mobile-menu-link${isActive('/spotlight') ? ' active' : ''}`} onClick={closeMenu}>Spotlight</Link>
            <Link to="/timing"    className={`mobile-menu-link${isActive('/timing')    ? ' active' : ''}`} onClick={closeMenu}>Timing</Link>
            <Link to="/channel"   className={`mobile-menu-link${isActive('/channel')   ? ' active' : ''}`} onClick={closeMenu}>채널 분석</Link>
            <Link to="/pricing"   className={`mobile-menu-link${isActive('/pricing')   ? ' active' : ''}`} onClick={closeMenu}>요금제</Link>
            <hr className="mobile-menu-divider" aria-hidden="true" />
            <Link to="/mypage" className="mobile-menu-link" onClick={closeMenu}>마이페이지</Link>
            <button type="button" className="mobile-menu-link" onClick={() => { handleLogout(); closeMenu() }}>로그아웃</button>
          </div>
        )}
      </nav>
    )
  }

  // 비로그인 상태 — 랜딩/공개 네비게이션
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <span className="logo-icon" aria-hidden="true">M</span>
          MOMENTO
        </Link>
        <div className="nav-links">
          <Link to="/pricing"  className={`nav-link${isActive('/pricing')  ? ' active' : ''}`}>요금제</Link>
          <a href="#features"  className="nav-link">기능</a>
        </div>
        <div className="nav-actions">
          {themeBtn}
          <Link to="/auth"             className="btn btn-ghost btn-sm nav-action-desktop">로그인</Link>
          <Link to="/auth?mode=signup" className="btn btn-primary btn-sm nav-action-desktop">무료로 시작하기</Link>
          {hamburgerBtn}
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu" id="mobile-nav-menu">
          <Link to="/pricing"  className={`mobile-menu-link${isActive('/pricing') ? ' active' : ''}`} onClick={closeMenu}>요금제</Link>
          <a href="#features"  className="mobile-menu-link" onClick={closeMenu}>기능</a>
          <hr className="mobile-menu-divider" aria-hidden="true" />
          <Link to="/auth"             className="mobile-menu-link" onClick={closeMenu}>로그인</Link>
          <Link to="/auth?mode=signup" className="mobile-menu-link mobile-menu-cta" onClick={closeMenu}>무료로 시작하기</Link>
        </div>
      )}
    </nav>
  )
}
