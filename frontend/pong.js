import { GAME_CONFIG, setPlayerAlias, getPlayerAlias, socket, initializeWebSocket } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { serverState } from './state.js';
import { sendInput, sendAlias, sendDimensions } from './sendToBackend.js';

initializeWebSocket();
let isPaused = false;

DOM.gameScreen.width = GAME_CONFIG.canvasWidth;
DOM.gameScreen.height = GAME_CONFIG.canvasHeight;

socket.onopen = () => {
    console.log("WebSocket connection established.");
    sendDimensions();
};

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    if (data.type === 'state_update') {
        serverState.paddles.left.y = data.paddles.left.y;
        serverState.paddles.left.score = data.paddles.left.score;
        serverState.paddles.right.y = data.paddles.right.y;
        serverState.paddles.right.score = data.paddles.right.score;
        serverState.ball = data.ball;
    } else if (data.type === 'game_over') {
        console.log("Game Over!", data);
        const winner = data.winner;
        const gameOverMessage = `Game Over! ${winner} wins!`;
        document.getElementById('game-over-message').textContent = gameOverMessage;
        showScreen('game-over-screen');
    }
};

function showScreen(screenId) {
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
    sendAlias(); // Send alias to the server

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
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    } else {
        console.error("WebSocket connection is not open.");
    }
    showScreen('game-screen');
});

DOM.pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;

    if (isPaused) {
        DOM.pauseButton.classList.add('paused');
        DOM.pauseButton.classList.remove('resumed');
        DOM.pauseButton.textContent = "Resume";
        socket.send(JSON.stringify({ action: 'pause_game' }));
    } else {
        DOM.pauseButton.classList.add('resumed');
        DOM.pauseButton.classList.remove('paused');
        DOM.pauseButton.textContent = "Pause";
        socket.send(JSON.stringify({ action: 'resume_game' }));
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
    if (socket.readyState === WebSocket.OPEN) {
        const up = e.key === "ArrowUp";
        const down = e.key === "ArrowDown";

        if (up || down) {
            socket.send(JSON.stringify({
                action: "input",
                up: up,
                down: down
            }));
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        sendInput(false, false);
    }
});

