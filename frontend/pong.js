import { wsManager } from './WebSocketManager.js';
import { sendAlias } from './sendToBackend.js';
import { connectToGame } from './WebsocketGameroom.js';
import { connectToMatchmaking } from './WebsocketMatchmaking.js';
import { GAME_CONFIG, setPlayerAlias, getPlayerAlias } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { Timer } from './Timer.js';

let isPaused = false;
const matchmakingTimer = new Timer(DOM.matchmakingTimer);

DOM.gameScreen.width = GAME_CONFIG.canvasWidth;
DOM.gameScreen.height = GAME_CONFIG.canvasHeight;

export function showScreen(screenId) {
    const screens = [
        DOM.registrationScreen,
        DOM.loginScreen,
        DOM.signupScreen,
        DOM.categoryScreen,
        DOM.gameScreen,
        DOM.gameOverScreen
    ];

    screens.forEach(screen => {
        if (screen.id === screenId) {
            screen.classList.remove('d-none');

            // If showing game screen, initialize the canvas
            if (screenId === 'game-screen') {
                resizeCanvas();
                console.log("Game screen initialized");
            }
        } else {
            screen.classList.add('d-none');
        }
    });
}

// Login and sign-up screen navigation
DOM.loginButton.addEventListener('click', () => {
    showScreen('login-screen'); // Navigate to login screen
});

DOM.signupButton.addEventListener('click', () => {
    showScreen('signup-screen'); // Navigate to sign-up screen
});

DOM.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alias = DOM.loginAlias.value.trim();
    const password = DOM.loginPassword.value.trim();

    if (!alias || !password) {
        alert("Please enter both alias and password.");
        return;
    }

    console.log("Login:", { alias, password });
    setPlayerAlias(alias);
    // sendAlias(); // Send alias to the server

    showScreen('category-screen'); // Navigate to category screen
});

// Handle sign-up form submission
DOM.signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alias = DOM.signupAlias.value.trim();
    const password = DOM.signupPassword.value.trim();

    if (!alias || !password) {
        alert("Please create both alias and password.");
        return;
    }

    console.log("Sign Up:", { alias, password });
    setPlayerAlias(alias);
    sendAlias();

    showScreen('category-screen'); // Navigate to category screen
});

// Handle "Login with 42"
DOM.login42Button.addEventListener('click', () => {
    window.location.href = "https://signin.intra.42.fr";
});

DOM.PvCButton.addEventListener('click', () => {
    if (wsManager.sockets['matchmaking'].readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    } else {
        console.error("WebSocket connection is not open.");
    }
	// DOM.matchmakingTimer
    // showScreen('game-screen');
});

DOM.PvPButton.addEventListener('click', () => {
	connectToMatchmaking();
    showScreen('game-screen');
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

DOM.playAgainButton.addEventListener('click', () => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    }
    showScreen('game-screen');
});


window.addEventListener('resize', resizeCanvas);

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
