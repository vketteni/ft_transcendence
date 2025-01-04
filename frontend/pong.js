import { GAME_CONFIG, setPlayerAlias, getPlayerAlias, socket, initializeWebSocket } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { serverState } from './state.js';
import { sendInput, sendAlias, sendDimensions } from './sendToBackend.js';

initializeWebSocket();
let isPaused = false;

DOM.canvas.width = GAME_CONFIG.canvasWidth;
DOM.canvas.height = GAME_CONFIG.canvasHeight;

socket.onopen = () => {
    console.log("WebSocket connection established.");
    sendDimensions();
};

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    // console.log("State update received from server:", data);
    if (data.type === 'state_update') {
        serverState.paddles.left.y = data.paddles.left.y;
        serverState.paddles.left.score = data.paddles.left.score;
        serverState.paddles.right.y = data.paddles.right.y;
        serverState.paddles.right.score = data.paddles.right.score;
        serverState.ball = data.ball;
    }
    
};

// Navigation between screens
DOM.loginButton.addEventListener('click', () => {
    DOM.registrationScreen.classList.add('d-none');
    DOM.loginScreen.classList.remove('d-none');
});

DOM.signupButton.addEventListener('click', () => {
    DOM.registrationScreen.classList.add('d-none');
    DOM.signupScreen.classList.remove('d-none');
});

// Handle login form submission
DOM.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alias = DOM.loginAlias.value.trim();
    const password = DOM.loginPassword.value.trim();

    if (!alias || !password) {
        alert("Please enter both alias and password.");
        return;
    }

    // Send login request to the server
    console.log("Login:", { alias, password });

    DOM.loginScreen.classList.add('d-none');
    DOM.gameScreen.classList.remove('d-none');
    setPlayerAlias(alias);
    sendAlias();
});

// Handle "Login with 42"
DOM.login42Button.addEventListener('click', () => {
    window.location.href = "https://signin.intra.42.fr";
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

    // Send sign-up request to the server
    console.log("Sign Up:", { alias, password });

    DOM.signupScreen.classList.add('d-none');
    DOM.gameScreen.classList.remove('d-none');
    setPlayerAlias(alias);
    sendAlias();
});

DOM.startButton.addEventListener('click', () => {
    console.log("Start button clicked.");
    socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    DOM.startButton.classList.add('d-none');
    DOM.pauseButton.classList.remove('d-none'); 
    DOM.canvas.classList.remove('d-none'); 
    resizeCanvas();
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

