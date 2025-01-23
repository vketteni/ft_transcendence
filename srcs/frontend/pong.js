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
    const avatar = DOM.signupAvatar.files[0];

    if (!alias || !password || !email) {
        alert("Please create both alias and password.");
        return;
    }

    const formData = new FormData();
    formData.append('alias', alias);
    formData.append('password', password);
    formData.append('email', email);
    if (avatar) {
        formData.append('avatar', avatar); // Only append if a file is selected
    }

    console.log("Sign Up Data:", { alias, password, email, avatar: avatar?.name || 'No file' });

    try {
        const response = await fetch('api/accounts/register/', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Sign Up Successful:", data);
            showScreen('login-screen');
        } else {
            const errorData = await response.json();
            alert(`Registration failed: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Error signing up:', error);
        alert('An unexpected error occurred. Please try again later.');
    }
    // showScreen('category-screen'); // Navigate to category screen
});

// Handle "Login with 42"
DOM.login42Button.addEventListener('click', () => {
		console.log("login42Button.addEventListener()");
		const loginWindow = window.open(
			'/oauth/accounts/login/', // Redirects to backend endpoint for OAuth initiation
			'_blank',          // Open in a new tab or popup
			'width=500,height=600,noopener=false,noreferrer=false'
		);
		fetchUserState(loginWindow);
		
	});
	
DOM.PvCButton.addEventListener('click', () => {
    // if (wsManager.sockets['matchmaking'].readyState === WebSocket.OPEN) {
    //     socket.send(JSON.stringify({ action: 'start_game', player: getPlayerAlias() }));
    // } else {
    //     console.error("WebSocket connection is not open.");
    // }
    console.log("PvC button clicked, showing matchmaking screen...");
    matchmakingTimer.start();
    startPvCMatch();
});

DOM.PvPButton.addEventListener('click', () => {
    console.log("PvP button clicked, showing matchmaking screen...");
    showScreen('matchmaking-screen');
    matchmakingTimer.start();
    connectToMatchmaking();
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
    startPvCMatch();
});

DOM.PvPplayAgainButton.addEventListener('click', () => {
    showScreen('matchmaking-screen');
    matchmakingTimer.start();
    connectToMatchmaking();
});

DOM.AIbackToMenuButton.addEventListener('click', () => {
    showScreen('category-screen');
});

DOM.PvPbackToMenuButton.addEventListener('click', () => {
    showScreen('category-screen');
    wsManager.close('game');
});

DOM.homeLink.addEventListener('click', () => {
	showScreen('category-screen');
});

setCookie('browser_id', generateUUID(), {
    path: '/',
    // domain: '127.0.0.1', // Set this to match the backend's domain
    // secure: true,             // Use true for HTTPS
    sameSite: 'Lax',
    // sameSite: 'None',         // None if cross-origin, Lax/Strict for same-origin
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
});
console.log(getCookie('browser_id'));

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
    const csrftoken = getCookie('csrftoken'); 
    console.log("csrftoken: ", csrftoken);
    const formData = new FormData(); // Use FormData to handle file upload
    formData.append('csrfmiddlewaretoken', csrftoken);
    formData.append('username', DOM.editUsername.value);
    formData.append('email', DOM.editEmail.value);
    formData.append('first_name', DOM.editFirstName.value);
    formData.append('last_name', DOM.editLastName.value);

    const avatarFile = DOM.editAvatar.files[0];
    if (avatarFile) {
        formData.append('avatar', avatarFile); // Include the avatar file
        console.log("Avatar file selected:", avatarFile.name);
    }
    try {
        const response = await fetch('/api/accounts/user-profile/', {
            method: 'PUT',
            headers: {
                'X-CSRFToken': csrftoken,
                'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
            },
            body: formData,
            credentials: 'include',
        });
        const data = await response.json();
        if (response.ok)
        {
            console.log("Profile updated successfully:", data);
            // Update the profile view with the new data
            DOM.profileUsername.textContent = data.username;
            DOM.profileEmail.textContent = data.email;
            DOM.profileFirstName.textContent = data.first_name || 'N/A';
            DOM.profileLastName.textContent = data.last_name || 'N/A';

            if (data.avatar_url) {
                console.log("New avatar URL:", data.avatar_url);
                DOM.profileAvatar.src = data.avatar_url; // Update avatar image
            }
            DOM.editAvatar.value = "";
            // Switch back to view mode
            showScreen('userprofile-screen');
            DOM.profileEdit.classList.add("d-none");
            DOM.profileView.classList.remove("d-none");
        }
        else
            alert(`Failed to update profile: ${data.error || data.detail}`);
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('An unexpected error occurred. Please try again later.');
    }
});

// Show the edit form and hide the view
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

    DOM.editAvatar.value = "";
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

// Cancel editing and return to view mode
DOM.cancelEditButton.addEventListener("click", () => {
    DOM.profileEdit.classList.add("d-none");
    DOM.profileView.classList.remove("d-none");
});

//2PG buttons
DOM.twoPGButton.addEventListener('click', () => {
	is2PG = true;
	console.log("2PG button clicked, showing matchmaking screen...");
	showScreen('2PG-waiting-screen');
	// twoPGTimer.start();
	// connectToMatchmaking("2PG");
});

document.getElementById('signup-avatar').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const fileNameElement = document.getElementById('avatar-filename');
    fileNameElement.textContent = file ? file.name : 'No file selected';
});

DOM.editAvatar.addEventListener("change", () => {
    const file = DOM.editAvatar.files[0];
    const avatarFilename = document.getElementById("avatar-filename-edit");

    if (file) {
        avatarFilename.textContent = `${file.name}`;
        console.log("Avatar file selected:", file.name);
    } else {
        avatarFilename.textContent = "No file selected";
        console.log("No file selected.");
    }
});