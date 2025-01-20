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
    DOM.canvas.width = GAME_CONFIG.canvasWidth;
    DOM.canvas.height = GAME_CONFIG.canvasHeight;

    // cancelAnimationFrame(renderLoop);
    // requestAnimationFrame(renderLoop);
}
