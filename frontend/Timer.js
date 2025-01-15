export class Timer {
    constructor(displayElement) {
        this.startTime = null;
        this.elapsedTime = 0;
        this.intervalId = null;
        this.displayElement = displayElement;
    }

    start() {
        this.startTime = Date.now();
        this.updateDisplay();
        this.intervalId = setInterval(() => this.updateDisplay(), 1000);

        // Show the timer by removing the 'hidden' class
        if (this.displayElement) {
            this.displayElement.classList.remove('hidden');
        }
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.elapsedTime = Date.now() - this.startTime;
        this.updateDisplay();
    }

    reset() {
        this.startTime = null;
        this.elapsedTime = 0;
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.updateDisplay();
    }

    updateDisplay() {
        const time = this.elapsedTime || (Date.now() - this.startTime);
        const seconds = Math.floor((time / 1000) % 60);
        const minutes = Math.floor((time / (1000 * 60)) % 60);

        if (this.displayElement) {
            this.displayElement.textContent = `Matchmaking Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        } else {
            console.warn('Timer display element is not set.');
        }
    }
}
