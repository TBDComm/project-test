class LottoGenerator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .container {
                    background: var(--card-bg, #ffffff);
                    color: var(--text-color, #333);
                    padding: 2.5rem;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px var(--shadow-color);
                    text-align: center;
                    width: 100%;
                    max-width: 450px;
                    transition: all 0.3s ease;
                }

                h2 {
                    color: var(--primary-color);
                    font-size: 2rem;
                    margin-bottom: 1.5rem;
                    letter-spacing: -0.5px;
                }

                .generate-btn {
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 2rem;
                    box-shadow: 0 4px 15px var(--shadow-color);
                }

                .generate-btn:hover {
                    opacity: 0.9;
                    transform: translateY(-2px);
                }

                .generate-btn:active {
                    transform: translateY(0);
                }

                .numbers {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 12px;
                    min-height: 60px;
                }

                .ball {
                    width: 55px;
                    height: 55px;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: white;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
                    box-shadow: inset -4px -4px 8px rgba(0,0,0,0.15), 
                                4px 4px 10px rgba(0,0,0,0.2);
                    transform: scale(0);
                    animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }

                @keyframes pop-in {
                    to { transform: scale(1); }
                }

                /* Ball Colors */
                .ball.range-1 { background: var(--ball-1); }
                .ball.range-11 { background: var(--ball-11); }
                .ball.range-21 { background: var(--ball-21); }
                .ball.range-31 { background: var(--ball-31); }
                .ball.range-41 { background: var(--ball-41); }
            </style>
            <div class="container">
                <h2>Lotto Numbers</h2>
                <button class="generate-btn">Lucky Draw ✨</button>
                <div class="numbers" id="numbers-display"></div>
            </div>
        `;

        this.shadowRoot.querySelector('.generate-btn').addEventListener('click', () => this.generateNumbers());
    }

    getBallColorClass(num) {
        if (num <= 10) return 'range-1';
        if (num <= 20) return 'range-11';
        if (num <= 30) return 'range-21';
        if (num <= 40) return 'range-31';
        return 'range-41';
    }

    generateNumbers() {
        const display = this.shadowRoot.getElementById('numbers-display');
        display.innerHTML = '';
        
        const numbers = new Set();
        while (numbers.size < 6) {
            numbers.add(Math.floor(Math.random() * 45) + 1);
        }

        const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);
        
        sortedNumbers.forEach((num, index) => {
            const ball = document.createElement('div');
            ball.className = `ball ${this.getBallColorClass(num)}`;
            ball.textContent = num;
            ball.style.animationDelay = `${index * 0.1}s`;
            display.appendChild(ball);
        });
    }
}

customElements.define('lotto-generator', LottoGenerator);

// Theme Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle';
    themeBtn.innerHTML = 'Toggle Theme 🌙';
    document.body.appendChild(themeBtn);

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        themeBtn.innerHTML = isDark ? 'Toggle Theme ☀️' : 'Toggle Theme 🌙';
    });
});
