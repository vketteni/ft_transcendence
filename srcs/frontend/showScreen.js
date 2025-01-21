import { updateTopBar } from './topBar.js'
import { DOM } from './dom.js'
import { fetchUserState } from './fetchUserState.js'
import { renderLoop, resizeCanvas } from './render.js';
import { loadUserInfo } from './userProfile.js';

export function showScreen(screenId, addToHistory = true) {
    const screens = [
        DOM.loginScreen,
        DOM.signupScreen,
        DOM.categoryScreen,
        DOM.gameScreen,
        DOM.AIgameOverScreen,
        DOM.userprofileScreen,
        DOM.matchmakingScreen,
		DOM.AIwaitingScreen
    ];
    screens.forEach(screen => {
        if (screen.id === screenId) {
            // console.log("showScreen: ", screenId);
            screen.classList.remove('d-none');
            if (screenId === 'game-screen') {
                resizeCanvas();
                renderLoop();
                header.classList.add('d-none');
                console.log("Game screen initialized");
            }
            else {
                header.classList.remove('d-none');
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

	if (addToHistory) {
        history.pushState({ screen: screenId }, "", `#${screenId}`);
    }
    // fetchUserState();
    updateTopBar();
}