import { wsManager } from './WebSocketManager.js';
import { GAME_CONFIG, setPlayerID } from './config.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';
import { setLoginState } from './auth.js';
import { showScreen } from './showScreen.js';
import { updateTopBar } from './topBar.js';
import { handleLogout } from './logout.js';
import { getCookie, setCookie } from './cookie.js';
import { generateUUID } from './generateUUID.js';
import { Buttons } from './buttons.js';
// import { connectToMatchmaking, startPvCMatch } from './WebsocketMatchmaking.js';
// import { initializeSessionAndCSRF } from './intializeSessionAndCSRF.js';
// import { fetchUserState } from './fetchUserState.js';
// import { fetchGameData } from './token.js';

DOM.canvas.width = GAME_CONFIG.canvasWidth;
DOM.canvas.height = GAME_CONFIG.canvasHeight;
let is2PG = false;


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
        if (is2PG) {
            // 2-player game mode logic
            if (e.key === "w" || e.key === "s") {
                // Left player's controls
                console.log("Left player key pressed:", e.key);
                wsManager.send('game', {
                    player: "left",
                    action: "input",
                    up: e.key === "w",
                    down: e.key === "s"
                });
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                // Right player's controls
                console.log("Right player key pressed:", e.key);
                wsManager.send('game', {
                    player: "right",
                    action: "input",
                    up: e.key === "ArrowUp",
                    down: e.key === "ArrowDown"
                });
            }
        } else {
            // Single-player or default mode logic
            const up = e.key === "ArrowUp" || e.key === "w";
            const down = e.key === "ArrowDown" || e.key === "s";

            if (up || down) {
                console.log("Key pressed:", e.key);
                wsManager.send('game', {
                    action: "input",
                    up: up,
                    down: down
                });
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (wsManager.sockets['game']?.readyState === WebSocket.OPEN) {
        if (is2PG) {
            // 2-player game mode
            if (e.key === 'w') {
                console.log("Left player: Up key (W) released");
                wsManager.send('game', { player: 'left', action: 'input', up: false });
            } else if (e.key === 's') {
                console.log("Left player: Down key (S) released");
                wsManager.send('game', { player: 'left', action: 'input', down: false });
            } else if (e.key === 'ArrowUp') {
                console.log("Right player: Up key (ArrowUp) released");
                wsManager.send('game', { player: 'right', action: 'input', up: false });
            } else if (e.key === 'ArrowDown') {
                console.log("Right player: Down key (ArrowDown) released");
                wsManager.send('game', { player: 'right', action: 'input', down: false });
            }
        } else {
            // Single-player or default mode
            if (e.key === 'ArrowUp' || e.key === 'w') {
                console.log("Up key released (ArrowUp or W)");
                wsManager.send('game', { action: 'input', up: false });
            } else if (e.key === 'ArrowDown' || e.key === 's') {
                console.log("Down key released (ArrowDown or S)");
                wsManager.send('game', { action: 'input', down: false });
            }
        }
    }
});

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
    Buttons.init(); 
	// Set the category screen as the default
	const screenId = location.hash.replace("#", "") || "category-screen";
    showScreen(screenId, false);
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
                showScreen('category-screen');
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

window.addEventListener("popstate", (event) => {
    if (event.state && event.state.screen) {
        showScreen(event.state.screen, false); // Avoid infinite loop by skipping history push
    }
});

window.addEventListener("beforeunload", () => {
    console.log("Checking WebSocket connections before refresh...");

    if (wsManager.sockets['matchmaking']) {
        console.log("Closing matchmaking socket before refresh.");
        wsManager.close('matchmaking');
    }

    if (wsManager.sockets['game']) {
        console.log("Closing game socket before refresh.");
        wsManager.close('game');
    }
});

//2PG buttons
DOM.twoPGButton.addEventListener('click', () => {
	is2PG = true;
	console.log("2PG button clicked, showing matchmaking screen...");
	showScreen('2PG-waiting-screen');
	twoPGTimer.start();
	connectToMatchmaking("2PG");
});
// DOM.twoPGplayAgainButton.addEventListener('click', () => {
// 	is2PG = true;
// 	showScreen('2PG-waiting-screen');
// 	twoPGTimer.start();
// 	connectToMatchmaking("2PG");
// });
// DOM.twoPGbackToMenuButton.addEventListener('click', () => {
// 	is2PG = false;
// 	showScreen('category-screen');
// });