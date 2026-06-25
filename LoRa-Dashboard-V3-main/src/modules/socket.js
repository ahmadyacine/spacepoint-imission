
import { io } from 'socket.io-client';

let socket;

export function initSocket(callbacks) {
    // Connect directly to the origin so Nginx can proxy /socket.io/ correctly.
    // The VITE_BACKEND_URL is used only for REST API calls, NOT for WebSocket.
    const SOCKET_URL = window.location.origin;
    const NAMESPACE = '/ws/telemetry';

    socket = io(SOCKET_URL + NAMESPACE, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
        console.log('Connected to Telemetry Backend');
        if (callbacks.onConnect) callbacks.onConnect();
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Backend');
        if (callbacks.onDisconnect) callbacks.onDisconnect();
    });

    socket.on('telemetry', (data) => {
        if (callbacks.onTelemetry) callbacks.onTelemetry(data);
    });

    socket.on('alert', (data) => {
        if (callbacks.onAlert) callbacks.onAlert(data);
    });

    socket.on('command_update', (data) => {
        if (callbacks.onCommandUpdate) callbacks.onCommandUpdate(data);
    });

    // Root socket for serial events
    const rootSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling']
    });
    
    rootSocket.on('serial_rx', (data) => {
        if (callbacks.onSerialRx) callbacks.onSerialRx(data);
    });
    
    rootSocket.on('serial_tx', (data) => {
        if (callbacks.onSerialTx) callbacks.onSerialTx(data);
    });

    return socket;
}
