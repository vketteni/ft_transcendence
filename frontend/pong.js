import { GAME_CONFIG, setPlayerAlias, getPlayerAlias, socket, initializeWebSocket } from './config.js';
import { render, resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { gameState } from './gameState.js';
import { sendInput, sendAlias, sendDimensions } from './sendToBackend.js';

let isSocketOpen = false;
let gameStarted = false;

initializeWebSocket();

DOM.canvas.width = GAME_CONFIG.canvasWidth;
DOM.canvas.height = GAME_CONFIG.canvasHeight;

socket.onopen = () => {
    isSocketOpen = true;
    console.log("WebSocket connection established.");
    if (getPlayerAlias) {
        sendAlias();
    }
    sendDimensions();
};

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    console.log("State update received:", data);

    if (data.type === 'state_update') {
        gameState.ball = data.ball;
        gameState.paddles = data.paddles;
        if (gameStarted)
            render();
    }
};

DOM.registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alias = DOM.aliasInput.value.trim();
    if (alias) {
        setPlayerAlias(alias);
        localStorage.setItem('playerAlias', alias); // Save alias locally
        DOM.registrationScreen.classList.add('d-none');
        DOM.gameScreen.classList.remove('d-none'); // Show game screen
        DOM.startButton.classList.remove('d-none'); // Show Start Game button
    } else {
        alert("Please enter a valid alias!");
    }
});

DOM.startButton.addEventListener('click', () => {
    if (!getPlayerAlias()) {
        alert("Please register first.");
        return;
    }

    console.log("Start button clicked.");
    gameStarted = true;

    socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    DOM.startButton.classList.add('d-none');
    DOM.canvas.classList.remove('d-none');
    if (gameStarted) 
        resizeCanvas();
});

window.addEventListener('resize', resizeCanvas);

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        sendInput(true, false);
    } else if (e.key === 'ArrowDown') {
        sendInput(false, true);
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        sendInput(false, false);
    }
});

DOM.canvasImg.onerror = () => {
    console.error('Image failed to load. Check the file path.');
};
