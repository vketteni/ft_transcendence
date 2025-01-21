import { wsManager } from './WebSocketManager.js';
import { sendAlias } from './sendToBackend.js';
import { connectToMatchmaking, startPvCMatch } from './WebsocketMatchmaking.js';
import { GAME_CONFIG, setPlayerID } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { Timer } from './Timer.js';
import { handleLoginRedirect, setLoginState } from './auth.js';
import { showScreen } from './showScreen.js';
import { initializeSessionAndCSRF } from './intializeSessionAndCSRF.js';
import { updateTopBar } from './topBar.js';
import { fetchUserState } from './fetchUserState.js';
import { handleLogout } from './logout.js';
import { fetchGameData } from './token.js';
import { getCookie, setCookie } from './cookie.js';
import { generateUUID } from './generateUUID.js';

let isPaused = false;
const matchmakingTimer = new Timer(DOM.matchmakingTimer);

DOM.canvas.width = GAME_CONFIG.canvasWidth;
DOM.canvas.height = GAME_CONFIG.canvasHeight;

DOM.loginForm.addEventListener('submit', async (e) => {
    console.log("loginForm.addEventListener");
    e.preventDefault();
    const alias = DOM.loginAlias.value.trim();
    const password = DOM.loginPassword.value.trim();

    if (!alias || !password) {
        alert("Please enter both alias and password.");
        return;
    }

    try {
        const response = await fetch('/api/accounts/token/', {
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
			setPlayerID(data.user.id);

            alert("Login successful!");
            setLoginState(data.logged_in);
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
        const response = await fetch('http://localhost:3000/api/accounts/register/', {
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
}


DOM.editProfileForm.addEventListener("submit", async (event) => {
	event.preventDefault();
    const updatedData = {
		username: DOM.editUsername.value,
        email: DOM.editEmail.value,
        first_name: DOM.editFirstName.value,
        last_name: DOM.editLastName.value
    };
    try {
			const response = await fetch('/api/accounts/user-profile/', {
			method: 'PUT',
			headers: {
				'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(updatedData),
			credentials: 'include',
		});
		const data = await response.json();
		if (response.ok)
		{
			console.log("updatedData.username:", updatedData.username);
			// Update the profile view with the new data
			DOM.profileUsername.textContent = data.username;
			DOM.profileEmail.textContent = data.email;
			DOM.profileFirstName.textContent = data.first_name || 'N/A';
			DOM.profileLastName.textContent = data.last_name || 'N/A';
			DOM.profile2fa.textContent = data.twoFA || "disabled";
			
			// Switch back to view mode
			DOM.profileEdit.classList.add("d-none");
			DOM.profileView.classList.remove("d-none");
		}
		else
			alert(`Sign Up Error: ${data.error}`);
	} catch (error) {
		console.error('Error signing up:', error);
		alert('An unexpected error occurred. Please try again later.');
	}
});
	
document.addEventListener('DOMContentLoaded', () => {
	// Set the category screen as the default
	showScreen('category-screen');

	// Set up top bar navigation
	DOM.topBarNav.addEventListener('click', (event) => {
		if (event.target.tagName === 'A') {
			event.preventDefault();
			const sectionId = event.target.getAttribute('href').substring(1);

			if (sectionId === 'login') {
				showScreen('login-screen');
			} else if (sectionId === 'signup') {
				showScreen('signup-screen');
			} else if (sectionId === 'logout') {
				handleLogout();
				updateTopBar();
			} else if (sectionId === 'profile') {
				showScreen('userprofile-screen');
			} else {
				console.warn(`Unhandled navigation target: ${sectionId}`);
			}
		}
	});
});


/* Global Scope */

setCookie('browser_id', generateUUID(), {
	path: '/',
	// domain: '127.0.0.1', // Set this to match the backend's domain
	// secure: true,             // Use true for HTTPS
	sameSite: 'Lax',
	// sameSite: 'None',         // None if cross-origin, Lax/Strict for same-origin
	expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
});
localStorage.setItem('playerid', getCookie('browser_id'));

// signup buttons
DOM.registrationButton.addEventListener('click', () => {
	console.log("registrationButton.addEventListener");
	showScreen('signup-screen');
});

DOM.login42Button.addEventListener('click', () => {
	console.log("login42Button.addEventListener()");
	const loginWindow = window.open(
		'/oauth/accounts/login/', // Redirects to backend endpoint for OAuth initiation
		'_blank',          // Open in a new tab or popup
		'width=500,height=600,noopener=false,noreferrer=false'
	);
	fetchUserState(loginWindow);
	
});

DOM.editProfileButton.addEventListener("click", () => {
	console.log("editProfileButton.addEventListener");
	DOM.profileView.classList.add("d-none");
	DOM.profileEdit.classList.remove("d-none");
	
	const profileData = {
		username: DOM.profileUsername.textContent,
		email: DOM.profileEmail.textContent,
		first_name: DOM.profileFirstName.textContent,
		last_name: DOM.profileLastName.textContent,
		twoFA: DOM.profile2fa.textContent
	};
	
	DOM.editUsername.value = profileData.username;
	DOM.editEmail.value = profileData.email;
	DOM.editFirstName.value = profileData.first_name || 'N/A';
	DOM.editLastName.value = profileData.last_name || 'N/A';
});

DOM.cancelEditButton.addEventListener("click", () => {
	DOM.profileEdit.classList.add("d-none");
	DOM.profileView.classList.remove("d-none");
});


//game play buttons
DOM.PvCButton.addEventListener('click', () => {
    console.log("PvC button clicked, showing matchmaking screen...");
	showScreen('matchmaking-screen');
    matchmakingTimer.start();
	connectToMatchmaking("PVC");
});

DOM.PvPButton.addEventListener('click', () => {
    console.log("PvP button clicked, showing matchmaking screen...");
    showScreen('matchmaking-screen');
    matchmakingTimer.start();
    connectToMatchmaking("PVP");
});

DOM.TournamentButton.addEventListener('click', () => {
    console.log("Tournament button clicked, showing matchmaking screen...");
	showScreen('matchmaking-screen');
    matchmakingTimer.start();
    startPvCMatch();
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

DOM.AIplayAgainButton.addEventListener('click', () => {
    matchmakingTimer.start();
	connectToMatchmaking("PVC");
});

DOM.PvPplayAgainButton.addEventListener('click', () => {
    showScreen('matchmaking-screen');
    matchmakingTimer.start();
    connectToMatchmaking("PVP");
});

//back buttons
DOM.AIbackToMenuButton.addEventListener('click', () => {
    showScreen('category-screen');
	// wsManager.close('game');
});

DOM.PvPbackToMenuButton.addEventListener('click', () => {
    showScreen('category-screen');
    // wsManager.close('game');
});