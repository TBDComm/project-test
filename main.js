// Mock Course Data
const courses = [
  { id: 'CS101', name: '컴퓨터 프로그래밍 기초', professor: '이철수', credits: 3, time: [{ day: 1, start: 9, end: 11 }, { day: 3, start: 9, end: 10 }], room: '공학관 101호' },
  { id: 'CS102', name: '자료구조', professor: '김영희', credits: 3, time: [{ day: 2, start: 10, end: 12 }, { day: 4, start: 10, end: 11 }], room: '공학관 202호' },
  { id: 'MATH101', name: '이산수학', professor: '박지성', credits: 3, time: [{ day: 1, start: 13, end: 15 }], room: '이학관 303호' },
  { id: 'ENG201', name: '고급 영어 회화', professor: 'John Doe', credits: 2, time: [{ day: 5, start: 9, end: 11 }], room: '교양관 404호' },
  { id: 'DES301', name: 'UI/UX 디자인', professor: '최유리', credits: 3, time: [{ day: 3, start: 14, end: 17 }], room: '예술관 505호' },
  { id: 'PHY101', name: '일반물리학', professor: '한석규', credits: 3, time: [{ day: 2, start: 14, end: 16 }, { day: 4, start: 14, end: 15 }], room: '과학관 102호' },
  { id: 'BA201', name: '마케팅 원론', professor: '정우성', credits: 3, time: [{ day: 1, start: 10, end: 12 }], room: '경영관 201호' },
  { id: 'HIS101', name: '한국의 역사', professor: '강호동', credits: 2, time: [{ day: 4, start: 11, end: 13 }], room: '인문관 101호' },
];

const days = ['시간', '월', '화', '수', '목', '금'];
const hours = Array.from({ length: 14 }, (_, i) => i + 9); // 9:00 to 22:00

class CourseRegistrationApp {
  constructor() {
    this.registeredCourses = new Set();
    this.totalCredits = 0;
    this.maxCredits = 21;

    this.init();
  }

  init() {
    this.renderTimetableGrid();
    this.renderCourseList(courses);
    this.setupEventListeners();
    this.updateCreditsDisplay();
  }

  setupEventListeners() {
    const searchInput = document.getElementById('course-search-input');
    const searchBtn = document.getElementById('search-btn');

    const handleSearch = () => {
      const query = searchInput.value.toLowerCase();
      const filtered = courses.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.professor.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
      );
      this.renderCourseList(filtered);
    };

    searchInput.addEventListener('input', handleSearch);
    searchBtn.addEventListener('click', handleSearch);
  }

  renderTimetableGrid() {
    const container = document.getElementById('timetable-container');
    container.innerHTML = '';

    // Headers
    days.forEach(day => {
      const header = document.createElement('div');
      header.className = 'grid-header';
      header.textContent = day;
      container.appendChild(header);
    });

    // Rows
    hours.forEach(hour => {
      const timeLabel = document.createElement('div');
      timeLabel.className = 'grid-time-label';
      timeLabel.textContent = `${hour}:00`;
      container.appendChild(timeLabel);

      for (let i = 1; i <= 5; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.day = i;
        cell.dataset.hour = hour;
        container.appendChild(cell);
      }
    });
  }

  renderCourseList(courseData) {
    const container = document.getElementById('course-list-container');
    container.innerHTML = '';

    courseData.forEach(course => {
      const isRegistered = this.registeredCourses.has(course.id);
      const item = document.createElement('div');
      item.className = 'course-item';
      item.innerHTML = `
        <div class="course-info">
          <h4>${course.name}</h4>
          <div class="course-meta">
            <span>${course.id}</span>
            <span>${course.professor}</span>
            <span>${course.credits}학점</span>
            <span>${this.formatTime(course.time)}</span>
          </div>
        </div>
        <button class="register-btn ${isRegistered ? 'cancel' : ''}" data-id="${course.id}">
          ${isRegistered ? '취소' : '신청'}
        </button>
      `;

      item.querySelector('button').addEventListener('click', () => this.toggleRegistration(course));
      container.appendChild(item);
    });
  }

  renderCart() {
    const container = document.getElementById('cart-container');
    container.innerHTML = '';

    if (this.registeredCourses.size === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">신청된 강의가 없습니다.</div>';
      return;
    }

    this.registeredCourses.forEach(courseId => {
      const course = courses.find(c => c.id === courseId);
      const item = document.createElement('div');
      item.className = 'course-item';
      item.style.animation = 'none';
      item.innerHTML = `
        <div class="course-info">
          <h4>${course.name}</h4>
          <div class="course-meta">
            <span>${course.credits}학점</span>
            <span>${course.professor}</span>
          </div>
        </div>
        <button class="register-btn cancel" data-id="${course.id}">취소</button>
      `;
      item.querySelector('button').addEventListener('click', () => this.toggleRegistration(course));
      container.appendChild(item);
    });
  }

  toggleRegistration(course) {
    if (this.registeredCourses.has(course.id)) {
      this.registeredCourses.delete(course.id);
      this.totalCredits -= course.credits;
    } else {
      // Check credits limit
      if (this.totalCredits + course.credits > this.maxCredits) {
        alert(`최대 수강 가능 학점(${this.maxCredits}학점)을 초과할 수 없습니다.`);
        return;
      }

      // Check time overlap
      if (this.hasTimeOverlap(course)) {
        alert('이미 신청한 강의와 시간이 겹칩니다.');
        return;
      }

      this.registeredCourses.add(course.id);
      this.totalCredits += course.credits;
    }

    this.updateCreditsDisplay();
    this.renderCourseList(courses);
    this.renderCart();
    this.updateTimetable();
  }

  hasTimeOverlap(newCourse) {
    for (let registeredId of this.registeredCourses) {
      const registeredCourse = courses.find(c => c.id === registeredId);
      for (let newTime of newCourse.time) {
        for (let regTime of registeredCourse.time) {
          if (newTime.day === regTime.day) {
            if (!(newTime.end <= regTime.start || newTime.start >= regTime.end)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  updateTimetable() {
    // Clear previous events
    document.querySelectorAll('.timetable-event').forEach(el => el.remove());

    this.registeredCourses.forEach(courseId => {
      const course = courses.find(c => c.id === courseId);
      course.time.forEach(t => {
        const startRow = t.start - 9 + 2; // +1 for header, +1 for 0-indexed adjustment
        const col = t.day + 1;
        const duration = t.end - t.start;

        const event = document.createElement('div');
        event.className = 'timetable-event';
        event.style.gridRow = `${startRow} / span ${duration}`;
        event.style.gridColumn = col;
        event.innerHTML = `<strong>${course.name}</strong><br>${course.room}`;
        
        document.getElementById('timetable-container').appendChild(event);
      });
    });
  }

  updateCreditsDisplay() {
    document.getElementById('total-credits').textContent = this.totalCredits;
  }

  formatTime(times) {
    return times.map(t => `${days[t.day]}(${t.start}:00-${t.end}:00)`).join(', ');
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  new CourseRegistrationApp();
});
