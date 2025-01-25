import { updateTopBar } from './topBar.js'
import { DOM } from './dom.js'
import { renderLoop, resizeCanvas } from './render.js';
import { loadUserInfo } from './userProfile.js';
import { localRenderLoop } from './render_local.js';
import { localState, resetLocalState } from './state.js';
import { isLocal } from './buttons.js';
import { wsManager } from './WebSocketManager.js';
import { setIsLocal, setLocalTour, resetIsPaused } from './buttons.js';
import { loadMatchHistory } from './matchHistory.js';
import { loadFriends } from './friendsList.js';

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
		DOM.profileEdit,
		DOM.tournamentScreen,
        DOM.lgGameOverScreen,
        DOM.ltGameOverScreen,
        DOM.ltIntGameOverScreen,
        DOM.lgEnterAliasesScreen,
        DOM.ltEnterAliasesScreen,
        DOM.tournamentScreen,
        DOM.friendScreen,
        DOM.matchHistoryScreen,
		DOM.TRNMTgameOverScreen,
		DOM.acceptScreen,
    ]
    // screens.forEach((screen, index) => {
    //     console.log(`Screen ${index}:`, screen);
    // });
    
	if (screenId === 'profileEdit') {
		console.log(`edit profile screen added to history: ${addToHistory}`)
	}
    const defaultScreen = DOM.categoryScreen; // Define the category screen as the default

    // console.log(screens);
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
                    console.log("Local rendering loop started");
                    requestAnimationFrame(localRenderLoop);
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

            // Special case: load user info on profile screen
            if (screenId === 'match-history-screen') {
                loadMatchHistory();
            }

            // Special case: load user info on profile screen
            if (screenId === 'friends-screen') {
                loadFriends();
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
        if (isLocal) {
            resetLocalState();
            setIsLocal(false);
            setLocalTour(false);
            resetIsPaused();
        }
        if (wsManager.sockets['matchmaking']) {
            wsManager.close('matchmaking');
        }
    
        if (wsManager.sockets['game']) {
            wsManager.close('game');
        }
        DOM.topBarNav.classList.remove('d-none'); // Ensure header is shown for category
    }
    updateTopBar(); // Update the top bar dynamically
}
