import { GAME_CONFIG } from './config.js';

export let clientState = {
    paddles: {
        left: { y: GAME_CONFIG.canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2, score: 0 },
        right: { y: GAME_CONFIG.canvasHeight / 2 - GAME_CONFIG.paddleHeight / 2, score: 0 },
    },
    ball: {
        x: GAME_CONFIG.canvasWidth / 2,
        y: GAME_CONFIG.canvasHeight / 2,
        vx: 4,
        vy: 4,
        render: false,
    },
};

export let serverState = {
    ball: {
        x: clientState.ball.x,
        y: clientState.ball.y,
        vx: clientState.ball.vx,
        vy: clientState.ball.vy,
        render: clientState.ball.render,
    },
    paddles: {
        left: { y: clientState.paddles.left.y, score: clientState.paddles.left.score },
        right: { y: clientState.paddles.right.y, score: clientState.paddles.right.score },
    },
};
