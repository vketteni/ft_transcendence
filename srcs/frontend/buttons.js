import { wsManager } from './WebSocketManager.js';
import { sendAlias } from './sendToBackend.js';
import { connectToMatchmaking, startPvCMatch } from './WebsocketMatchmaking.js';
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

DOM.exitButton.addEventListener('click', () => {
    showScreen('category-screen');
    wsManager.close('game');
});

DOM.loginExitButton.addEventListener('click', () => {
    showScreen('category-screen');
});

DOM.signupExitButton.addEventListener('click', () => {
    showScreen('category-screen');
});

DOM.profileExitButton.addEventListener('click', () => {
    showScreen('category-screen');
});
// DOM.matchmakingExitButton.addEventListener('click', () => {
//     showScreen('category-screen');
//     wsManager.close('matchmaking');
// 	wsManager.close('game');
// });