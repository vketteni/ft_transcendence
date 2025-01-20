export const GAME_CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleWidth: 15,
    paddleHeight: 100,
    ballDiameter: 20,
    paddleColor: '#FFFFFF',
    ballColor: '#FFFFFF',
};

export let playerAlias = '';
export let socket = null;

export function setPlayerAlias(alias) {
    playerAlias = alias;
}

export function getPlayerAlias() {
    return playerAlias;
}
