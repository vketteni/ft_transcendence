class WebSocketManager {
    constructor() {
        this.sockets = {}; // Store active WebSocket connections
        this.messageQueue = {}; // Queue messages for each WebSocket
    }

    connect(name, url, onMessage, onClose) {
        if (this.sockets[name]) {
            console.warn(`WebSocket '${name}' is already connected.`);
            return;
        }

        const socket = new WebSocket(url);

        this.messageQueue[name] = []; // Initialize message queue for this socket

        socket.onopen = () => {
            console.log(`WebSocket '${name}' connected.`);
            localStorage.setItem(`${name}_url`, url); 
            // Send queued messages
            while (this.messageQueue[name].length > 0) {
                const message = this.messageQueue[name].shift();
                socket.send(JSON.stringify(message));
            }
        };

        socket.onmessage = onMessage;
        socket.onclose = (event) => {
            console.warn(`WebSocket '${name}' closed.`);
            if (name === 'game') {
                localStorage.removeItem("game_url");
            }
        
            localStorage.removeItem(`${name}_url`); // ✅ Removes any other stored WebSocket URLs
            if (onClose) onClose(event);
        };

        socket.onerror = (error) => console.error(`WebSocket '${name}' error:`, error);

        this.sockets[name] = socket;
    }

    send(name, data) {
        const socket = this.sockets[name];
        if (socket) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(data));
            } else if (socket.readyState === WebSocket.CONNECTING) {
                console.log(`WebSocket '${name}' is still connecting. Queueing message.`);
                this.messageQueue[name].push(data);
            } else {
                console.error(`WebSocket '${name}' is not open or connecting.`);
            }
        } else {
            console.error(`WebSocket '${name}' does not exist.`);
        }
    }

    close(name) {
        const socket = this.sockets[name];
        if (socket) {
            socket.close();
            delete this.sockets[name];
            delete this.messageQueue[name];
        } else {
			
            console.warn(`WebSocket '${name}' does not exist.`);
        }
    }
}

export const wsManager = new WebSocketManager();
