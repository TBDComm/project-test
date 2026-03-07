// timing.js — Timing Report 분석 로직
import { requireAuth, canUseFeature, logout, getDateBefore, formatNumber } from './utils.js';

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

// YouTube API 캐시 (localStorage, TTL 3시간)
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

function getCached(key) {
  try {
    const raw = localStorage.getItem('yt_cache_' + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem('yt_cache_' + key); return null; }
    return data;
  } catch { return null; }
}

function setCache(key, data) {
  try { localStorage.setItem('yt_cache_' + key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// 주제 데이터 가져오기 (서버 프록시 경유)
async function fetchTopicData(topic) {
  const cacheKey = `timing_${topic}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const after30 = getDateBefore(30);
  const url = `/api/youtube?_ep=search&part=snippet&regionCode=KR&type=video&q=${encodeURIComponent(topic)}&order=viewCount&maxResults=20&publishedAfter=${encodeURIComponent(after30)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) throw new Error(data.error.message || '데이터를 불러오지 못했습니다.');
  if (!data.items?.length) throw new Error(`"${topic}" 관련 최근 영상 데이터가 없습니다.`);

  // 영상 상세 정보 (조회수 등) 가져오기
  const ids = data.items.map(i => i.id.videoId).join(',');
  const detailUrl = `/api/youtube?_ep=videos&part=snippet,statistics&id=${encodeURIComponent(ids)}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  const totalResults = data.pageInfo?.totalResults || 0;

  const result = {
    videos: detailData.items || [],
    totalResults,
  };

  setCache(cacheKey, result);
  return result;
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

