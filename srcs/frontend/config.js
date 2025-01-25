
export const GAME_CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleWidth: 15,
    paddleHeight: 100,
    ballDiameter: 20,
    ballSpeed: 4,
    paddleColor: '#FFFFFF',
    ballColor: '#FFFFFF',
};

export function getPlayerID() {
    return localStorage.getItem('playerid');
}

export function setPlayerID(playerid) {
    return localStorage.setItem('playerid', playerid);
}
