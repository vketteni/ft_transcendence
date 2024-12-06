let playerAlias = '';

const registrationScreen = document.getElementById('registration-screen');
const gameScreen = document.getElementById('game-screen');
const registrationForm = document.getElementById('registration-form');
const aliasInput = document.getElementById('alias-input');

registrationForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent the form from refreshing the page
    playerAlias = aliasInput.value.trim();

    if (playerAlias) {
        localStorage.setItem('playerAlias', playerAlias);
        registrationScreen.classList.add('d-none');
        gameScreen.classList.remove('d-none');
        startButton.classList.remove('d-none'); 
    } else {
        alert('Please enter a valid alias!');
    }
});

const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');

// Define paddles, ball, and game state
const paddleWidth = 10;
const paddleHeight = 100;
const ballSize = 10;

const player = { x: 0, y: canvas.height / 2 - paddleHeight / 2, score: 0 };
const ai = { x: canvas.width - paddleWidth, y: canvas.height / 2 - paddleHeight / 2, score: 0 };
const ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 4, vy: 4 };

startButton.addEventListener('click', () => {
    startButton.classList.add('d-none');
    canvas.classList.remove('d-none');

    gameLoop();
});
// Key states for player movement
const keys = { up: false, down: false };

// Event listeners for player input
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
});

// Draw game objects
function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawBall(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2); // Draw a circle
    ctx.closePath();
    ctx.fill();
}


// Reset ball after scoring
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.vy = 4 * (Math.random() > 0.5 ? 1 : -1);
}

// Update game logic
function update() {
    // Move player
    if (keys.up && player.y > 0) player.y -= 6;
    if (keys.down && player.y < canvas.height - paddleHeight) player.y += 6;

    // Move AI (simple tracking)
    if (ball.y < ai.y + paddleHeight / 2) ai.y -= 4;
    if (ball.y > ai.y + paddleHeight / 2) ai.y += 4;

    // Constrain AI paddle within canvas bounds
    if (ai.y < 0) ai.y = 0;
    if (ai.y > canvas.height - paddleHeight) ai.y = canvas.height - paddleHeight;

    // Update ball position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Ball collision with walls
    if (ball.y <= 0 || ball.y + ballSize >= canvas.height) ball.vy *= -1;

    // Ball collision with player's paddle
    if (
        ball.x <= player.x + paddleWidth &&
        ball.y + ballSize >= player.y &&
        ball.y <= player.y + paddleHeight
    ) {
        const offset = ball.y - (player.y + paddleHeight / 2); // Offset from paddle center
        ball.vx *= -1; // Reverse horizontal direction
        ball.vy += offset * 0.1; // Adjust vertical direction
    }

    // Ball collision with AI's paddle
    if (
        ball.x + ballSize >= ai.x &&
        ball.y + ballSize >= ai.y &&
        ball.y <= ai.y + paddleHeight
    ) {
        const offset = ball.y - (ai.y + paddleHeight / 2); // Offset from paddle center
        ball.vx *= -1; // Reverse horizontal direction
        ball.vy += offset * 0.1; // Adjust vertical direction
    }

    // Scoring
    if (ball.x <= 0) {
        ai.score++;
        resetBall();
    }
    if (ball.x + ballSize >= canvas.width) {
        player.score++;
        resetBall();
    }
}


// Render the game
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    drawRect(player.x, player.y, paddleWidth, paddleHeight, 'white');
    drawRect(ai.x, ai.y, paddleWidth, paddleHeight, 'white');

    // Draw ball
    drawBall(ball.x, ball.y, ballSize / 2, 'white');

    // Draw names
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(playerAlias || 'Player', canvas.width / 4, 30); // Player alias
    ctx.fillText('Computer', (canvas.width * 3) / 4, 30); // Computer name

    // Draw scores
    ctx.fillText(player.score, canvas.width / 4, 60); // Player score
    ctx.fillText(ai.score, (canvas.width * 3) / 4, 60); // AI score
}


// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}