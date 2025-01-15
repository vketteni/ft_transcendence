import { GAME_CONFIG, setPlayerAlias, getPlayerAlias, socket, initializeWebSocket } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { serverState } from './state.js';
import { sendInput, sendAlias, sendDimensions } from './sendToBackend.js';

// Animation setup
const balls = [];
const NUM_BALLS = 50;

// Ball constructor
function Ball(x, y, dx, dy, radius, color) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.radius = radius;
    this.color = color;

    this.draw = function (ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    };

    this.update = function () {
        this.x += this.dx;
        this.y += this.dy;

        // Bounce off walls
        if (this.x + this.radius > DOM.backgroundCanvas.width || this.x - this.radius < 0) {
            this.dx *= -1;
        }
        if (this.y + this.radius > DOM.backgroundCanvas.height || this.y - this.radius < 0) {
            this.dy *= -1;
        }

        this.draw(DOM.backgroundCtx);
    };
}

// Initialize balls
function initBalls() {
    balls.length = 0; // Clear any existing balls
    for (let i = 0; i < NUM_BALLS; i++) {
        const radius = Math.random() * 10 + 5;
        const x = Math.random() * (DOM.backgroundCanvas.width - radius * 2) + radius;
        const y = Math.random() * (DOM.backgroundCanvas.height - radius * 2) + radius;
        const dx = (Math.random() - 0.5) * 2;
        const dy = (Math.random() - 0.5) * 2;
        const color = `rgba(255, 0, 0, ${Math.random() * 0.5 + 0.2})`; // Transparent red
        balls.push(new Ball(x, y, dx, dy, radius, color));
    }
}
initBalls();

// Animate the balls
function animateBackground() {
    DOM.backgroundCtx.clearRect(0, 0, DOM.backgroundCanvas.width, DOM.backgroundCanvas.height);

    balls.forEach((ball) => ball.update());

    requestAnimationFrame(animateBackground);
}
animateBackground();

