import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Index() {
  const observerRef = useRef(null)

  // 스크롤 애니메이션
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running'
        }
      })
    }, { threshold: 0.1 })

    document.querySelectorAll('.fade-in-up').forEach(el => {
      el.style.animationPlayState = 'paused'
      observerRef.current.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault()
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <Navbar />

      {/* 히어로 */}
      <section className="hero" id="main-content">
        <div className="container">
          <div className="hero-eyebrow">
            <span aria-hidden="true">✦</span>
            한국 유튜브 크리에이터 전용
          </div>
          <h1 className="hero-title">
            지금 이 카테고리에서<br />
            <span className="text-gradient">뜨는 영상들</span>은<br />
            이런 패턴입니다
          </h1>
          <p className="hero-sub">
            조회수가 좋은 건지 나쁜 건지 모르겠다면, 기준이 없는 겁니다.<br />
            MOMENTO는 지금 스포트된 상위 영상들과 내 영상을 나란히 보여줍니다.
          </p>
          <div className="hero-actions">
            <Link to="/auth?mode=signup" className="btn btn-primary btn-lg">무료로 시작하기 →</Link>
            <a href="#preview" className="btn btn-secondary btn-lg" onClick={(e) => handleSmoothScroll(e, 'preview')}>미리보기</a>
          </div>
          <p className="hero-note">신용카드 불필요 · 월 5회 무료</p>
        </div>
      </section>

      {/* 비교 리포트 미리보기 */}
      <section className="preview-wrapper" id="preview">
        <div className="container">
          <p className="preview-label">Spotlight Compare 리포트 예시</p>
          <div className="compare-preview">
            <div className="compare-preview-header">
              <div className="compare-col-header spotlight">✦ 지금 인기 영상 패턴 (상위 20개)</div>
              <div className="compare-col-header mine">내 영상</div>
            </div>
            {[
              {
                label: '제목 길이',
                spValue: '평균 18~22자', spSub: '상위 70%가 이 범위 안에 있음',
                myValue: '31자', mySub: '평균 대비 +9~13자 초과',
              },
              {
                label: '제목 구조 유형',
                spValue: '숫자가 들어간 제목 68%', spSub: '질문형 20% · 감탄·강조형 12%',
                myValue: '정보·가이드형', mySub: '숫자·리스트 없는 제목이에요',
              },
              {
                label: '감정 트리거',
                spValue: '궁금증 유발형 52%', spSub: '공감·감성형 28% · 일반형 20%',
                myValue: '일반형', mySub: '특별한 감정 자극 없는 제목이에요',
              },
              {
                label: '업로드 집중 시간대',
                spValue: '화·목 오후 7~9시', spSub: '주말 집중도는 낮음',
                myValue: '일요일 오전 11시', mySub: '스포트 집중 시간대 외',
              },
            ].map((row) => (
              <div className="compare-row" key={row.label}>
                <div className="compare-cell spotlight-cell">
                  <div className="cell-label">{row.label}</div>
                  <div className="cell-value">{row.spValue}</div>
                  <div className="cell-sub">{row.spSub}</div>
                </div>
                <div className="compare-cell mine-cell">
                  <div className="cell-label">{row.label}</div>
                  <div className="cell-value">{row.myValue}</div>
                  <div className="cell-sub">{row.mySub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 문제 제기 */}
      <section className="problem-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">왜 MOMENTO인가</span>
            <h2 className="section-title">수치는 보이지만<br />기준이 없습니다</h2>
          </div>
          <div className="problem-grid">
            {[
              {
                title: '클릭률 4.2%가 좋은 건가요?',
                desc: '유튜브 스튜디오가 수치를 보여주지만, 그게 잘 되고 있는 건지 아닌지는 알 수 없습니다. 비교할 기준 자체가 없기 때문입니다.',
              },
              {
                title: '지금 뭐가 먹히는지 모른다',
                desc: '같은 카테고리에서 요즘 어떤 제목 구조가 통하는지, 어떤 업로드 타이밍이 주목받는지 직접 조사하는 건 너무 번거롭습니다.',
              },
              {
                title: '조언은 많지만 기준이 없다',
                desc: '어떤 채널에나 통하는 공식은 없습니다. 지금 내 카테고리에서 실제로 주목받은 영상들과 내 영상을 같은 화면에 놓으면, 보이지 않던 것들이 보이기 시작합니다.',
              },
            ].map((card) => (
              <div className="problem-card fade-in-up" key={card.title}>
                <div className="problem-icon" aria-hidden="true">◆</div>
                <h3 className="problem-title">{card.title}</h3>
                <p className="problem-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 기능 소개 — 교차 레이아웃 */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="section-label">핵심 기능</span>
            <h2 className="section-title">두 가지 도구로<br />현재 시장을 읽습니다</h2>
            <p className="section-desc">
              지금 이 카테고리에서 실제로 주목받은 영상들의 공통 패턴을 수치로 확인합니다.
            </p>
          </div>

          {/* Spotlight Compare */}
          <div className="feature-row">
            <div className="feature-text">
              <span className="section-label">Spotlight Compare</span>
              <h3 className="feature-text-title">내 영상 옆에<br />인기 영상들의 패턴을 놓아드립니다</h3>
              <p className="feature-text-desc">
                내 영상 제목과 카테고리를 입력하면, 지금 그 카테고리에서 주목받는 상위 20개 영상의
                패턴이 내 영상 옆에 펼쳐집니다. 제목 길이, 구조, 감정 트리거, 업로드 타이밍까지 한눈에.
              </p>
              <div className="feature-tag-list">
                {['제목 길이 비교', '구조 유형 분포', '감정 트리거 분석', '업로드 시간대', '썸네일 텍스트 길이'].map(tag => (
                  <span className="feature-tag" key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="feature-visual">
              <div className="feature-visual-header">
                <span aria-hidden="true">✦</span> 브이로그 · 상위 20개 기준
              </div>
              <div className="fv-metric">
                <div className="fv-metric-cell">
                  <div className="fv-metric-label">제목 길이</div>
                  <div className="fv-metric-value">평균 20자</div>
                  <div className="fv-metric-sub">분포 14~28자</div>
                </div>
                <div className="fv-metric-cell">
                  <div className="fv-metric-label">내 영상</div>
                  <div className="fv-metric-value">31자</div>
                  <div className="fv-metric-sub">평균보다 11자 초과</div>
                </div>
              </div>
              <div className="fv-bar-list">
                {[{ label: '숫자·리스트', pct: 68 }, { label: '질문형', pct: 20 }, { label: '감탄·강조', pct: 12 }].map(({ label, pct }) => (
                  <div className="fv-bar-item" key={label}>
                    <span className="fv-bar-label">{label}</span>
                    <div className="fv-bar-track"><div className="fv-bar-fill" style={{ width: `${pct}%` }}></div></div>
                    <span className="fv-bar-pct">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timing Report */}
          <div className="feature-row reverse">
            <div className="feature-text">
              <span className="section-label">Timing Report</span>
              <h3 className="feature-text-title">만들기 전에<br />시장 현황부터 확인하세요</h3>
              <p className="feature-text-desc">
                만들고 싶은 주제를 입력하면, 최근 30일간 그 시장에서 어떤 흐름이 있었는지 수치로 확인합니다.
                포화도, 업로드 빈도, 주목받은 타이밍을 한눈에 파악하세요.
              </p>
              <div className="feature-tag-list">
                {['주제 포화도', '최근 업로드 빈도', '주목받은 영상 타이밍', '평균 조회수', '시장 현황 리포트'].map(tag => (
                  <span className="feature-tag" key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="feature-visual">
              <div className="feature-visual-header">
                <span aria-hidden="true">◇</span> "다이어트" 주제 현황 분석
              </div>
              <div className="fv-saturation">
                <div className="fv-sat-label">주제 포화도</div>
                <div className="fv-sat-value">보통</div>
                <div className="fv-sat-bar-track"><div className="fv-sat-bar-fill"></div></div>
              </div>
              <div className="fv-stat-list">
                {[
                  { label: '최근 30일 업로드 수', value: '약 320개' },
                  { label: '주목받은 업로드 시간대', value: '화요일 오후 8시' },
                  { label: '평균 조회수', value: '12.4만 회' },
                ].map(({ label, value }) => (
                  <div className="fv-stat-item" key={label}>
                    <span className="fv-stat-label">{label}</span>
                    <span className="fv-stat-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 요금제 요약 */}
      <section className="section" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">요금제</span>
            <h2 className="section-title">먼저 무료로 써보세요</h2>
            <p className="section-desc">신용카드 없이 바로 시작할 수 있습니다.</p>
          </div>
          <div className="pricing-preview">
            <div className="pricing-card">
              <div className="pricing-plan-name">무료</div>
              <div className="pricing-price">0<span>원</span></div>
              <div className="pricing-period">매월 무료</div>
              <ul className="pricing-features">
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> Spotlight Compare 월 5회</li>
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> 기본 비교 리포트</li>
              </ul>
              <Link to="/auth?mode=signup" className="btn btn-secondary btn-full">시작하기</Link>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">가장 인기</div>
              <div className="pricing-plan-name">STARTER</div>
              <div className="pricing-price">9,900<span>원</span></div>
              <div className="pricing-period">/월</div>
              <ul className="pricing-features">
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> Spotlight Compare 무제한</li>
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> Timing Report</li>
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> 전체 비교 리포트</li>
              </ul>
              <Link to="/pricing" className="btn btn-primary btn-full">구독하기</Link>
            </div>
            <div className="pricing-card">
              <div className="pricing-plan-name">PRO</div>
              <div className="pricing-price">19,900<span>원</span></div>
              <div className="pricing-period">/월</div>
              <ul className="pricing-features">
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> STARTER 모든 기능</li>
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> 우선 분석 처리</li>
                <li className="pricing-feature-item"><span className="check" aria-hidden="true">✓</span> 리포트 내보내기</li>
              </ul>
              <Link to="/pricing" className="btn btn-secondary btn-full">구독하기</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center', background: 'var(--bg-0)' }}>
        <div className="container">
          <h2 className="section-title" style={{ maxWidth: 600, margin: '0 auto 20px' }}>
            지금 내 카테고리의 스포트 패턴을<br />확인해보세요
          </h2>
          <p className="section-desc" style={{ marginBottom: 40 }}>
            무료 플랜으로 바로 시작할 수 있습니다.
          </p>
          <Link to="/auth?mode=signup" className="btn btn-primary btn-lg">무료로 시작하기 →</Link>
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-3)' }}>월 5회 무료 · 신용카드 불필요</p>
        </div>
      </section>

      <Footer />
    </>
  )
}
