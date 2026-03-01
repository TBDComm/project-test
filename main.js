class LottoGenerator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    --primary-color: #4a90e2;
                    --secondary-color: #f5a623;
                    --white: #ffffff;
                    --grey: #f0f2f5;
                    --text-color: #333;
                }

                .container {
                    background: var(--white);
                    padding: 2rem;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 400px;
                    margin: 20px;
                }

                h2 {
                    color: var(--primary-color);
                    font-weight: 600;
                    font-size: 1.8rem;
                    margin-bottom: 1rem;
                }

                button {
                    background: var(--primary-color);
                    color: var(--white);
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.3s ease, transform 0.2s ease;
                    margin-bottom: 1rem;
                }

                button:hover {
                    background: #357abd;
                    transform: translateY(-2px);
                }

                .numbers {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .number {
                    width: 50px;
                    height: 50px;
                    background: var(--secondary-color);
                    color: var(--white);
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    transform: scale(0);
                    animation: pop-in 0.5s ease forwards;
                }

                @keyframes pop-in {
                    to {
                        transform: scale(1);
                    }
                }
            </style>
            <div class="container">
                <h2>Lotto Number Generator</h2>
                <button>Generate Numbers</button>
                <div class="numbers"></div>
            </div>
        `;

        this.shadowRoot.querySelector('button').addEventListener('click', () => this.generateNumbers());
    }

    generateNumbers() {
        const numbersContainer = this.shadowRoot.querySelector('.numbers');
        numbersContainer.innerHTML = '';
        const numbers = new Set();
        while (numbers.size < 6) {
            numbers.add(Math.floor(Math.random() * 45) + 1);
        }

        Array.from(numbers).sort((a,b) => a-b).forEach((number, index) => {
            const numberElement = document.createElement('div');
            numberElement.classList.add('number');
            numberElement.textContent = number;
            numberElement.style.animationDelay = `${index * 0.1}s`;
            numbersContainer.appendChild(numberElement);
        });
    }
}

customElements.define('lotto-generator', LottoGenerator);