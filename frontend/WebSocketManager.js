class WebSocketManager {
    constructor() {
        this.sockets = {}; // Store active WebSocket connections
    }

    connect(name, url, onMessage, onClose) {
        if (this.sockets[name]) {
            console.warn(`WebSocket '${name}' is already connected.`);
            return;
        }

        const socket = new WebSocket(url);

        socket.onopen = () => console.log(`WebSocket '${name}' connected.`);
        socket.onmessage = onMessage;
        socket.onclose = (event) => {
            console.warn(`WebSocket '${name}' closed.`);
            if (onClose) onClose(event);
        };
        socket.onerror = (error) => console.error(`WebSocket '${name}' error:`, error);

        this.sockets[name] = socket;
    }

    send(name, data) {
        const socket = this.sockets[name];
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(data));
        } else {
            console.error(`WebSocket '${name}' is not open.`);
        }
    }

    close(name) {
        const socket = this.sockets[name];
        if (socket) {
            socket.close();
            delete this.sockets[name];
        } else {
            console.warn(`WebSocket '${name}' does not exist.`);
        }
    }
}

export const wsManager = new WebSocketManager();
