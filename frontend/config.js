export const GAME_CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleWidth: 0.02,
    paddleHeight: 0.2,
    ballDiameter: 0.03,
    paddleColor: '#FFFFFF',
    ballColor: '#FFFFFF',
};

export let playerAlias = '';
export let socket = null;

export function initializeWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket('ws://localhost:8000/ws/game/room1/');
        socket.onclose = () => {
            // console.error("WebSocket closed. Attempting to reconnect...");
            setTimeout(() => initializeWebSocket(), 1000); // Retry after 1 second
        };
        // socket.onerror = (error) => {
        //     console.error("WebSocket error:", error);
        // };
    }
}

export function setPlayerAlias(alias) {
    playerAlias = alias;
}

export function getPlayerAlias() {
    return playerAlias;
}
