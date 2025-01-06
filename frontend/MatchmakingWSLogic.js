import { wsManager } from './WebSocketManager';

function connectToMatchmaking() {
    wsManager.connect(
        'matchmaking',
        'ws://localhost:8000/ws/matchmaking/',
        handleMatchmakingMessage,
        handleMatchmakingClose
    );

    // Join the matchmaking queue
    wsManager.send('matchmaking', { type: 'join_queue', data: { player_id: 12345 } });
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
    console.warn('Matchmaking WebSocket closed. Retrying...');
    setTimeout(connectToMatchmaking, 1000);
}

function promptForGameConnection(matchData) {
    const accept = confirm(`Match found with ${matchData.opponent}. Join game?`);
    if (accept) {
        wsManager.close('matchmaking');
        connectToGame(matchData.game_room_url);
    } else {
        console.log('Game declined.');
    }
}
