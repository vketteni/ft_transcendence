import { wsManager } from './WebSocketManager.js';
import { showScreen } from './showScreen.js';
import { updateServerState, resetClientState } from './state.js';
import { DOM } from './dom.js';

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
			winner = data.winner;
			gameOverMessage = `Game Over! ${winner} wins!`;
			document.getElementById('ai-game-over-message').textContent = gameOverMessage;
			showScreen('ai-game-over-screen');
            wsManager.close('game');
            resetClientState();
            break ;
        case 'game_over':
			console.log("Game Over!", data);
            wsManager.close('game');
            resetClientState();

            winner = data.winner;
            gameOverMessage = `Game Over! ${winner} wins!`;
            document.getElementById('pvp-game-over-message').textContent = gameOverMessage;
            showScreen('pvp-game-over-screen');
            break ;
        case 'tournament':
			winner = data.winner;
			
			wsManager.close('game');
			resetClientState();
			
			console.log("Debug log: data:", data);
			if (data.next == null) {
				console.log("Tournament over!", data);
				winner = data.winner;
				gameOverMessage = `Tournament Over! ${winner} wins!`;
				DOM.TRNMTgameOverMessage.textContent = gameOverMessage;
				DOM.TRNMTgoToNextGameButton.innerText = "Back To Menu";
				DOM.TRNMTgoToNextGameButton.onclick = () => {
					console.log("Tournament ended listener");
					showScreen('category-screen');
				}
				showScreen('trnmt-game-over-screen');
			} else {
				console.log("Match finished!", data);
				
				let next_player1 = data.next.players[0]
				let next_player2 = data.next.players[1]
				let url = data.next.url
				gameOverMessage = `Match finished! ${winner} wins!`;
				let nextGameMessage = `Next Match ${next_player1} vs ${next_player2}!`;
				DOM.TRNMTgameOverMessage.textContent = gameOverMessage + "\n" + nextGameMessage;
				DOM.TRNMTgoToNextGameButton.onclick = () => {
					console.log("Next match listener. Url:", url);
				
					showScreen('game-screen');
					connectToGame(url);
					wsManager.send('game', { action: 'player_ready' });
				}
				showScreen('trnmt-game-over-screen');
				
			}

            break ;
        default:
            console.warn('Unknown game message type:', data.type);
    }
}

function handleGameClose(event) {
    
    console.warn('Game WebSocket closed.');
}

