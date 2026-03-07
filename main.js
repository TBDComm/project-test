class YouTubeAnalyzer {
  constructor() {
    this.urlInput = document.getElementById('youtube-url');
    this.analyzeBtn = document.getElementById('analyze-btn');
    this.dashboard = document.getElementById('analysis-dashboard');
    this.videoEmbed = document.getElementById('video-embed');
    this.videoTitle = document.getElementById('video-title');
    this.sentimentScore = document.getElementById('sentiment-score');
    this.engagementIndex = document.getElementById('engagement-index');
    this.summaryList = document.getElementById('ai-summary');
    this.keywordCloud = document.getElementById('keyword-cloud');

    this.init();
  }

  init() {
    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.analyze();
    });
  }

  extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  async analyze() {
    const url = this.urlInput.value;
    const videoId = this.extractVideoId(url);

    if (!videoId) {
      alert('올바른 YouTube URL을 입력해주세요.');
      return;
    }

    this.showLoading();

    // Mock API Delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    this.renderAnalysis(videoId);
  }

  showLoading() {
    this.dashboard.classList.remove('hidden');
    this.videoTitle.textContent = "분석 중...";
    this.sentimentScore.textContent = "--";
    this.engagementIndex.textContent = "--";
    this.summaryList.innerHTML = "<li>AI가 영상을 시청하고 분석 중입니다...</li>";
    this.keywordCloud.innerHTML = "";
  }

  renderAnalysis(videoId) {
    this.videoEmbed.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    
    // Mock Data
    const mockData = {
      title: "AI가 분석한 추천 영상 통찰",
      sentiment: "84%",
      engagement: "Extremely High",
      summary: [
        "이 영상은 최신 기술 트렌드와 사용자 경험의 결합을 심도 있게 다룹니다.",
        "주요 타겟층은 2030 테크 애호가들이며, 긍정적인 반응이 지배적입니다.",
        "영상 중반부의 시각적 연출이 시청자 유지율을 크게 높이는 요소로 작용했습니다."
      ],
      keywords: ["인공지능", "미래기술", "사용자경험", "트렌드분석", "혁신", "디지털트랜스포메이션"]
    };

    this.videoTitle.textContent = mockData.title;
    this.sentimentScore.textContent = mockData.sentiment;
    this.engagementIndex.textContent = mockData.engagement;
    
    this.summaryList.innerHTML = mockData.summary.map(item => `<li>${item}</li>`).join('');
    this.keywordCloud.innerHTML = mockData.keywords.map(kw => `<span>#${kw}</span>`).join('');
    
    this.dashboard.scrollIntoView({ behavior: 'smooth' });
  }
}

class PartnershipModal {
  constructor() {
    this.modal = document.getElementById('partnership-modal');
    this.openBtn = document.getElementById('partnership-btn');
    this.closeBtn = document.getElementById('close-modal-btn');

    this.init();
  }

  init() {
    if (!this.modal || !this.openBtn || !this.closeBtn) return;

    this.openBtn.addEventListener('click', () => this.modal.showModal());
    this.closeBtn.addEventListener('click', () => this.modal.close());

    this.modal.addEventListener('click', (e) => {
      const rect = this.modal.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        this.modal.close();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new YouTubeAnalyzer();
  new PartnershipModal();
});
