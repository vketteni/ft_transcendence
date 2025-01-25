import { wsManager } from './WebSocketManager.js';
import { fetchUserState } from './fetchUserState.js';
import { showScreen } from './showScreen.js';
import { connectToMatchmaking } from './WebsocketMatchmaking.js';
import { DOM } from './dom.js';
import { Timer } from './Timer.js';
import { localState, resetLocalState } from './state.js';

let isPaused = false;
const matchmakingTimer = new Timer(DOM.matchmakingTimer);
const AItimer = new Timer(DOM.AItimer);
export let isLocal = false;
export let localTour = false;

export function stopAndResetTimer() {
    matchmakingTimer.stop();
    matchmakingTimer.reset();
}

export const Buttons = {
    init() {
        // login buttons
        DOM.signupButton.addEventListener('click', () => {
            event.preventDefault(); 
            console.log("signupButton.addEventListener");
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

        DOM.loginExitButton.addEventListener('click', () => {
            showScreen('category-screen');
        });
        
        DOM.signupExitButton.addEventListener('click', () => {
            showScreen('category-screen');
        });

        DOM.editProfileButton.addEventListener("click", () => {
            // console.log("editProfileButton.addEventListener");
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
            DOM.profileEdit.classList.add("d-noneif (localState.ball.render) {");
            DOM.profileView.classList.remove("d-none");
        });

        DOM.profileExitButton.addEventListener('click', () => {
            showScreen('category-screen');
        });

		//PVP Buttons
		DOM.PvPaddFriendButton.addEventListener('click', () => {
            showScreen('add-friend-screen');
        });

        DOM.lgButton.addEventListener('click', () => {
            isLocal = true;
            showScreen('local-game-alias-screen');
            
        });

        DOM.ltButton.addEventListener('click', () => {
            isLocal = true;
            localTour = true;
            showScreen('local-tournament-alias-screen');
        });
        
        DOM.PvPplayAgainButton.addEventListener('click', () => {
            showScreen('matchmaking-screen');
            matchmakingTimer.start();
            connectToMatchmaking("PVP");
        });

        DOM.PvPbackToMenuButton.addEventListener('click', () => {
            showScreen('category-screen');
            // wsManager.close('game');
        });

        DOM.PvPButton.addEventListener('click', () => {
            console.log("PvP button clicked, showing matchmaking screen...");
            showScreen('matchmaking-screen');
            matchmakingTimer.start();
            connectToMatchmaking("PVP");
        });

        // AI buttons
        DOM.PvCButton.addEventListener('click', () => {
            console.log("PvC button clicked, showing matchmaking screen...");
            showScreen('ai-waiting-screen');
            AItimer.start();
            connectToMatchmaking("PVC");
        });

        DOM.AIplayAgainButton.addEventListener('click', () => {
            AItimer.start();
            showScreen('ai-waiting-screen');
            connectToMatchmaking("PVC");
        });

        DOM.AIbackToMenuButton.addEventListener('click', () => {
            showScreen('category-screen');
            // wsManager.close('game');
        });

        // Local game over buttons
        DOM.lgPlayAgainButton.addEventListener('click', () => {
            resetLocalState();
            console.log("Local game play again button clicked");
            showScreen('game-screen');

        });

        DOM.lgToMenuButton.addEventListener('click', () => {
            showScreen('category-screen');
            resetLocalState();
            isLocal = false;
        });

        // Local tournament game over buttons 
        DOM.ltPlayAgainButton.addEventListener('click', () => {
            resetLocalState();
            console.log("Local tournament play again button clicked");
            showScreen('game-screen');
        });

        DOM.ltToMenuButton.addEventListener('click', () => {
            showScreen('category-screen');
            resetLocalState();
            isLocal = false;
            localTour = false;
        });

        // Game screen buttons
        DOM.pauseButton.addEventListener('click', () => {
            isPaused = !isPaused;

            if (isPaused) {
                DOM.pauseButton.classList.add('paused');
                DOM.pauseButton.textContent = "Resume";
                if (isLocal) {
                    localState.isPaused = true;
                }
                else {
                    wsManager.send('game', { action: 'pause_game' });
                }
            } else {
                DOM.pauseButton.classList.remove('paused');
                DOM.pauseButton.textContent = "Pause";
                if (isLocal) {
                    localState.isPaused = false;
                }
                else {
                    wsManager.send('game', { action: 'resume_game' });
                }
            }
        });

        DOM.exitButton.addEventListener('click', () => {
            showScreen('category-screen');
            if (!isLocal)
                wsManager.close('game');
            else {
                isLocal = false;
                resetLocalState();
            }        
        });

        DOM.tournamentButton.addEventListener('click', () => {
            showScreen('tournament-screen');
        });
    },
};




// DOM.matchmakingExitButton.addEventListener('click', () => {
//     showScreen('category-screen');
//     wsManager.close('matchmaking');
// 	wsManager.close('game');
// });