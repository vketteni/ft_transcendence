const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const registrationScreen = document.getElementById('registration-screen');
const gameScreen = document.getElementById('game-screen');
const registrationForm = document.getElementById('registration-form');
const aliasInput = document.getElementById('alias-input');
const startButton = document.getElementById('start-button');

const canvasImg = new Image();
canvasImg.src = './canvas.jpg';

let playerAlias = '';

let gameStarted = false;

const GAME_CONFIG = {
    canvasWidth: 800, // Placeholder, updated dynamically
    canvasHeight: 600,
    paddleWidth: 0.02, // 2% of canvas width
    paddleHeight: 0.2, // 20% of canvas height
    ballDiameter: 0.03, // 3% of canvas width
    paddleColor: '#FFFFFF',
    ballColor: '#FFFFFF',
};

canvas.width = GAME_CONFIG.canvasWidth;
canvas.height = GAME_CONFIG.canvasHeight;

let gameState = {
    paddles: {
        left: { y: GAME_CONFIG.canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2, score: 0 },
        right: { y: GAME_CONFIG.canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2, score: 0 },
    },
    ball: { x: GAME_CONFIG.canvasWidth / 2, y: GAME_CONFIG.canvasHeight / 2 },
};

const socket = new WebSocket('ws://localhost:8000/ws/game/room1/');

let isSocketOpen = false;

socket.onopen = function () {
    console.log("WebSocket connection established.");
    isSocketOpen = true;

    if (playerAlias) {
        sendAliasToBackend();
    }
    sendDimensions();
};

socket.onclose = function () {
    console.log("WebSocket connection closed.");
    isSocketOpen = false;
};

socket.onerror = function (error) {
    console.error("WebSocket error:", error);
};

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    console.log("State update received:", data);

    if (data.type === 'state_update') {
        // Efficiently update only the necessary parts of the game state
        gameState.ball = data.ball;
        gameState.paddles = data.paddles;
        render();
    }
};

registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    playerAlias = aliasInput.value.trim();

    if (playerAlias) {
        localStorage.setItem('playerAlias', playerAlias); // Save alias locally
        registrationScreen.classList.add('d-none');
        gameScreen.classList.remove('d-none'); // Show game screen
        startButton.classList.remove('d-none'); // Show Start Game button
    } else {
        alert("Please enter a valid alias!");
    }
});

startButton.addEventListener('click', () => {
    if (!playerAlias) {
        alert("Please register first.");
        return;
    }

    console.log("Start button clicked.");
    gameStarted = true;

    socket.send(JSON.stringify({ action: 'start_game', player: playerAlias }));

    // Hide start button
    startButton.classList.add('d-none');
    canvas.classList.remove('d-none');
    render();
});

function sendAliasToBackend() {
    console.log(`Sending alias "${playerAlias}" to backend.`);
    socket.send(JSON.stringify({ action: 'alias', player: playerAlias }));
}

function sendDimensions() {
    const canvasConfig = {
        action: 'canvas_and_game_config',
        canvas: { width: GAME_CONFIG.canvasWidth, height: GAME_CONFIG.canvasHeight },
        paddle: { width: GAME_CONFIG.paddleWidth, height: GAME_CONFIG.paddleHeight },
        ball: { diameter: GAME_CONFIG.ballDiameter },
    };
    console.log("Sending canvas and game config:", canvasConfig);
    socket.send(JSON.stringify(canvasConfig));
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvasImg, 0, 0, canvas.width, canvas.height);
}

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawBall(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
}

function resizeCanvas() {
    const windowWidth = window.innerWidth * 0.6; // Canvas can use 90% of window width
    const windowHeight = window.innerHeight * 0.6; // Canvas can use 90% of window height

    const imageAspectRatio = canvasImg.width / canvasImg.height;

    let canvasWidth = windowWidth;
    let canvasHeight = canvasWidth / imageAspectRatio;

    if (canvasHeight > windowHeight) {
        canvasHeight = windowHeight;
        canvasWidth = canvasHeight * imageAspectRatio;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    GAME_CONFIG.canvasWidth = canvasWidth;
    GAME_CONFIG.canvasHeight = canvasHeight;
    GAME_CONFIG.paddleWidth = canvasWidth * 0.02;
    GAME_CONFIG.paddleHeight = canvasHeight * 0.2;
    GAME_CONFIG.ballDiameter = canvasWidth * 0.025;

    // Update game elements
    gameState.paddles.left.y = canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2;
    gameState.paddles.right.y = canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2;
    gameState.ball.x = canvasWidth / 2;
    gameState.ball.y = canvasHeight / 2;

    sendDimensions();
    render();
}

window.addEventListener('resize', resizeCanvas);

function render() {
    if (!gameStarted) {
        return; // Skip rendering if the game has not started
    }
    clearCanvas();

    drawRect(8, gameState.paddles.left.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
    drawRect(GAME_CONFIG.canvasWidth - GAME_CONFIG.paddleWidth - 8, gameState.paddles.right.y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight, GAME_CONFIG.paddleColor);
    
    drawBall(gameState.ball.x, gameState.ball.y, GAME_CONFIG.ballDiameter / 2, GAME_CONFIG.ballColor);

    const fontSize = Math.floor(GAME_CONFIG.canvasHeight * 0.05);
    ctx.font = `${fontSize}px "Arial", sans-serif`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    const nameOffsetY = fontSize * 2.2;
    const scoreOffsetY = nameOffsetY + fontSize * 1.7;

    ctx.fillText(
        playerAlias || "Player 1",
        GAME_CONFIG.canvasWidth * 0.2,
        nameOffsetY
    );

    ctx.fillText(
        "Computer",
        GAME_CONFIG.canvasWidth * 0.8,
        nameOffsetY
    );

    ctx.fillText(
        gameState.paddles.left.score,
        GAME_CONFIG.canvasWidth * 0.2,
        scoreOffsetY
    );
    ctx.fillText(
        gameState.paddles.right.score,
        GAME_CONFIG.canvasWidth * 0.8,
        scoreOffsetY
    );
}

let lastSentInput = null;
const INPUT_THROTTLE_INTERVAL = 50; // in milliseconds

function sendInput(up, down) {
    const now = Date.now();
    if (lastSentInput && now - lastSentInput < INPUT_THROTTLE_INTERVAL) {
        return; // Skip sending if throttled
    }
    lastSentInput = now;
    socket.send(JSON.stringify({ action: 'input', player: playerAlias, up, down }));
}

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

canvasImg.onload = () => {
    resizeCanvas();
};

canvasImg.onerror = () => {
    console.error('Image failed to load. Check the file path.');
};
