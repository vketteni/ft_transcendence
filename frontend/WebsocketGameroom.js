import { serverState } from './state.js';
import { wsManager } from './WebSocketManager.js';
import { showScreen } from './showScreen.js';

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
			console.log("received state");
            updateGameState(data);
            break;
		case 'game_over':
			console.log("Game Over!", data);
			const winner = data.winner;
			const gameOverMessage = `Game Over! ${winner} wins!`;
			document.getElementById('game-over-message').textContent = gameOverMessage;
			showScreen('game-over-screen');

        default:
            console.warn('Unknown game message type:', data.type);
    }
}

function handleGameClose(event) {
    console.warn('Game WebSocket closed.');
}

// Update game state
function updateGameState(data) {
	serverState.paddles.left.y = data.paddles.left.y;
	serverState.paddles.left.score = data.paddles.left.score;
	serverState.paddles.right.y = data.paddles.right.y;
	serverState.paddles.right.score = data.paddles.right.score;
	serverState.ball = data.ball;
}

