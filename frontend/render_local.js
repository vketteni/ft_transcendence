import { GAME_CONFIG } from './config.js';
import { localState, resetLocalState } from './state.js';
import { DOM } from './dom.js';
import { drawRect, drawBall } from './renderUtils.js';
import { showScreen } from './showScreen.js';
import { localTournament, checkTournamentProgress } from './localTournament.js';
import { localTour } from './buttons.js';

export let lgPlayers = [];

export function localRenderLoop () {
	if (localState.gameStarted) {
        DOM.ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
		updateLocalGame();
        localRender();
        requestAnimationFrame(localRenderLoop);
    }
}

function updateLocalGame() {
    if (!localState.isPaused) {
        movePaddles();
        moveBall();
    }
    handleBallCollisions();
    checkScoring();
}

function movePaddles() {
    const paddleSpeed = 8;

    if (localState.paddles.left.up && localState.paddles.left.y > 0) {
        localState.paddles.left.y -= paddleSpeed;
    }
    if (localState.paddles.left.down && localState.paddles.left.y < GAME_CONFIG.canvasHeight - GAME_CONFIG.paddleHeight) {
        localState.paddles.left.y += paddleSpeed;
    }
    if (localState.paddles.right.up && localState.paddles.right.y > 0) {
        localState.paddles.right.y -= paddleSpeed;
    }
    if (localState.paddles.right.down && localState.paddles.right.y < GAME_CONFIG.canvasHeight - GAME_CONFIG.paddleHeight) {
        localState.paddles.right.y += paddleSpeed;
    }
}

function moveBall() {
    localState.ball.x += localState.ball.vx;
    localState.ball.y += localState.ball.vy;
}


function handleBallCollisions() {
    const ballRadius = GAME_CONFIG.ballDiameter / 2;
    const speedingFactor = 1.1;

    // Ball collision with top/bottom walls
    if (localState.ball.y - ballRadius <= 0 || localState.ball.y + ballRadius >= GAME_CONFIG.canvasHeight) {
        localState.ball.vy *= -1; 
    }

    // Ball collision with left paddle
    if (isCollidingWithPaddle(localState.paddles.left, true)) {
        adjustBallAngle(localState.paddles.left);
        localState.ball.vx *= -speedingFactor; 
    }

    // Ball collision with right paddle
    if (isCollidingWithPaddle(localState.paddles.right, false)) {
        adjustBallAngle(localState.paddles.right);
        localState.ball.vx *= -speedingFactor; 
    }
}

function isCollidingWithPaddle(paddle, isLeftPaddle) {
    const ball = localState.ball;
    const ballRadius = GAME_CONFIG.ballDiameter / 2;

    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + GAME_CONFIG.paddleHeight;
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + GAME_CONFIG.paddleWidth;

    let horizontalCollision;
    if (isLeftPaddle) {
        horizontalCollision = (ball.x - ballRadius <= paddleRight) && (ball.x + ballRadius >= paddleLeft);
    } else {
        horizontalCollision = (ball.x + ballRadius >= paddleLeft) && (ball.x - ballRadius <= paddleRight);
    }
    const verticalCollision = (ball.y + ballRadius >= paddleTop) && (ball.y - ballRadius <= paddleBottom);

    return horizontalCollision && verticalCollision;
}

function adjustBallAngle(paddle) {
    const paddleCenter = paddle.y + GAME_CONFIG.paddleHeight / 2;
    const hitPosition = (localState.ball.y - paddleCenter) / (GAME_CONFIG.paddleHeight / 2);

    localState.ball.vy += hitPosition * 1.5;
}

function checkScoring() {
    if (localState.ball.x <= 0) {
        localState.paddles.right.score++;
        handleScoreEvent(localState.paddles.right);
    } else if (localState.ball.x >= GAME_CONFIG.canvasWidth) {
        localState.paddles.left.score++;
        handleScoreEvent(localState.paddles.left);
    }
}

function handleScoreEvent(player) {
    if (player.score >= 10) {
        let winner;
        if (localTour) {
            checkTournamentProgress();
        } else {
            winner = player === localState.paddles.left ? lgPlayers[0] : lgPlayers[1];
            DOM.lgGameOverMessage.textContent = `Game Over! ${winner} wins!`;
            showScreen('lg-game-over-screen');
        }
        resetLocalState();
    } else {
        resetBall();
    }
}

function resetBall() {
    const previousVx = localState.ball.vx || 1;
    const direction = previousVx > 0 ? 1 : -1;

    localState.ball.x = GAME_CONFIG.canvasWidth / 2;
    localState.ball.y = GAME_CONFIG.canvasHeight / 2;
    
    localState.ball.vx = direction * GAME_CONFIG.ballSpeed;
    localState.ball.vy = (Math.random() * 2 - 1) * GAME_CONFIG.ballSpeed;
}

function localRender() {
    drawRect( 0, localState.paddles.left.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
	drawRect(GAME_CONFIG.canvasWidth - GAME_CONFIG.paddleWidth, localState.paddles.right.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
	drawBall(localState.ball.x, localState.ball.y, GAME_CONFIG.ballDiameter / 2, GAME_CONFIG.ballColor)
	    
    const fontSize = Math.floor(GAME_CONFIG.canvasHeight * 0.05);
	DOM.ctx.font = `${fontSize}px "Arial", sans-serif`;
    DOM.ctx.fillStyle = 'white';
    DOM.ctx.textAlign = 'center';
	const nameOffsetY = fontSize * 2.2;
	const scoreOffsetY = nameOffsetY + fontSize * 1.7;

    let leftPlayer, rightPlayer;
    if (localTour) {
        const match = localTournament.matches[localTournament.currentMatchIndex] || ["Player 1", "Player 2"];
        leftPlayer = match[0] || "Player 1";
        rightPlayer = match[1] || "Player 2";
    } else {
        leftPlayer = lgPlayers[0] || "Player 1";
        rightPlayer = lgPlayers[1] || "Player 2";
    }
    document.getElementById('left-player-name').textContent = leftPlayer;
    document.getElementById('right-player-name').textContent = rightPlayer;
    
    DOM.ctx.fillText(localState.paddles.left.score, GAME_CONFIG.canvasWidth * 0.2, scoreOffsetY);
    DOM.ctx.fillText(localState.paddles.right.score, GAME_CONFIG.canvasWidth * 0.8, scoreOffsetY);

}
