import { getPlayerAlias } from './config.js';
import { stopAndResetTimer } from './pong.js';
import { sendDimensions } from './sendToBackend.js';
import { wsManager } from './WebSocketManager.js';
import { connectToGame } from './WebsocketGameroom.js';
import { resizeCanvas } from './render.js';
import { DOM } from './dom.js';

export function connectToMatchmaking() {
    wsManager.connect(
        'matchmaking',
        'ws://localhost:8000/ws/matchmaking/',
        handleMatchmakingMessage,
        handleMatchmakingClose
    );

    // Join the matchmaking queue
    wsManager.send('matchmaking', { type: 'join_queue', data: { player_id: getPlayerAlias() } });
}

function handleMatchmakingMessage(event) {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'queue_update':
            console.log(`Queue status: ${message.data.status}, Position: ${message.data.position}`);
            break;

        case 'match_found':
            console.log('Match found:', message.data);
            promptForGameConnection(message.data);
            break;

        default:
            console.warn('Unknown message type:', message.type);
    }
}

function handleMatchmakingClose(event) {
	if (!wsManager.sockets['game'])
	{
		console.warn('Matchmaking WebSocket closed. Retrying...');
		setTimeout(connectToMatchmaking, 1000);
	}
}

function promptForGameConnection(matchData) {
	const url = "ws://localhost:8000/ws" + matchData.game_room_url + "/"
	console.log(url)
	
	stopAndResetTimer();
    const accept = confirm(`Match found. Join game?`);
    if (accept) {
        wsManager.close('matchmaking');
        connectToGame(url);
		DOM.matchmakingTimer.classList.add('d-none');
		// DOM.gameScreen.classList.remove('d-none');
		DOM.canvas.classList.remove('d-none');
		resizeCanvas();
		wsManager.send('game', { action: 'start_game', player: getPlayerAlias() });

    } else {
        console.log('Game declined.');
    }
}
