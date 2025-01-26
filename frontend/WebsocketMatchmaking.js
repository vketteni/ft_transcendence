import { stopAndResetTimer } from './buttons.js';
import { wsManager } from './WebSocketManager.js';
import { connectToGame } from './WebsocketGameroom.js';
import { showScreen } from './showScreen.js';
import { DOM } from './dom.js';

export function connectToMatchmaking(queue_type="PVP") {
    let user_id = localStorage.getItem('user_id') || localStorage.getItem('browser_id');

    let newUrl = `/ws/matchmaking?queue_name=${queue_type}&user_id=${user_id}`;
    wsManager.connect('matchmaking', newUrl, handleMatchmakingMessage, handleMatchmakingClose);
    console.log("join_queue with player id:", user_id);
}

function handleMatchmakingMessage(event) {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'queue_update':
            console.log(`Queue status: ${message.data.status}, Position: ${message.data.position}`);
            break;

        case 'match_found':
            console.log('Match found:', message.data);
            localStorage.setItem("game_url", message.data.room_url);

			promptForGameConnection(
				"Match found. Join game?",
				() => {
					connectToGame(message.data.room_url);
                    wsManager.close('matchmaking');
			        stopAndResetTimer();
					wsManager.send('game', { action: 'player_ready' });
                    showScreen('game-screen');
				},
				() => {
					console.log('Game declined.');
                    localStorage.removeItem("game_url");

                    wsManager.close('matchmaking');
			        stopAndResetTimer();
					showScreen('category-screen')
				}
			);
            break;

		case 'error':
            console.warn('Matchmaking: Error Message:', message.message);
			break;

        default:
            console.warn('Unknown message type:', message.type);
    }
}

function handleMatchmakingClose(event) {
    localStorage.removeItem("matchmaking_url")
	if (!wsManager.sockets['game'])
	{
		console.warn('Matchmaking WebSocket closed. Retrying...');
		// setTimeout(connectToMatchmaking, 1000);
	}
}

function promptForGameConnection(prompt, onAccept, onReject) {
    showScreen('accept-screen');
    
	DOM.acceptText.innerText = prompt;

    // Attach dynamic event listeners
    DOM.acceptButton.onclick = () => {
        onAccept(); // Execute the passed "Accept" logic
    };
    DOM.rejectButton.onclick = () => {
        onReject(); // Execute the passed "Reject" logic
    };
}


