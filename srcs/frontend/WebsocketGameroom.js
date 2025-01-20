import { wsManager } from './WebSocketManager.js';
import { showScreen } from './pong.js';
import { updateServerState } from './state.js';

export function connectToGame(gameRoomUrl) {
    wsManager.connect(
        'game',
        gameRoomUrl,
        handleGameMessage,
        handleGameClose
    );
	console.log("wsManager.connect called");
}

function handleGameMessage(event) {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'state_update':
			// console.log("received state");
            updateServerState(data);
            break;
		case 'ai_game_over':
			console.log("AI Game Over!", data);
			const winner = data.winner;
			const gameOverMessage = `Game Over! ${winner} wins!`;
			document.getElementById('ai-game-over-message').textContent = gameOverMessage;
			showScreen('ai-game-over-screen');
            wsManager.close('game');
            break ;
        case 'game_over':
            console.log("Game Over!", data);
            const PVPwinner = data.winner;
            const PVPgameOverMessage = `Game Over! ${PVPwinner} wins!`;
            document.getElementById('pvp-game-over-message').textContent = PVPgameOverMessage;
            showScreen('pvp-game-over-screen');
            wsManager.close('game');
            break ;
        default:
            console.warn('Unknown game message type:', data.type);
    }
}

function handleGameClose(event) {
    
    console.warn('Game WebSocket closed.');
}
