export class Timer {
    constructor(displayElement) {
        this.elapsedTime = 0; // Time in seconds
        this.intervalId = null;
        this.displayElement = displayElement; // Element where the timer will be displayed
    }

    start() {
        if (this.intervalId) {
            console.warn("Timer is already running.");
            return;
        }
        this.intervalId = setInterval(() => {
            this.elapsedTime++;
            this.updateDisplay();
        }, 1000); // Update every second
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    reset() {
        this.stop();
        this.elapsedTime = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.displayElement) {
            this.displayElement.textContent = `Time: ${this.elapsedTime}s`;
        } else {
            console.warn("No display element set for Timer.");
        }
    }
}
