import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function NotFound() {
  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />
      <main className="app-main" id="main-content">
        <div className="empty-state" style={{ maxWidth: 640, margin: '64px auto 0' }}>
          <div className="empty-icon" aria-hidden="true">!</div>
          <h1 className="empty-title">페이지를 찾을 수 없습니다</h1>
          <p className="empty-desc">주소가 잘못되었거나 페이지가 이동되었습니다.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 12 }}>
            홈으로 이동
          </Link>
        </div>
      </main>
    </>
  )
}
