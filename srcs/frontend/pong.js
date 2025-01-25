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
import { Buttons, isLocal, setIsLocal, setLocalTour, resetIsPaused } from './buttons.js';
import { localState, resetLocalState } from './state.js';
import { localTournament, startTournamentMatch } from './localTournament.js';
import { lgPlayers } from './render_local.js'

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
            showScreen('category-screen');

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
            showScreen('login-screen');
        } else {
            alert(`Sign Up Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Error signing up:', error);
        alert('An unexpected error occurred. Please try again later.');
    }
});

DOM.lgEnterAliasesForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const lgPlayer1 = DOM.lgPlayer1.value.trim();
    const lgPlayer2 = DOM.lgPlayer2.value.trim();

    if (!lgPlayer1 || !lgPlayer2) {
        alert("Both players must enter a name!");
        return;
    }
    if (lgPlayer1 === lgPlayer2) {
        alert("Both players must have unique names!");
        return;
    }
    lgPlayers.splice(0, lgPlayers.length, lgPlayer1, lgPlayer2);
    console.log("lgEnterAliasesForm");
    showScreen('game-screen');

});

DOM.ltEnterAliasesForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const ltPlayer1 = DOM.ltPlayer1.value.trim();
    const ltPlayer2 = DOM.ltPlayer2.value.trim();
    const ltPlayer3 = DOM.ltPlayer3.value.trim();
    const ltPlayer4 = DOM.ltPlayer4.value.trim();

    if (!ltPlayer1 || !ltPlayer2 || !ltPlayer3 || !ltPlayer4) {
        alert("All players must enter a name!");
        return;
    }
    if (new Set([ltPlayer1, ltPlayer2, ltPlayer3, ltPlayer4]).size !== 4) {
        alert("All players must have unique names!");
        return;
    }

    // Store names and matchups
    localTournament.players = [ltPlayer1, ltPlayer2, ltPlayer3, ltPlayer4];
    localTournament.matches = [
        [ltPlayer1, ltPlayer2], 
        [ltPlayer3, ltPlayer4], 
    ];
    
    localTournament.currentMatchIndex = 0;

    console.log("Tournament Initialized:", localTournament);
    startTournamentMatch();
    
});

window.addEventListener('resize', resizeCanvas);

document.addEventListener("keydown", (e) => handleInput(e, true));
document.addEventListener("keyup", (e) => handleInput(e, false));

function handleInput(event, isPressed) {
    let up = event.key === "ArrowUp" || event.key === "w";
    let down = event.key === "ArrowDown" || event.key === "s";

    if (isLocal) {
        if (event.key === "w") localState.paddles.left.up = isPressed;
        if (event.key === "s") localState.paddles.left.down = isPressed;
        if (event.key === "ArrowUp") localState.paddles.right.up = isPressed;
        if (event.key === "ArrowDown") localState.paddles.right.down = isPressed;
    } else if (wsManager.sockets['game']?.readyState === WebSocket.OPEN) {
        if (up || down) {
            wsManager.send('game', {
                action: "input",
                up: up && isPressed,
                down: down && isPressed,
            });
        }
    }
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
    if (isLocal) {
       resetLocalState();
       setIsLocal(false);
       setLocalTour(false);
       resetIsPaused();
    }
    if (wsManager.sockets['matchmaking']) {
        console.log("Closing matchmaking socket before refresh.");
        wsManager.close('matchmaking');
    }

    if (wsManager.sockets['game']) {
        console.log("Closing game socket before refresh.");
        wsManager.close('game');
    }
});
