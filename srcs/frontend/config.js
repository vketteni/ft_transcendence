
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

export function getBrowserID() {
    return localStorage.getItem('browser_id');
}

export function setBrowserID(browser_id) {
    return localStorage.setItem('browser_id', playerid);
}
