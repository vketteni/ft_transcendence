import { GAME_CONFIG } from './config.js';
import { DOM } from './dom.js';
import { clientState, serverState, localState } from './state.js';
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
    const windowWidth = window.innerWidth * 0.6;
    const windowHeight = window.innerHeight * 0.6;

    const aspectRatio = GAME_CONFIG.canvasWidth / GAME_CONFIG.canvasHeight;

    let canvasWidth = windowWidth;
    let canvasHeight = canvasWidth / aspectRatio;

    if (canvasHeight > windowHeight) {
        canvasHeight = windowHeight;
        canvasWidth = canvasHeight * aspectRatio;
    }

    const widthScaleFactor = canvasWidth / GAME_CONFIG.canvasWidth;
    const heightScaleFactor = canvasHeight / GAME_CONFIG.canvasHeight;

    // Update canvas dimensions
    DOM.canvas.width = canvasWidth;
    DOM.canvas.height = canvasHeight;

    GAME_CONFIG.canvasWidth = canvasWidth;
    GAME_CONFIG.canvasHeight = canvasHeight;
    GAME_CONFIG.paddleWidth = canvasWidth * 0.02;
    GAME_CONFIG.paddleHeight = canvasHeight * 0.2;
    GAME_CONFIG.ballDiameter = canvasWidth * 0.025;

    localState.paddles.left.y *= heightScaleFactor;
    localState.paddles.right.y *= heightScaleFactor;

    localState.paddles.left.x = 0;
    localState.paddles.right.x = GAME_CONFIG.canvasWidth - GAME_CONFIG.paddleWidth;

    localState.ball.x *= widthScaleFactor;
    localState.ball.y *= heightScaleFactor;

    localState.ball.vx *= widthScaleFactor;
    localState.ball.vy *= heightScaleFactor;
}
