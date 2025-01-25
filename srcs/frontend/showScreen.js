import { updateTopBar } from './topBar.js'
import { DOM } from './dom.js'
import { renderLoop, resizeCanvas } from './render.js';
import { loadUserInfo } from './userProfile.js';
import { localRenderLoop } from './render_local.js';
import { localState } from './state.js';
import { isLocal } from './buttons.js';

export function showScreen(screenId, addToHistory = true) {
    const screens = [
        DOM.loginScreen,
        DOM.signupScreen,
        DOM.categoryScreen,
        DOM.gameScreen,
        DOM.AIgameOverScreen,
        DOM.userprofileScreen,
        DOM.matchmakingScreen,
        DOM.AIwaitingScreen,
        DOM.PvPgameOverScreen,
		DOM.signupScreen,
		DOM.profileEdit,
		DOM.tournamentScreen,
        DOM.localGameOverScreen,
        DOM.localTournamentGameOverScreen,
        DOM.lgEnterAliasesScreen,
        DOM.ltEnterAliasesScreen
    ]
    
	const defaultScreen = DOM.categoryScreen; // Define the category screen as the default

    // Validate screenId or fall back to the default screen
    const targetScreen = screens.find(screen => screen.id === screenId) || defaultScreen;
    
    // Show or hide screens
    screens.forEach(screen => {
            if (screen === targetScreen) {
            screen.classList.remove('d-none'); // Show the target screen

            // Special case: game screen setup
            if (screenId === 'game-screen') {
                if (isLocal) {

                    localState.gameStarted = true;
                    localState.isPaused = false;
                    resizeCanvas();
                    requestAnimationFrame(localRenderLoop);
                    console.log("Local game rendering started");
                }
                else {
                    resizeCanvas();
                    renderLoop();
                }
                console.log("Game screen initialized");
            }

            // Special case: load user info on profile screen
            if (screenId === 'userprofile-screen') {
                loadUserInfo();
            }
        } else {
            screen.classList.add('d-none'); // Hide all other screens
        }
    });

    // Push state to history if requested
    if (addToHistory) {
        history.pushState({ screen: targetScreen.id }, "", `#${targetScreen.id}`);
    }

    // Ensure the header is fully visible when showing the category screen
    if (targetScreen === defaultScreen) {
        DOM.topBarNav.classList.remove('d-none'); // Ensure header is shown for category
    }

    updateTopBar(); // Update the top bar dynamically
}
