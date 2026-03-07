class ThemeManager {
  constructor() {
    this.themeToggle = document.getElementById('theme-toggle');
    this.body = document.body;
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
    
    // Notify Disqus if needed (Disqus often handles this via its own internal logic or a reset)
    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true });
    }
  }

  applyTheme(theme) {
    this.body.className = `${theme}-theme`;
    this.themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';
  }
}

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
    
    const mockData = {
      title: "AI가 분석한 실시간 인사이트",
      sentiment: "89%",
      engagement: "매우 높음",
      summary: [
        "영상의 핵심 주제는 차세대 기술과 인문학의 융합입니다.",
        "시청자들의 반응은 기술적 완성도에 대해 매우 긍정적입니다.",
        "특히 3분 15초 지점의 데모 장면에서 가장 높은 몰입도가 관찰되었습니다."
      ],
      keywords: ["혁신", "테크", "AI", "트렌드", "분석", "미래"]
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
  new ThemeManager();
  new YouTubeAnalyzer();
  new PartnershipModal();
});
