import { wsManager } from './WebSocketManager.js';
import { sendAlias } from './sendToBackend.js';
import { connectToGame } from './WebsocketGameroom.js';
import { connectToMatchmaking } from './WebsocketMatchmaking.js';
import { GAME_CONFIG, setPlayerAlias, getPlayerAlias } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { Timer } from './Timer.js';
import {handleLoginRedirect} from './auth.js'

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

const logoutButton = document.getElementById('logout-button');

function checkLoginStatus() {
    const token = localStorage.getItem('access_token');
    if (token) {
        // Optionally, validate token with the backend here if necessary
        logoutButton.classList.add('d-none');
        console.log("User is logged in. Redirecting to category screen...");
        showScreen('category-screen'); // Redirect to category screen
    } else {
        logoutButton.classList.remove('d-none');
        console.log("User is not logged in. Redirecting to login screen...");
        showScreen('registration-screen'); // Redirect to login screen
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus(); // Check and handle login status on page load
});

DOM.logoutButton.addEventListener('click', async () => {
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken) {
        try {
            // Notify the backend to invalidate the refresh token
            await fetch('http://localhost:8000/accounts/logout/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    // Clear tokens from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Update UI
    alert('You have been logged out.');
    logoutButton.classList.add('d-none');
    showScreen('registration-screen'); // Navigate to the login screen
});


DOM.signupButton.addEventListener('click', () => {
    showScreen('signup-screen'); // Navigate to sign-up screen
});


DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alias = DOM.loginAlias.value.trim();
    const password = DOM.loginPassword.value.trim();

    if (!alias || !password) {
        alert("Please enter both alias and password.");
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/accounts/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: alias, password }),
        });

        if (response.ok) {
            // const data = await response.json();
            const data = await response.json();

            // Store tokens in localStorage or sessionStorage
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            console.log("Login successful:", data);
            alert("Login successful!");

            // Proceed to the next screen or load resources dynamically
            showScreen('category-screen'); // Example of moving to the category screen
        } else {
            const errorData = await response.json();
            alert(`Login failed: ${errorData.detail}`);
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An unexpected error occurred. Please try again.');
    }
});

// Handle sign-up form submission
DOM.signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alias = DOM.signupAlias.value.trim();
    const password = DOM.signupPassword.value.trim();
    const email = DOM.signupEmail.value.trim();

    if (!alias || !password || !email) {
        alert("Please create both alias and password.");
        return;
    }

    console.log("Sign Up:", { alias, password, email });
    // setPlayerAlias(alias);
    // sendAlias();
    try {
        const response = await fetch('http://localhost:8000/accounts/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ alias, password, email }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Sign Up Successful:", data);
            // setPlayerAlias(alias);
            // sendAlias(); // Notify the game server
            showScreen('login-screen');
        } else {
            alert(`Sign Up Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Error signing up:', error);
        alert('An unexpected error occurred. Please try again later.');
    }
    // showScreen('category-screen'); // Navigate to category screen
});

// Handle "Login with 42"
DOM.login42Button.addEventListener('click', () => {
    // window.location.href = "https://signin.intra.42.fr";
    if (window.location.pathname === '/accounts/login/redirect') {
        handleLoginRedirect();
    }
});

DOM.PvCButton.addEventListener('click', () => {
    if (wsManager.sockets['matchmaking'].readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    } else {
        console.error("WebSocket connection is not open.");
    }
	// DOM.matchmakingTimer
    showScreen('game-screen');
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


// Stop and reset the timer when needed
export function stopAndResetTimer() {
    matchmakingTimer.stop();
    matchmakingTimer.reset();
    // DOM.matchmakingButton.classList.remove('d-none');
    // DOM.matchmakingButton.textContent = "Try Again";
}
