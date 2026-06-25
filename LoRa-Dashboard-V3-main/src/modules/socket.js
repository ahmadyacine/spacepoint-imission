
import { io } from 'socket.io-client';

let socket;

export function initSocket(callbacks) {
    // In Socket.IO v4, namespace is appended to the server URL.
    // io('http://localhost:5000/ws/telemetry') connects to the namespace /ws/telemetry on localhost:5000
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const NAMESPACE = '/ws/telemetry';

    socket = io(BACKEND_URL + NAMESPACE, {
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

    const rootSocket = io(BACKEND_URL, {
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
