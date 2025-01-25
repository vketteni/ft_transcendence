import { GAME_CONFIG } from './config.js';
import { localState, resetLocalState } from './state.js';
import { DOM } from './dom.js';
import { drawRect, drawBall } from './renderUtils.js';
import { showScreen } from './showScreen.js';
import { checkTournamentProgress } from './localTournament.js';
import { localTour } from './buttons.js';

export function localRenderLoop () {
	if (!localState.isPaused && localState.gameStarted) {
        DOM.ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
		updateLocalGame();
        localRender();
        requestAnimationFrame(localRenderLoop);
    }
}

function updateLocalGame() {

    const paddleSpeed = 5;
    let ballRadius = GAME_CONFIG.ballDiameter / 2;

    // Move paddles
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

    // Ball movement
    localState.ball.x += localState.ball.vx;
    localState.ball.y += localState.ball.vy;

    // Ball collision with top and bottom walls
    if (localState.ball.y - ballRadius <= 0 || localState.ball.y + ballRadius >= GAME_CONFIG.canvasHeight) {
        localState.ball.vy *= -1; // Reverse ball direction
    }

    // Ball collision with left paddle
    if (
        localState.ball.x <= GAME_CONFIG.paddleWidth &&
        localState.ball.y >= localState.paddles.left.y &&
        localState.ball.y <= localState.paddles.left.y + GAME_CONFIG.paddleHeight
    ) {
        localState.ball.vx *= -1; // Reverse ball direction
    }

    // Ball collision with right paddle
    if (
        localState.ball.x >= GAME_CONFIG.canvasWidth - GAME_CONFIG.paddleWidth &&
        localState.ball.y >= localState.paddles.right.y &&
        localState.ball.y <= localState.paddles.right.y + GAME_CONFIG.paddleHeight
    ) {
        localState.ball.vx *= -1; // Reverse ball direction
    }

    // Ball goes out (scoring)
    if (localState.ball.x <= 0) {
        localState.paddles.right.score++;
		if (localState.paddles.left.score >= 10) {
            if (localTour) {
                resetLocalState();
                checkTournamentProgress();
            }
            else { 
                resetLocalState();
                showScreen('local-game-over-screen');
            }
		}
        else 
            resetBall();

    } else if (localState.ball.x >= GAME_CONFIG.canvasWidth) {
        localState.paddles.left.score++;
		if (localState.paddles.left.score >= 10) {
            if (localTour) {
                resetLocalState();
                checkTournamentProgress();
            }
            else { 
                resetLocalState();
                showScreen('local-game-over-screen');
            }
		}
        else 
            resetBall();
    }
}

function resetBall() {
    localState.ball.x = GAME_CONFIG.canvasWidth / 2;
    localState.ball.y = GAME_CONFIG.canvasHeight / 2;
    localState.ball.vx = (Math.random() > 0.5 ? 1 : -1) * GAME_CONFIG.ballSpeed;
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

   	DOM.ctx.fillText(
		   localState.paddles.left.score,
		   GAME_CONFIG.canvasWidth * 0.2,
		   scoreOffsetY
	   );
   
	DOM.ctx.fillText(
		   localState.paddles.right.score,
		   GAME_CONFIG.canvasWidth * 0.8,
		   scoreOffsetY
	   );
}
