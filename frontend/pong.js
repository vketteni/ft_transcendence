import { wsManager } from './WebSocketManager.js';
import { sendAlias } from './sendToBackend.js';
import { connectToGame } from './WebsocketGameroom.js';
import { connectToMatchmaking } from './WebsocketMatchmaking.js';
import { GAME_CONFIG, setPlayerAlias, getPlayerAlias } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { Timer } from './Timer.js';
import { handleLoginRedirect } from './auth.js'
import { fetchGameData } from './token.js';

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
            credentials: 'include',
        });

        if (response.ok) {
            // const data = await response.json();
            const data = await response.json();

            // Store tokens in localStorage or sessionStorage
            localStorage.setItem('access_token', data.access_token);

            alert("Login successful!");
            showScreen('category-screen'); // Example of moving to the category screen
            // try {
            //     await fetchGameData();
            // } catch (fetchError) {
            //     console.error('Error fetching game data:', fetchError);
            //     alert('Failed to load game data.');
            // }

            // Proceed to the next screen or load resources dynamically
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

async function updateUserInfo() {
    const token = localStorage.getItem('access_token');
    const updatedProfile = {
        email: document.getElementById('profileEmail').value.trim(),
        first_name: document.getElementById('profileFirstName').value.trim(),
        last_name: document.getElementById('profileLastName').value.trim(),
    };

    try {
        const response = await fetch('http://localhost:8000/accounts/profile/', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedProfile),
        });

        if (response.ok) {
            const data = await response.json();
            alert('Profile updated successfully!');
            loadUserInfo(); // Reload the profile to reflect updated data
        } else {
            const errorData = await response.json();
            console.error('Failed to update profile:', errorData);
            alert('Failed to update profile. Please try again.');
        }
    } catch (error) {
        console.error('Error during profile update:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}


DOM.profileButton.addEventListener('click', () => {
    // e.preventDefault();
    showScreen('userprofile-screen');
    loadUserInfo();
});


async function loadUserInfo() {
    const token = localStorage.getItem('access_token');

    try {
        const response = await fetch('http://localhost:8000/accounts/profile/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('profileUsername').textContent = data.username;
            document.getElementById('profileEmail').textContent = data.email;
            document.getElementById('profileFirstName').textContent = data.first_name;
            document.getElementById('profileLastName').textContent = data.last_name;
        } else {
            console.error('Failed to load user info:', response.status);
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}