import { updateTopBar } from './topBar.js'
import { DOM } from './dom.js'
import { fetchUserState } from './fetchUserState.js'
import { resizeCanvas } from './render.js';
import { loadUserInfo } from './userProfile.js';

export function showScreen(screenId) {
	console.log("enter showScreen screenID: ", screenId);
	const screens = [
		// DOM.registrationScreen,
		DOM.loginScreen,
		DOM.signupScreen,
		DOM.categoryScreen,
		DOM.gameScreen,
		// DOM.gameOverScreen,
		DOM.AIgameOverScreen,
		DOM.userprofileScreen,
		DOM.matchmakingScreen
	];

	console.log("screens", screens);
	screens.forEach(screen => {
		if (screen.id === screenId) {

			screen.classList.remove('d-none');

			if (screenId === 'game-screen') {
				resizeCanvas();
				console.log("Game screen initialized");
			}

			if (screenId === 'userprofile-screen')
			{
				loadUserInfo();
				
			}

		} else {
			screen.classList.add('d-none');
		}
	});

	// Ensure category screen is always the default
	if (!screenId) {
		DOM.categoryScreen.classList.remove('d-none');
	}
	// fetchUserState();
	updateTopBar();
}
