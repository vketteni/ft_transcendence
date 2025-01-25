import { updateTopBar } from './topBar.js'
import { DOM } from './dom.js'
import { fetchUserState } from './fetchUserState.js'
import { renderLoop, resizeCanvas } from './render.js';
import { loadUserInfo } from './userProfile.js';
import { loadMatchHistory } from './matchHistory.js';

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
        DOM.twoPGwaitingScreen,
        DOM.PvPgameOverScreen,
		DOM.profileEdit,
		DOM.tournamentScreen,
        DOM.friendScreen,
        DOM.matchHistoryScreen,
		DOM.TRNMTgameOverScreen,
		DOM.acceptScreen,
        // DOM.twoPGgameOverScreen,
    ];
	if (screenId === 'profileEdit') {
		console.log(`edit profile screen added to history: ${addToHistory}`)
	}
    const defaultScreen = DOM.categoryScreen; // Define the category screen as the default

    console.log(screens);
    // Validate screenId or fall back to the default screen
    const targetScreen = screens.find(screen => screen.id === screenId) || defaultScreen;

    // Show or hide screens
    screens.forEach(screen => {
        if (screen === targetScreen) {
            screen.classList.remove('d-none'); // Show the target screen

            // Special case: game screen setup
            if (screenId === 'game-screen') {
                resizeCanvas();
                renderLoop();
                console.log("Game screen initialized");
            }

            // Special case: load user info on profile screen
            if (screenId === 'userprofile-screen') {
                loadUserInfo();
            }

            // Special case: load user info on profile screen
            if (screenId === 'match-history-screen') {
                loadMatchHistory();
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
