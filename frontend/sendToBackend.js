import { GAME_CONFIG, getPlayerAlias, socket } from './config.js';
// import { DOM } from './dom.js';
// import { clientState } from './state.js';

let lastSentInput = null;
const INPUT_THROTTLE_INTERVAL = 50; // in milliseconds

export function sendInput( up, down) {
    const now = Date.now();
    if (lastSentInput && now - lastSentInput < INPUT_THROTTLE_INTERVAL) {
        return; // Skip sending if throttled
    }
    lastSentInput = now;
    socket.send(JSON.stringify({ action: 'input', player: getPlayerAlias, up, down }));
}

export function sendAlias() {
    console.log(`Sending alias "${getPlayerAlias}" to backend.`);
    socket.send(JSON.stringify({ action: 'alias', player: getPlayerAlias() }));
}

export function sendDimensions() {
    const canvasConfig = {
        action: 'canvas_and_game_config',
        canvas: { width: GAME_CONFIG.canvasWidth, height: GAME_CONFIG.canvasHeight },
        paddle: { width: GAME_CONFIG.paddleWidth, height: GAME_CONFIG.paddleHeight },
        ball: { diameter: GAME_CONFIG.ballDiameter },
    };
    console.log("Sending canvas and game config:", canvasConfig);
    socket.send(JSON.stringify(canvasConfig));
}

