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

export function sendAlias() {
    console.log(`Sending alias "${getPlayerAlias()}" to backend.`);
    wsManager.send('game', {
        action: 'alias',
        player: getPlayerAlias()
    });
}



