import { GAME_CONFIG, getPlayerAlias } from './config.js';
import { wsManager } from './WebSocketManager.js';
// import { DOM } from './dom.js';
// import { clientState } from './state.js';

let lastSentInput = null;
const INPUT_THROTTLE_INTERVAL = 50; // milliseconds

export function sendInput(up, down) {
    const now = Date.now();
    if (lastSentInput && now - lastSentInput < INPUT_THROTTLE_INTERVAL) {
        return; // Skip sending if throttled
    }
    lastSentInput = now;

    // Use WebSocketManager for sending input
    wsManager.send('game', {
        action: 'input',
        player: getPlayerAlias(),
        up,
        down
    });
}

// this function has been commented out
// front communicates with back with post requests
export function sendAlias() {
    console.log(`Sending alias "${getPlayerAlias()}" to backend.`);
    wsManager.send('game', {
        action: 'alias',
        player: getPlayerAlias()
    });
}


export function sendDimensions() {
    const canvasConfig = {
        action: 'canvas_and_game_config',
        canvas: { width: GAME_CONFIG.canvasWidth, height: GAME_CONFIG.canvasHeight },
        paddle: { width: GAME_CONFIG.paddleWidth, height: GAME_CONFIG.paddleHeight },
        ball: { diameter: GAME_CONFIG.ballDiameter },
    };
    console.log("RESIZE: sending canvas and game config:", canvasConfig);

    // Use WebSocketManager for sending game dimensions
    wsManager.send('game', canvasConfig);
}


