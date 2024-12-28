import { GAME_CONFIG, getPlayerAlias } from './config.js';
import { DOM } from './dom.js';
import { clientState, serverState } from './state.js';
import { sendDimensions } from './sendToBackend.js';

const EXTRAPOLATION_FACTOR = 0.2;
const SERVER_UPDATE_INTERVAL = 0.05;

export function renderLoop() {
    extrapolateState();
    render();
    requestAnimationFrame(renderLoop);
};

function extrapolateState() {
    const serverBall = serverState.ball;
    const clientBall = clientState.ball;

    const predictedX = serverBall.x + (serverBall.vx) * SERVER_UPDATE_INTERVAL;
    const predictedY = serverBall.y + (serverBall.vy) * SERVER_UPDATE_INTERVAL;

    clientBall.x += (predictedX - clientBall.x) * EXTRAPOLATION_FACTOR;
    clientBall.y += (predictedY - clientBall.y) * EXTRAPOLATION_FACTOR;

   
    const PADDLE_SYNC_FACTOR = 0.2;
    clientState.paddles.left.y +=
        (serverState.paddles.left.y - clientState.paddles.left.y) * PADDLE_SYNC_FACTOR;
    clientState.paddles.right.y +=
        (serverState.paddles.right.y - clientState.paddles.right.y) * PADDLE_SYNC_FACTOR;
}

export function render() {
    clearCanvas();

    drawRect(0, clientState.paddles.left.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
    drawRect(GAME_CONFIG.canvasWidth - GAME_CONFIG.paddleWidth, clientState.paddles.right.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
    
    drawBall(clientState.ball.x, clientState.ball.y, GAME_CONFIG.ballDiameter / 2, GAME_CONFIG.ballColor);

    const fontSize = Math.floor(GAME_CONFIG.canvasHeight * 0.05);
    DOM.ctx.font = `${fontSize}px "Arial", sans-serif`;
    DOM.ctx.fillStyle = 'white';
    DOM.ctx.textAlign = 'center';

    const nameOffsetY = fontSize * 2.2;
    const scoreOffsetY = nameOffsetY + fontSize * 1.7;

    DOM.ctx.fillText(
        getPlayerAlias() || "Player 1",
        GAME_CONFIG.canvasWidth * 0.2,
        nameOffsetY
    );

    DOM.ctx.fillText(
        "Computer",
        GAME_CONFIG.canvasWidth * 0.8,
        nameOffsetY
    );

    DOM.ctx.fillText(
        serverState.paddles.left.score,
        GAME_CONFIG.canvasWidth * 0.2,
        scoreOffsetY
    );

    DOM.ctx.fillText(
        serverState.paddles.right.score,
        GAME_CONFIG.canvasWidth * 0.8,
        scoreOffsetY
    );
}

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

export function resizeCanvas() {
    const windowWidth = window.innerWidth * 0.6;
    const windowHeight = window.innerHeight * 0.6;

    const imageAspectRatio = DOM.canvasImg.width / DOM.canvasImg.height;

    let canvasWidth = windowWidth;
    let canvasHeight = canvasWidth / imageAspectRatio;

    if (canvasHeight > windowHeight) {
        canvasHeight = windowHeight;
        canvasWidth = canvasHeight * imageAspectRatio;
    }

    DOM.canvas.width = canvasWidth;
    DOM.canvas.height = canvasHeight;

    GAME_CONFIG.canvasWidth = canvasWidth;
    GAME_CONFIG.canvasHeight = canvasHeight;
    GAME_CONFIG.paddleWidth = canvasWidth * 0.02;
    GAME_CONFIG.paddleHeight = canvasHeight * 0.2;
    GAME_CONFIG.ballDiameter = canvasWidth * 0.025;

    clientState.paddles.left.y = canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2;
    clientState.paddles.right.y = canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2;
    clientState.ball.x = canvasWidth / 2;
    clientState.ball.y = canvasHeight / 2;

    sendDimensions();
    render();
}
