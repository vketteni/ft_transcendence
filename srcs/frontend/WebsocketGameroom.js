import { wsManager } from './WebSocketManager.js';
import { showScreen } from './showScreen.js';
import { updateServerState, resetClientState } from './state.js';
import { DOM } from './dom.js';

export function connectToGame(gameRoomUrl) {
	let existingGameUrl = localStorage.getItem("game_url");
    if (!gameRoomUrl && existingGameUrl) {
        console.log(`Reconnecting to existing game: ${existingGameUrl}`);
        wsManager.connect('game', existingGameUrl, handleGameMessage, handleGameClose);
        return;
    }

    if (gameRoomUrl) {
        console.log(`Connecting to new game: ${gameRoomUrl}`);
        wsManager.connect('game', gameRoomUrl, handleGameMessage, handleGameClose);
    }
}

function handleGameMessage(event) {
    const data = JSON.parse(event.data);
	let winner;
	let gameOverMessage;

    switch (data.type) {
        case 'state_update':
            updateServerState(data);
            break;
		case 'ai_game_over':
			console.log("AI Game Over!", data);
			winner = data.winner;
			gameOverMessage = `Game Over! ${winner} wins!`;
			document.getElementById('ai-game-over-message').textContent = gameOverMessage;
			showScreen('ai-game-over-screen');
			localStorage.removeItem("game_url"); 
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
            localStorage.removeItem("game_url"); 
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
    localStorage.removeItem("game_url");
    console.warn('Game WebSocket closed.');
}

