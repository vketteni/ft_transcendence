import { GAME_CONFIG, getPlayerAlias } from './config.js';
import { DOM } from './dom.js';
import { clientState, serverState } from './state.js';
import { clearCanvas, drawRect, drawBall, extrapolateState } from './renderUtils.js';

export function renderLoop() {
    clearCanvas();
    extrapolateState();
    render();
    requestAnimationFrame(renderLoop);
};

export function render() {
    drawRect(0, clientState.paddles.left.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
    drawRect(GAME_CONFIG.canvasWidth - GAME_CONFIG.paddleWidth, clientState.paddles.right.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
    if (serverState.ball.render)
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

    renderLoop();
}
