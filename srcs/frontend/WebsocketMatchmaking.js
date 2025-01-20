import { getPlayerAlias } from './config.js';
import { stopAndResetTimer } from './pong.js';
import { wsManager } from './WebSocketManager.js';
import { connectToGame } from './WebsocketGameroom.js';
import { showScreen } from './showScreen.js';

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
        wsManager.send('game', { action: 'player_ready' });
        showScreen('game-screen');
    } else {
        console.log('Game declined.');
    }
}

export function startPvCMatch() {
    const roomName = `ai_game_${Date.now()}`;
    const url = `ws://localhost:8000/ws/game/${roomName}/`;

    stopAndResetTimer();

    console.log(`Starting AI match in room: ${roomName}`);
    
    connectToGame(url);

    wsManager.send('game', { 
        action: 'player_ready', 
        player_id: getPlayerAlias(),
        ai_controlled: true
    });

    showScreen('game-screen');
}


