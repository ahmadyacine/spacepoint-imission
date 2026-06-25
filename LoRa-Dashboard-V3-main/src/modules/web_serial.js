export let serialPort = null;
export let serialWriter = null;
export let serialReader = null;
let readerKeepAlive = true;

/**
 * Connect to a Web Serial port.
 * @param {Object} callbacks - { onTelemetry, onAdcsTelemetry, onSerialRx, onSerialTx, onConnect, onDisconnect }
 */
export async function connectWebSerial(callbacks) {
    if (!('serial' in navigator)) {
        throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
        // Request a port and open a connection.
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 115200 }); // ESP32 baud rate

        if (callbacks.onConnect) callbacks.onConnect(serialPort);

        // Start the reading loop in the background
        readerKeepAlive = true;
        readLoop(callbacks);

        return true;
    } catch (error) {
        console.error('Error connecting to Web Serial:', error);
        throw error;
    }
}

export async function disconnectWebSerial(callbacks) {
    readerKeepAlive = false;
    
    if (serialReader) {
        try {
            await serialReader.cancel();
        } catch (e) {}
    }
    
    if (serialWriter) {
        try {
            await serialWriter.close();
        } catch (e) {}
    }
    
    if (serialPort) {
        try {
            await serialPort.close();
        } catch (e) {}
    }
    
    serialPort = null;
    serialReader = null;
    serialWriter = null;
    
    if (callbacks && callbacks.onDisconnect) callbacks.onDisconnect();
}

async function readLoop(callbacks) {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
    serialReader = textDecoder.readable.getReader();

    let buffer = '';

    try {
        while (readerKeepAlive) {
            const { value, done } = await serialReader.read();
            if (done) break;
            
            buffer += value;
            
            // Process complete lines
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                let line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                
                if (!line) continue;
                
                // Emit raw serial RX to terminal
                if (callbacks.onSerialRx) {
                    callbacks.onSerialRx({ line: line, ts: Math.floor(Date.now() / 1000), dir: 'rx' });
                }
                
                // Parse Telemetry
                parseTelemetryLine(line, callbacks);
            }
        }
    } catch (error) {
        console.error('Serial Read Error:', error);
    } finally {
        serialReader.releaseLock();
    }
}

function parseTelemetryLine(rawLine, callbacks) {
    let line = rawLine;
    
    // Strip prefixes
    if (line.startsWith('TX: ')) line = line.substring(4).trim();
    else if (line.startsWith('TX ')) line = line.substring(3).trim();
    else if (line.startsWith('ACK TX: ')) line = line.split('ACK TX: ')[1].trim();
    
    try {
        const raw_data = JSON.parse(line);
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Format 1: SAT ESP32 Firmware
        if (raw_data.temp !== undefined && raw_data.voltage !== undefined) {
            const v = parseFloat(raw_data.voltage || 0);
            const c = parseFloat(raw_data.current || 0);
            const p = raw_data.power || Math.round((v * c) * 100) / 100;
            
            const entry = {
                src: "CDHS_Board",
                dst: "Station_01",
                type: "telemetry",
                timestamp: timestamp,
                data: {
                    temp: raw_data.temp,
                    voltage: v,
                    current: c,
                    power: p
                }
            };
            
            // Dispatch main telemetry
            if (callbacks.onTelemetry) callbacks.onTelemetry(entry);
            
            // Dispatch ADCS telemetry if present
            if (raw_data.yaw !== undefined) {
                const adcs_entry = {
                    roll: raw_data.roll || 0,
                    pitch: raw_data.pitch || 0,
                    yaw: raw_data.yaw || 0,
                    lat: (raw_data.lat && raw_data.lat !== 0) ? raw_data.lat : null,
                    lon: (raw_data.lng && raw_data.lng !== 0) ? raw_data.lng : null,
                    alt: (raw_data.alt && raw_data.alt !== 0) ? raw_data.alt : null,
                    wheel_x: 0, wheel_y: 0, wheel_z: 0
                };
                if (callbacks.onAdcsTelemetry) callbacks.onAdcsTelemetry(adcs_entry);
            }
        }
    } catch (e) {
        // Not a JSON telemetry line, ignore
    }
}

export async function writeCommand(commandStr, callbacks) {
    if (!serialPort || !serialPort.writable) {
        console.warn('Cannot write: Serial port not open');
        return false;
    }
    
    try {
        if (!serialWriter) {
            const textEncoder = new TextEncoderStream();
            const writableStreamClosed = textEncoder.readable.pipeTo(serialPort.writable);
            serialWriter = textEncoder.writable.getWriter();
        }
        
        const payload = `CMD ${commandStr}\n`;
        await serialWriter.write(payload);
        
        if (callbacks && callbacks.onSerialTx) {
            callbacks.onSerialTx({ line: payload.trim(), ts: Math.floor(Date.now() / 1000), dir: 'tx' });
        }
        return true;
    } catch (e) {
        console.error('Serial Write Error:', e);
        return false;
    }
}
