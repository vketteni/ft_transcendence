import { GAME_CONFIG, setPlayerAlias, getPlayerAlias, socket, initializeWebSocket } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { serverState } from './state.js';
import { sendInput, sendAlias, sendDimensions } from './sendToBackend.js';

initializeWebSocket();

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

DOM.registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alias = DOM.aliasInput.value.trim();
    if (!alias) {
        alert("Please register first.");
        return;
    }
    if (alias) {
        setPlayerAlias(alias);
        sendAlias();
        DOM.registrationScreen.classList.add('d-none');
        DOM.gameScreen.classList.remove('d-none');
        DOM.startButton.classList.remove('hidden');
    } else {
        alert("Please enter a valid alias!");
    }
});

DOM.startButton.addEventListener('click', () => {
    console.log("Start button clicked.");
    socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    DOM.startButton.classList.add('d-none');
    DOM.canvas.classList.remove('d-none'); 
    resizeCanvas();
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
