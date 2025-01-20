import { GAME_CONFIG } from './config.js';

export let gameState = {
    paddles: {
        left: { y: GAME_CONFIG.canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2, score: 0 },
        right: { y: GAME_CONFIG.canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2, score: 0 },
    },
    ball: { x: GAME_CONFIG.canvasWidth / 2, y: GAME_CONFIG.canvasHeight / 2 },
};

