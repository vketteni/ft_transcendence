const canvas = document.getElementById('background-animation');
const ctx = canvas.getContext('2d');

// Resize canvas to fit the screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Ball properties
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    dx: 3, // X velocity
    dy: 3, // Y velocity
    color: '#FFFFFF',
};

// Draw the ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

// Update ball position
function updateBall() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Adjust alpha (0.2) for longer or shorter trails
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the ball
    drawBall();

    // Move the ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Check for collisions with walls
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx *= -1; // Reverse direction
    }
    if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
        ball.dy *= -1; // Reverse direction
    }

    // Request the next frame
    requestAnimationFrame(updateBall);
}

// Start the animation
updateBall();
