import { GAME_CONFIG } from './config.js';
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
    username = localStorage.getItem('username');
    wsManager.send('game', {
        action: 'input',
        player: username,
        up,
        down
    });
}

// this function has been commented out
// front communicates with back with post requests
export function sendAlias() {
    username = localStorage.getItem('username');
    console.log(`Sending alias "${username}" to backend.`);
    wsManager.send('game', {
        action: 'alias',
        player: username
    });
}



