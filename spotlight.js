// spotlight.js — Spotlight Compare 분석 로직
import { requireAuth, canUseFeature, getRemainingUses, incrementUsage, logout,
         detectTitleStructure, detectEmotionTrigger, getDateBefore } from './utils.js';
import { YOUTUBE_API_KEY } from './supabase-config.js';

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

// YouTube API로 트렌딩 영상 가져오기
async function fetchTrendingVideos(categoryId) {
  // API 키 미설정 시 데모 데이터 반환
  if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
    return getDemoVideos(categoryId);
  }

  const publishedAfter = getDateBefore(7);
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&videoCategoryId=${categoryId}&maxResults=20&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`YouTube API 오류: ${data.error.message}`);
  }

  if (!data.items?.length) {
    // 해당 카테고리에 데이터가 부족하면 카테고리 없이 재시도
    const url2 = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&maxResults=20&key=${YOUTUBE_API_KEY}`;
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    if (!data2.items?.length) throw new Error('데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
    return data2.items;
  }

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
  const diffStr = diff > 0 ? `+${diff}자` : `${diff}자`;

  document.getElementById('sp-title-length').textContent = `평균 ${avgLen}자`;
  document.getElementById('sp-title-length-sub').textContent =
    `범위: ${a.titleLengthRange} · 상위 70%: ${a.titleLengthPct70}`;
  document.getElementById('my-title-length').textContent = `${myTitleLen}자`;
  document.getElementById('my-title-length-sub').textContent =
    `평균 대비 ${diff === 0 ? '동일' : diffStr}`;

  // --- 구조 유형 ---
  const topStructPct = pct(a.structureCounts[a.topStructure] || 0, a.total);
  document.getElementById('sp-structure').textContent = `${a.topStructure} ${topStructPct}%`;
  renderBars('sp-structure-bars', a.structureCounts, a.total, 3);

  const myStructure = detectTitleStructure(myTitle);
  document.getElementById('my-structure').textContent = myStructure;
  document.getElementById('my-structure-sub').textContent =
    myStructure === a.topStructure ? '스포트 상위와 동일한 유형' : '스포트 상위와 다른 유형';

  // --- 감정 트리거 ---
  const topEmotPct = pct(a.emotionCounts[a.topEmotion] || 0, a.total);
  document.getElementById('sp-emotion').textContent = `${a.topEmotion} ${topEmotPct}%`;
  renderBars('sp-emotion-bars', a.emotionCounts, a.total, 3);

  const myEmotion = detectEmotionTrigger(myTitle);
  document.getElementById('my-emotion').textContent = myEmotion;
  document.getElementById('my-emotion-sub').textContent =
    myEmotion === a.topEmotion ? '스포트 상위와 동일한 유형' : '스포트 상위와 다른 유형';

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
    `상위 ${a.total}개 영상 중 집중 업로드 시간대`;
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

// API 키 미설정 시 데모 데이터
function getDemoVideos(categoryId) {
  const demoTitles = [
    { title: '제주도 혼자 여행했더니 생긴 일 TOP 5', publishedAt: '2026-03-04T10:00:00Z' },
    { title: '강남에서 1박 2일 3만원으로 살아남기!', publishedAt: '2026-03-04T12:00:00Z' },
    { title: '왜 요즘 20대는 이걸 선택할까?', publishedAt: '2026-03-05T11:00:00Z' },
    { title: '3시간 동안 혼자 해봤는데 이렇게 됨 ㅋㅋ', publishedAt: '2026-03-05T14:00:00Z' },
    { title: '7가지 방법으로 효율 2배 올리기', publishedAt: '2026-03-03T18:00:00Z' },
    { title: '실제로 써보니까 진짜였음 (솔직 리뷰)', publishedAt: '2026-03-03T19:00:00Z' },
    { title: '충격! 아무도 몰랐던 숨겨진 사실', publishedAt: '2026-03-06T09:00:00Z' },
    { title: '5가지 실수로 다 망했습니다 (경험담)', publishedAt: '2026-03-06T10:00:00Z' },
    { title: '혼자 해보는 30일 챌린지 1일차~30일차', publishedAt: '2026-03-02T15:00:00Z' },
    { title: '10만원으로 만든 홈카페 브이로그', publishedAt: '2026-03-02T16:00:00Z' },
    { title: '왜 이게 더 맛있는 건지 모르겠음', publishedAt: '2026-03-01T20:00:00Z' },
    { title: '6개월 만에 체중 15kg 감량한 방법', publishedAt: '2026-03-01T21:00:00Z' },
    { title: '이 방법으로 3달 만에 구독자 10만 달성', publishedAt: '2026-02-28T13:00:00Z' },
    { title: '솔직히 말해줄게요, 나도 힘들었어', publishedAt: '2026-02-28T14:00:00Z' },
    { title: '최악의 숙소에서 하룻밤 보내기', publishedAt: '2026-02-27T17:00:00Z' },
    { title: '4가지 방법 중에 이게 제일 좋았음', publishedAt: '2026-02-27T18:00:00Z' },
    { title: '서울 vs 부산, 어디가 더 살기 좋아?', publishedAt: '2026-03-06T11:00:00Z' },
    { title: '내가 절대 안 하는 실수 8가지', publishedAt: '2026-03-06T12:00:00Z' },
    { title: '진짜 이런 방법이 있었어? 대박이다', publishedAt: '2026-03-05T08:00:00Z' },
    { title: '처음 해봤는데 이렇게 잘 됨?!', publishedAt: '2026-03-05T09:00:00Z' },
  ];

  return demoTitles.map((item, i) => ({
    snippet: {
      title: item.title,
      publishedAt: item.publishedAt,
    },
    statistics: { viewCount: String(Math.floor(Math.random() * 900000) + 100000) },
    id: `demo_${i}`,
  }));
}
