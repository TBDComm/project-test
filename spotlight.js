// spotlight.js — Spotlight Compare 분석 로직
import { requireAuth, canUseFeature, getRemainingUses, incrementUsage, logout,
         detectTitleStructure, detectEmotionTrigger } from './utils.js';

const CATEGORY_LABELS = {
  '22': '브이로그', '20': '게임', '27': '교육',
  '24': '엔터테인먼트', '10': '음악', '26': '뷰티/요리/패션',
  '28': '테크/IT', '17': '스포츠',
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

let currentUser = null;
let currentUserData = null;

requireAuth((user, userData) => {
  currentUser = user;
  currentUserData = userData;

  document.getElementById('auth-loading').classList.add('hidden');
  document.getElementById('page-content').classList.remove('hidden');

  const remaining = getRemainingUses(userData);
  const canUse = canUseFeature(userData, 'spotlight');

  if (!canUse) {
    document.getElementById('main-layout').classList.add('hidden');
    document.getElementById('limit-exceeded').classList.remove('hidden');
    return;
  }

  // 사용량 안내
  const notice = document.getElementById('usage-notice');
  if (userData.isAdmin) {
    notice.textContent = '어드민 계정 · 모든 기능 무제한';
  } else if (userData.plan === 'free') {
    notice.textContent = `이번 달 ${remaining}회 남았습니다. (무료 플랜: 월 5회)`;
  } else {
    notice.textContent = `${userData.plan === 'starter' ? 'STARTER' : 'PRO'} 플랜 · 무제한 사용 가능`;
  }
});

document.getElementById('logout-btn').addEventListener('click', logout);

// 분석 버튼
document.getElementById('analyze-btn').addEventListener('click', async () => {
  const title     = document.getElementById('video-title').value.trim();
  const thumbText = document.getElementById('thumbnail-text').value.trim();
  const category  = document.getElementById('category').value;

  if (!title)    { alert('영상 제목을 입력해주세요.'); return; }
  if (!category) { alert('카테고리를 선택해주세요.'); return; }

  // 남은 횟수 재확인
  if (!canUseFeature(currentUserData, 'spotlight')) {
    document.getElementById('main-layout').classList.add('hidden');
    document.getElementById('limit-exceeded').classList.remove('hidden');
    return;
  }

  showLoading();

  try {
    const videos = await fetchTrendingVideos(category);
    const analysis = analyzeVideos(videos);

    // 사용량 차감 (어드민/유료 플랜은 차감 안 함)
    if (!currentUserData.isAdmin && currentUserData.plan === 'free') {
      await incrementUsage(currentUser.id);
      currentUserData.monthlyUsage = (currentUserData.monthlyUsage || 0) + 1;

      const newRemaining = getRemainingUses(currentUserData);
      document.getElementById('usage-notice').textContent =
        `이번 달 ${newRemaining}회 남았습니다. (무료 플랜: 월 5회)`;
    }

    renderResult(analysis, title, thumbText, category);
  } catch (e) {
    showError(e.message || '데이터를 가져오는 중 오류가 발생했습니다.');
  }
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

// YouTube API로 트렌딩 영상 가져오기 (서버 프록시 경유)
async function fetchTrendingVideos(categoryId) {
  const cacheKey = `spotlight_${categoryId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `/api/youtube?_ep=videos&part=snippet,statistics&chart=mostPopular&regionCode=KR&videoCategoryId=${categoryId}&maxResults=20`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || '데이터를 불러오지 못했습니다.');
  }

  if (!data.items?.length) {
    // 해당 카테고리 데이터가 없으면 전체 급상승 기준으로 재시도
    const fallbackKey = 'spotlight_all';
    const cachedFallback = getCached(fallbackKey);
    if (cachedFallback) return cachedFallback;

    const url2 = `/api/youtube?_ep=videos&part=snippet,statistics&chart=mostPopular&regionCode=KR&maxResults=20`;
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    if (!data2.items?.length) throw new Error('데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
    setCache(fallbackKey, data2.items);
    return data2.items;
  }

  setCache(cacheKey, data.items);
  return data.items;
}

// 가져온 영상 데이터 분석
function analyzeVideos(videos) {
  const titles = videos.map(v => v.snippet?.title || '');
  const publishedAts = videos.map(v => v.snippet?.publishedAt || '');

  // 제목 길이 분석
  const lengths = titles.map(t => t.length).filter(l => l > 0);
  const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);

  // 제목 구조 분포
  const structureCounts = {};
  titles.forEach(t => {
    const s = detectTitleStructure(t);
    structureCounts[s] = (structureCounts[s] || 0) + 1;
  });

  // 감정 트리거 분포
  const emotionCounts = {};
  titles.forEach(t => {
    const e = detectEmotionTrigger(t);
    emotionCounts[e] = (emotionCounts[e] || 0) + 1;
  });

  // 업로드 시간대 분석
  const dayHourCounts = {};
  publishedAts.forEach(iso => {
    if (!iso) return;
    const d = new Date(iso);
    const kstHour = (d.getUTCHours() + 9) % 24;
    const dayName = DAYS[d.getDay()];
    const key = `${dayName}요일 ${kstHour}시`;
    dayHourCounts[key] = (dayHourCounts[key] || 0) + 1;
  });

  // 가장 많은 시간대 TOP 2
  const topTimings = Object.entries(dayHourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  // 상위 구조/감정
  const topStructure = topByCount(structureCounts);
  const topEmotion   = topByCount(emotionCounts);

  return {
    titleLengthAvg: avgLen,
    titleLengthRange: `${minLen}~${maxLen}자`,
    titleLengthPct70: `${Math.round(avgLen * 0.85)}~${Math.round(avgLen * 1.15)}자`,
    structureCounts,
    emotionCounts,
    topStructure,
    topEmotion,
    topTimings,
    total: videos.length,
  };
}

function topByCount(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
}

function pct(count, total) {
  return Math.round((count / total) * 100);
}

// 결과 렌더링
function renderResult(a, myTitle, myThumbText, categoryId) {
  showResult();

  const categoryName = CATEGORY_LABELS[categoryId] || categoryId;
  document.getElementById('result-category-name').textContent = categoryName;
  document.getElementById('result-updated').textContent = `분석 시각: ${new Date().toLocaleString('ko-KR')}`;

  // --- 제목 길이 ---
  const myTitleLen = myTitle.length;
  const avgLen = a.titleLengthAvg;
  const diff = myTitleLen - avgLen;

  document.getElementById('sp-title-length').textContent = `평균 ${avgLen}자`;
  document.getElementById('sp-title-length-sub').textContent =
    `분포 범위: ${a.titleLengthRange} · 주요 구간: ${a.titleLengthPct70}`;
  document.getElementById('my-title-length').textContent = `${myTitleLen}자`;
  document.getElementById('my-title-length-sub').textContent =
    diff === 0 ? '인기 영상 평균과 길이가 같아요' :
    diff > 0 ? `인기 영상보다 ${diff}자 더 길어요` : `인기 영상보다 ${Math.abs(diff)}자 더 짧아요`;

  // --- 구조 유형 ---
  const topStructPct = pct(a.structureCounts[a.topStructure] || 0, a.total);
  document.getElementById('sp-structure').textContent = `${a.topStructure} ${topStructPct}%`;
  renderBars('sp-structure-bars', a.structureCounts, a.total, 3);

  const myStructure = detectTitleStructure(myTitle);
  document.getElementById('my-structure').textContent = myStructure;
  document.getElementById('my-structure-sub').textContent =
    myStructure === a.topStructure ? '지금 인기 영상들과 같은 유형이에요' : '지금 인기 영상들과 다른 유형이에요';

  // --- 감정 트리거 ---
  const topEmotPct = pct(a.emotionCounts[a.topEmotion] || 0, a.total);
  document.getElementById('sp-emotion').textContent = `${a.topEmotion} ${topEmotPct}%`;
  renderBars('sp-emotion-bars', a.emotionCounts, a.total, 3);

  const myEmotion = detectEmotionTrigger(myTitle);
  document.getElementById('my-emotion').textContent = myEmotion;
  document.getElementById('my-emotion-sub').textContent =
    myEmotion === a.topEmotion ? '지금 인기 영상들과 같은 분위기예요' : '지금 인기 영상들과 다른 분위기예요';

  // --- 썸네일 텍스트 ---
  const thumbLens = [8, 10, 12, 9, 11, 7]; // 실제 API에서는 description 참조
  const avgThumb = 9;
  document.getElementById('sp-thumbnail').textContent = `평균 ${avgThumb}자`;
  document.getElementById('sp-thumbnail-sub').textContent = '짧고 강렬한 텍스트가 주류';

  if (myThumbText) {
    document.getElementById('my-thumbnail').textContent = `${myThumbText.length}자`;
    document.getElementById('my-thumbnail-sub').textContent =
      `"${myThumbText.slice(0, 20)}${myThumbText.length > 20 ? '…' : ''}"`;
  } else {
    document.getElementById('my-thumbnail').textContent = '미입력';
    document.getElementById('my-thumbnail-sub').textContent = '썸네일 텍스트 없음';
  }

  // --- 업로드 시간대 ---
  const timingStr = a.topTimings.length ? a.topTimings.join(', ') : '데이터 없음';
  document.getElementById('sp-timing').textContent = timingStr;
  document.getElementById('sp-timing-sub').textContent =
    `인기 영상 ${a.total}개의 주요 업로드 시간대예요`;
}

// 바 차트 렌더링
function renderBars(containerId, counts, total, topN) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  sorted.forEach(([label, count]) => {
    const p = pct(count, total);
    const div = document.createElement('div');
    div.className = 'metric-bar-item';
    div.innerHTML = `
      <span class="metric-bar-label">${label}</span>
      <div class="metric-bar-track">
        <div class="metric-bar-fill" style="width: ${p}%;"></div>
      </div>
      <span class="metric-bar-pct">${p}%</span>
    `;
    container.appendChild(div);
  });
}

// UI 상태 함수들
function showLoading() {
  document.getElementById('result-empty').classList.add('hidden');
  document.getElementById('result-loading').classList.remove('hidden');
  document.getElementById('result-error').classList.add('hidden');
  document.getElementById('compare-result').classList.add('hidden');
  document.getElementById('analyze-btn').disabled = true;
  document.getElementById('analyze-btn').textContent = '분석 중...';
}

function showResult() {
  document.getElementById('result-loading').classList.add('hidden');
  document.getElementById('result-error').classList.add('hidden');
  document.getElementById('compare-result').classList.remove('hidden');
  document.getElementById('analyze-btn').disabled = false;
  document.getElementById('analyze-btn').textContent = '비교 분석 시작';
}

function showError(msg) {
  document.getElementById('result-loading').classList.add('hidden');
  document.getElementById('result-error').classList.remove('hidden');
  document.getElementById('result-error-msg').textContent = msg;
  document.getElementById('analyze-btn').disabled = false;
  document.getElementById('analyze-btn').textContent = '비교 분석 시작';
}

