import { GAME_CONFIG, setPlayerAlias, getPlayerAlias, socket, initializeWebSocket } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { serverState } from './state.js';
import { sendInput, sendAlias, sendDimensions } from './sendToBackend.js';
import { Timer } from './timer.js';

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
	else if (data.type === 'queue_joined') {
        socket = new WebSocket(`ws://localhost:8000/ws/game/${data.room_id}/`);
	}
	else if (data.type === 'game_start') {
        // If the game started, stop and reset the timer
        matchmakingTimer.stop();
        matchmakingTimer.reset();
        console.log("Match Found! Time spent waiting:", matchmakingTimer.elapsedTime);

        DOM.matchmakingButton.textContent = "Match Found!";
        DOM.startButton.classList.remove('d-none');
    } else if (data.type === 'matchmaking_canceled') {
        // If matchmaking was canceled, stop and reset the timer
        matchmakingTimer.stop();
        matchmakingTimer.reset();
        console.log("Matchmaking canceled. Time spent waiting:", matchmakingTimer.elapsedTime);

        DOM.matchmakingButton.classList.remove('d-none');
        DOM.matchmakingButton.textContent = "Try Again";
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
        DOM.matchmakingButton.classList.remove('hidden');
    } else {
        alert("Please enter a valid alias!");
    }
});

DOM.startButton.addEventListener('click', () => {
    console.log("Start button clicked.");
    socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    DOM.startButton.classList.add('d-none');
    DOM.pauseButton.classList.remove('d-none'); 
    DOM.canvas.classList.remove('d-none'); 
    resizeCanvas();
});

// Create a DOM element for the timer display
const timerDisplay = document.createElement('div');
timerDisplay.setAttribute('id', 'timerDisplay');
timerDisplay.style.position = 'absolute';
timerDisplay.style.top = '10px';
timerDisplay.style.right = '10px';
timerDisplay.style.padding = '5px 10px';
timerDisplay.style.backgroundColor = '#333';
timerDisplay.style.color = '#fff';
timerDisplay.style.borderRadius = '5px';
document.body.appendChild(timerDisplay);

// Initialize the Timer instance
const matchmakingTimer = new Timer(timerDisplay);

// Matchmaking Button Logic
DOM.matchmakingButton.addEventListener('click', () => {
    console.log("Matchmaking button clicked.");
    socket.send(JSON.stringify({ action: 'join_queue', player_id: getPlayerAlias() })); // TODO: use actual ID 

    // Start the matchmaking timer
    matchmakingTimer.start();

    // Hide the button
    DOM.matchmakingButton.classList.add('d-none');
    DOM.startButton.classList.add('d-none');
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
