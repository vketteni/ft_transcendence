import { wsManager } from './WebSocketManager.js';
import { showScreen } from './showScreen.js';
import { updateServerState, resetClientState } from './state.js';

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
	let winner;
	let gameOverMessage;

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
            resetClientState();
            break ;
        case 'game_over':
            console.log("Game Over!", data);
            winner = data.winner;
            gameOverMessage = `Game Over! ${PVPwinner} wins!`;
            document.getElementById('pvp-game-over-message').textContent = gameOverMessage;
            showScreen('pvp-game-over-screen');
            wsManager.close('game');
            resetClientState();
            break ;
        case 'tournament':
            console.log("Match finished!", data);
            winner = data.winner;
			next_player1 = data.players[0]
			next_player2 = data.players[1]
			url = data.game
            gameOverMessage = `Match finished! ${winner} wins!`;
            let nextGameMessage = `Next Match ${next_player1} vs ${next_player2}!`;
            document.getElementById('pvp-game-over-message').textContent = gameOverMessage + "\n" + nextGameMessage;
            showScreen('pvp-game-over-screen');
            wsManager.close('game');
			connectToGame(url);
            resetClientState();
            break ;
        default:
            console.warn('Unknown game message type:', data.type);
    }
}

function handleGameClose(event) {
    
    console.warn('Game WebSocket closed.');
}
