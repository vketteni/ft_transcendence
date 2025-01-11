import { wsManager } from './WebSocketManager.js';
import { connectToMatchmaking } from './WebsocketMatchmaking.js';
import { connectToGame } from './WebsocketGameroom.js';
import { GAME_CONFIG, setPlayerAlias, getPlayerAlias } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { Timer } from './Timer.js';

let isPaused = false;
const matchmakingTimer = new Timer(DOM.matchmakingTimer);

DOM.canvas.width = GAME_CONFIG.canvasWidth;
DOM.canvas.height = GAME_CONFIG.canvasHeight;

// Event Listeners
DOM.registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alias = DOM.aliasInput.value.trim();
    if (!alias) {
        alert("Please register first.");
        return;
    }

    setPlayerAlias(alias);
    DOM.registrationScreen.classList.add('d-none');
    DOM.gameScreen.classList.remove('d-none');
    // DOM.startButton.classList.remove('hidden');
    DOM.matchmakingButton.classList.remove('hidden');

});

// DOM.startButton.addEventListener('click', () => {
//     console.log("Start button clicked.");
//     wsManager.send('game', { action: 'start_game', player: getPlayerAlias() });
//     DOM.startButton.classList.add('d-none');
//     DOM.pauseButton.classList.remove('d-none');
//     DOM.canvas.classList.remove('d-none');
//     resizeCanvas();
// });

DOM.matchmakingButton.addEventListener('click', () => {
    console.log("Matchmaking button clicked.");
    // try {
    //     connectToGame("ws://localhost:8000/ws/game/0/");
    //     console.log("After connectToGame");
    //     wsManager.send('game', { action: 'start_game', player: getPlayerAlias() });
    //     console.log("After wsManager.send('game', ..)");
    //     DOM.pauseButton.classList.remove('d-none');
    //     DOM.canvas.classList.remove('d-none');
    //     resizeCanvas();
    // } catch (error) {
		//     console.error("Error during matchmaking button handler:", error);
		// }
		
	DOM.matchmakingButton.classList.add('d-none');
    connectToMatchmaking();
    wsManager.send('matchmaking', { type: 'join_queue', data: { player_id: getPlayerAlias() } });
    matchmakingTimer.start();
});

DOM.pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;

    if (isPaused) {
        DOM.pauseButton.classList.add('paused');
        DOM.pauseButton.textContent = "Resume";
        wsManager.send('game', { action: 'pause_game' });
    } else {
        DOM.pauseButton.classList.remove('paused');
        DOM.pauseButton.textContent = "Pause";
        wsManager.send('game', { action: 'resume_game' });
    }
});

document.addEventListener("keydown", (e) => {
    if (wsManager.sockets['game']?.readyState === WebSocket.OPEN) {
        const up = e.key === "ArrowUp";
        const down = e.key === "ArrowDown";
		console.log("keypress down");

        if (up || down) {
            wsManager.send('game', {
                action: "input",
                up: up,
                down: down
            });
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
		console.log("keypress up");
        wsManager.send('game', { action: 'input', up: false, down: false });
    }
});

window.addEventListener('resize', resizeCanvas);

// Stop and reset the timer when needed
export function stopAndResetTimer() {
    matchmakingTimer.stop();
    matchmakingTimer.reset();
    // DOM.matchmakingButton.classList.remove('d-none');
    // DOM.matchmakingButton.textContent = "Try Again";
}