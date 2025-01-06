function connectToGame(gameRoomUrl) {
    wsManager.connect(
        'game',
        gameRoomUrl,
        handleGameMessage,
        handleGameClose
    );
}

function handleGameMessage(event) {
    const message = JSON.parse(event.data);
    console.log('Game message received:', message);

    // Handle game-specific messages (e.g., game state updates)
}

function handleGameClose(event) {
    console.warn('Game WebSocket closed.');
}
