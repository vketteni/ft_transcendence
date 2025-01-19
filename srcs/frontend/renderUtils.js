import { DOM } from './dom.js';
import { clientState, serverState } from './state.js';

const EXTRAPOLATION_FACTOR = 0.2;
const SERVER_UPDATE_INTERVAL = 0.05;

export function clearCanvas() {
	DOM.ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
	DOM.ctx.drawImage(DOM.canvasImg, 0, 0, DOM.canvas.width, DOM.canvas.height);
}

export function drawRect(x, y, w, h, color) {
	DOM.ctx.fillStyle = color;
	DOM.ctx.fillRect(x, y, w, h);
}

export function drawBall(x, y, radius, color) {
	DOM.ctx.fillStyle = color;
	DOM.ctx.beginPath();
	DOM.ctx.arc(x, y, radius, 0, Math.PI * 2);
	DOM.ctx.closePath();
	DOM.ctx.fill();
}

export function extrapolateState() {
    // console.log("Extrapolating State:", serverState);

    const serverBall = serverState.ball;
    const clientBall = clientState.ball;

    const predictedX = serverBall.x + (serverBall.vx * SERVER_UPDATE_INTERVAL);
    const predictedY = serverBall.y + (serverBall.vy * SERVER_UPDATE_INTERVAL);

    clientBall.x += (predictedX - clientBall.x) * EXTRAPOLATION_FACTOR;
    clientBall.y += (predictedY - clientBall.y) * EXTRAPOLATION_FACTOR;

    clientState.paddles.left.y +=
        (serverState.paddles.left.y - clientState.paddles.left.y) * 0.2;
    clientState.paddles.right.y +=
        (serverState.paddles.right.y - clientState.paddles.right.y) * 0.2;
}


