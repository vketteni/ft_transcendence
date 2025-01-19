import { GAME_CONFIG } from './config.js';

export let clientState = {
    paddles: {
        left: { 
                y: GAME_CONFIG.canvasHeight / 2 - 50,
                x: 0,
                score: 0 },
        right: { 
                y: GAME_CONFIG.canvasHeight / 2 - 50,
                x: GAME_CONFIG.canvasWidth - GAME_CONFIG.paddleWidth,
                score: 0 },
        },
    ball: {
        x: GAME_CONFIG.canvasWidth / 2,
        y: GAME_CONFIG.canvasHeight / 2,
        vx: 0,
        vy: 0,
        render: false,
    },
};

export let serverState = {
        paddles: {
            left: { 
                    y: clientState.paddles.left.y,
                    x: clientState.paddles.left.x,
                    score: clientState.paddles.left.score },
            right: { 
                    y: clientState.paddles.right.y,
                    x: clientState.paddles.right.x,
                    score: clientState.paddles.right.score },
            },
        ball: {
            x: clientState.ball.x,
            y: clientState.ball.y,
            vx: clientState.ball.vx,
            vy: clientState.ball.vy,
            render: clientState.ball.render,
        },
};

export function updateServerState(serverData) {

    serverState.ball.x = serverData.ball.x * GAME_CONFIG.canvasWidth;
    serverState.ball.y = serverData.ball.y * GAME_CONFIG.canvasHeight;
    serverState.ball.vx = serverData.ball.vx * GAME_CONFIG.canvasWidth;
    serverState.ball.vy = serverData.ball.vy * GAME_CONFIG.canvasHeight;
    serverState.ball.render = serverData.ball.render;

    serverState.paddles.left.y = serverData.paddles.left.y * GAME_CONFIG.canvasHeight;
    serverState.paddles.left.x = serverData.paddles.left.x * GAME_CONFIG.canvasWidth;
    serverState.paddles.left.score = serverData.paddles.left.score;
    serverState.paddles.right.y = serverData.paddles.right.y * GAME_CONFIG.canvasHeight;
    serverState.paddles.right.x = serverData.paddles.right.x * GAME_CONFIG.canvasWidth;
    serverState.paddles.right.score = serverData.paddles.right.score;
}


