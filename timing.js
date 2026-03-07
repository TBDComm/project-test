// timing.js — Timing Report 분석 로직
import { requireAuth, canUseFeature, logout, getDateBefore, formatNumber } from './utils.js';
import { YOUTUBE_API_KEY } from './supabase-config.js';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

requireAuth((user, userData) => {
  document.getElementById('auth-loading').classList.add('hidden');

  const canUse = canUseFeature(userData, 'timing');

  if (!canUse) {
    document.getElementById('plan-locked').classList.remove('hidden');
    return;
  }

  document.getElementById('page-content').classList.remove('hidden');
});

document.getElementById('logout-btn').addEventListener('click', logout);

document.getElementById('timing-btn').addEventListener('click', async () => {
  const topic = document.getElementById('topic-input').value.trim();
  if (!topic) { alert('영상 주제를 입력해주세요.'); return; }

  showLoading();

  try {
    const data = await fetchTopicData(topic);
    renderResult(topic, data);
  } catch (e) {
    showError(e.message || '데이터를 가져오는 중 오류가 발생했습니다.');
  }
});

document.getElementById('topic-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('timing-btn').click();
});

async function fetchTopicData(topic) {
  if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
    return getDemoData(topic);
  }

  const after30 = getDateBefore(30);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&regionCode=KR&type=video&q=${encodeURIComponent(topic)}&order=viewCount&maxResults=20&publishedAfter=${after30}&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) throw new Error(`YouTube API 오류: ${data.error.message}`);
  if (!data.items?.length) throw new Error(`"${topic}" 주제의 최근 영상 데이터가 없습니다.`);

  // 영상 상세 정보 가져오기
  const ids = data.items.map(i => i.id.videoId).join(',');
  const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${YOUTUBE_API_KEY}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  // 전체 업로드 수 추정 (search.list totalResults)
  const totalResults = data.pageInfo?.totalResults || 0;

  return {
    videos: detailData.items || [],
    totalResults,
  };
}

function analyzeData(videos, totalResults) {
  const viewCounts = videos.map(v => Number(v.statistics?.viewCount || 0));
  const avgViews = Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length);

  // 업로드 시간대 분석
  const dayHourCounts = {};
  videos.forEach(v => {
    const iso = v.snippet?.publishedAt;
    if (!iso) return;
    const d = new Date(iso);
    const kstHour = (d.getUTCHours() + 9) % 24;
    const dayName = DAYS[d.getDay()];
    const key = `${dayName}요일 ${kstHour}시`;
    dayHourCounts[key] = (dayHourCounts[key] || 0) + 1;
  });

  const topTimings = Object.entries(dayHourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  // 포화도 계산 (30일 내 영상 수 기준)
  let saturation, satPct;
  if (totalResults > 500) {
    saturation = 'high';
    satPct = 90;
  } else if (totalResults > 100) {
    saturation = 'medium';
    satPct = 55;
  } else {
    saturation = 'low';
    satPct = 20;
  }

  return { avgViews, topTimings, saturation, satPct, totalResults };
}

function renderResult(topic, { videos, totalResults }) {
  const a = analyzeData(videos, totalResults);

  showResult();

  document.getElementById('result-topic').textContent = topic;
  document.getElementById('result-time').textContent = `분석 시각: ${new Date().toLocaleString('ko-KR')}`;

  // 포화도
  const satLabel = { low: '낮음', medium: '보통', high: '높음' }[a.saturation];
  const satDesc = {
    low:    '이 주제를 다룬 최근 영상이 비교적 적습니다.',
    medium: '이 주제를 다룬 영상이 꾸준히 올라오고 있습니다.',
    high:   '이 주제를 다룬 영상이 매우 많이 올라오고 있습니다.',
  }[a.saturation];

  const satEl = document.getElementById('saturation-label');
  const barEl = document.getElementById('saturation-bar');
  satEl.textContent = satLabel;
  satEl.className = `gauge-value ${a.saturation}`;
  barEl.className = `gauge-fill ${a.saturation}`;
  barEl.style.width = a.satPct + '%';
  document.getElementById('saturation-desc').textContent = satDesc;

  // 통계
  document.getElementById('upload-count').textContent = `약 ${formatNumber(a.totalResults)}개`;
  document.getElementById('upload-count-note').textContent = '최근 30일 이내 유튜브 한국 기준';

  document.getElementById('peak-timing').textContent = a.topTimings.length ? a.topTimings.join(', ') : '—';
  document.getElementById('peak-timing-note').textContent = '분석된 상위 영상들의 업로드 집중 시간 (KST)';

  document.getElementById('avg-views').textContent = formatNumber(a.avgViews) + '회';
  document.getElementById('avg-views-note').textContent = '최근 주목받은 관련 영상 평균 조회수';

  // 영상 목록
  const listEl = document.getElementById('video-list');
  listEl.innerHTML = '';

  const topVideos = [...videos]
    .sort((a, b) => Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0))
    .slice(0, 10);

  topVideos.forEach((v, i) => {
    const title     = v.snippet?.title || '제목 없음';
    const channel   = v.snippet?.channelTitle || '';
    const published = v.snippet?.publishedAt;
    const views     = formatNumber(Number(v.statistics?.viewCount || 0));
    const dateStr   = published ? formatDate(published) : '';

    const item = document.createElement('div');
    item.className = 'video-item';
    item.innerHTML = `
      <div class="video-rank">${i + 1}</div>
      <div class="video-info">
        <div class="video-title">${escapeHtml(title)}</div>
        <div class="video-meta">
          <span>${escapeHtml(channel)}</span>
          <span>조회수 ${views}</span>
          ${dateStr ? `<span>${dateStr}</span>` : ''}
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });

  if (!topVideos.length) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-title">영상 목록 없음</div></div>';
  }
}

const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

function formatDate(iso) {
  return dateFormatter.format(new Date(iso));
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// UI 상태
function showLoading() {
  document.getElementById('result-empty').classList.add('hidden');
  document.getElementById('result-loading').classList.remove('hidden');
  document.getElementById('result-error').classList.add('hidden');
  document.getElementById('timing-result').classList.add('hidden');
  document.getElementById('timing-btn').disabled = true;
  document.getElementById('timing-btn').textContent = '분석 중...';
}

function showResult() {
  document.getElementById('result-loading').classList.add('hidden');
  document.getElementById('result-error').classList.add('hidden');
  document.getElementById('timing-result').classList.remove('hidden');
  document.getElementById('timing-btn').disabled = false;
  document.getElementById('timing-btn').textContent = '시장 현황 분석';
}

function showError(msg) {
  document.getElementById('result-loading').classList.add('hidden');
  document.getElementById('result-error').classList.remove('hidden');
  document.getElementById('result-error-msg').textContent = msg;
  document.getElementById('timing-btn').disabled = false;
  document.getElementById('timing-btn').textContent = '시장 현황 분석';
}

// 데모 데이터
function getDemoData(topic) {
  const demoVideos = [
    { title: `${topic} 완전정복 가이드`, channel: '크리에이터A', views: 890000, hours: 18, day: 2 },
    { title: `${topic} 초보자 5가지 실수`, channel: '유튜버B',    views: 650000, hours: 20, day: 4 },
    { title: `${topic} 왜 실패할까? 충격적인 이유`, channel: '크리에이터C', views: 520000, hours: 19, day: 2 },
    { title: `${topic} 비밀 7가지`, channel: '채널D', views: 430000, hours: 21, day: 1 },
    { title: `${topic} 진짜 솔직 리뷰`, channel: '유튜버E', views: 380000, hours: 12, day: 0 },
    { title: `${topic} 6개월 후기`, channel: '크리에이터F', views: 310000, hours: 15, day: 6 },
    { title: `${topic} 해봤더니 이렇게 됨`, channel: '채널G', views: 280000, hours: 17, day: 3 },
    { title: `${topic} vs 기존 방법 비교`, channel: '유튜버H', views: 240000, hours: 19, day: 4 },
    { title: `${topic} 30일 챌린지 결과`, channel: '크리에이터I', views: 210000, hours: 20, day: 2 },
    { title: `${topic} 이것만 알면 됨`, channel: '채널J', views: 195000, hours: 18, day: 1 },
  ].map((d, i) => {
    const date = new Date('2026-03-06T00:00:00Z');
    date.setDate(date.getDate() - i * 2);
    date.setUTCHours(d.hours - 9);
    return {
      snippet: {
        title: d.title,
        channelTitle: d.channel,
        publishedAt: date.toISOString(),
      },
      statistics: { viewCount: String(d.views) },
    };
  });

  return { videos: demoVideos, totalResults: 187 };
}
