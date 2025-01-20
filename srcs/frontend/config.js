
export const GAME_CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleWidth: 0.02,  // Relative to canvas width
    paddleHeight: 0.2,  // Relative to canvas height
    ballDiameter: 0.03,  // Relative to canvas width
    paddleColor: '#FFFFFF',
    ballColor: '#FFFFFF',
};

export function getPlayerID() {
    return localStorage.getItem('playerid');
}

export function setPlayerID(playerid) {
    return localStorage.setItem('playerid', playerid);
}
