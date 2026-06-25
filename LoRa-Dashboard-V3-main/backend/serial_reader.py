import os
import json
import time
import uuid
import serial
import psycopg2
from psycopg2 import pool, extras
import smtplib
from email.mime.text import MIMEText
import threading
from collections import deque
import queue
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_bcrypt import Bcrypt
import paho.mqtt.client as mqtt
import base64
try:
    from dotenv import load_dotenv
    # Load .env from the backend directory
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
    print("[*] Loaded .env file")
except ImportError:
    print("[!] python-dotenv not installed, using system env vars only")

import base64

def decode_jwt_unverified(token):
    """Fallback decoder to avoid PyJWT dependency for unverified decoding"""
    try:
        parts = token.split('.')
        if len(parts) != 3: return {}
        payload_b64 = parts[1]
        payload_b64 += '=' * (-len(payload_b64) % 4)
        return json.loads(base64.b64decode(payload_b64).decode('utf-8'))
    except Exception as e:
        print(f"[JWT] Decode error: {e}")
        return {}

# --- Configuration ---
SERIAL_PORT = os.getenv('SERIAL_PORT', 'COM3')
SERIAL_BAUD = int(os.getenv('SERIAL_BAUD', 115200))
API_PORT = int(os.getenv('API_PORT', 5000))
# Use absolute path so DB is always in the same place regardless of launch directory
# Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/spacepoint_db')

# Connection Pool
try:
    db_pool = pool.SimpleConnectionPool(1, 20, DATABASE_URL)
    print("[*] Database connection pool initialized")
except Exception as e:
    print(f"[!] Failed to initialize database pool: {e}")
    db_pool = None

def get_db_connection():
    if db_pool:
        return db_pool.getconn()
    return psycopg2.connect(DATABASE_URL)

def release_db_connection(conn):
    if db_pool:
        db_pool.putconn(conn)
    else:
        conn.close()

from contextlib import contextmanager

@contextmanager
def db_session(dict_cursor=False):
    conn = get_db_connection()
    try:
        if dict_cursor:
            cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        else:
            cur = conn.cursor()
        yield cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        release_db_connection(conn)

# MQTT Config
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_TOPIC_PREFIX = os.getenv('MQTT_TOPIC_PREFIX', 'sat_dash')

# SMTP Notification Config
IT_ADMIN_EMAIL = os.getenv('IT_ADMIN_EMAIL', 'admin@spacepoint.ae')
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASS = os.getenv('SMTP_PASS')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
CORS(app)
bcrypt = Bcrypt(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# State
telemetry_buffer = deque(maxlen=100)
serial_conn = None
serial_connected = False
active_connections = 0
packets_received = 0
mqtt_client = None
mqtt_connected = False

# ADCS State
ADCS_PORT = os.getenv('ADCS_PORT', 'AUTO')
adcs_conn = None
adcs_connected = False
adcs_port_name = None

# Simulation State
sim_active = False
sim_t = 0

# Alert Debounce Cache: { "device_id:alert_type": last_alert_timestamp }
alert_debounce = {}

bridge_rx_queue = queue.Queue()

def init_db():
    """Initialize PostgreSQL database, indices, alerts, devices, and command log tables"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Telemetry Table
            cur.execute('''CREATE TABLE IF NOT EXISTS telemetry (
                id SERIAL PRIMARY KEY,
                device_id TEXT,
                timestamp BIGINT,
                temp REAL,
                voltage REAL,
                current REAL,
                power REAL,
                uptime INTEGER,
                rssi INTEGER,
                baud_rate INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON telemetry(timestamp)')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_device_id ON telemetry(device_id)')
            
            # Alerts Table
            cur.execute('''CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                device_id TEXT,
                timestamp BIGINT,
                alert_type TEXT,
                threshold REAL,
                current_value REAL,
                severity TEXT,
                acknowledged BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(device_id)')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts(timestamp)')

            # Thresholds Table
            cur.execute('''CREATE TABLE IF NOT EXISTS alert_thresholds (
                device_id TEXT PRIMARY KEY,
                temp_max REAL DEFAULT 35.0,
                temp_min REAL DEFAULT 0.0,
                voltage_max REAL DEFAULT 5.5,
                voltage_min REAL DEFAULT 3.0,
                current_max REAL DEFAULT 1.0,
                power_max REAL DEFAULT 2.0
            )''')
            
            # Devices Table (Registry)
            cur.execute('''CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                first_seen BIGINT,
                last_seen BIGINT,
                firmware_version TEXT,
                capabilities TEXT,
                connection_status TEXT
            )''')
            
            # Command Log Table
            cur.execute('''CREATE TABLE IF NOT EXISTS command_log (
                id SERIAL PRIMARY KEY,
                command_id TEXT UNIQUE,
                device_id TEXT,
                command TEXT,
                status TEXT,
                sent_at BIGINT,
                response_at BIGINT,
                response_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_command_device ON command_log(device_id)')
            
            # Admin Users Table (Shared with Madar)
            cur.execute('''CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                full_name TEXT,
                email TEXT UNIQUE,
                hashed_password TEXT,
                role TEXT DEFAULT 'student',
                invitation_code TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            
            # Mission Images Table
            cur.execute('''CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                filename TEXT,
                device_id TEXT,
                timestamp BIGINT,
                lat REAL,
                lon REAL,
                alt REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            conn.commit()
    except Exception as e:
        print(f"[!] Database Initialization Error: {e}")
        conn.rollback()
    finally:
        release_db_connection(conn)

# --- MQTT Functions ---

def on_mqtt_connect(client, userdata, flags, rc):
    global mqtt_connected
    if rc == 0:
        print("[*] Connected to MQTT Broker!")
        mqtt_connected = True
        # Subscribe to command responses from devices
        client.subscribe(f"{MQTT_TOPIC_PREFIX}/command/response/#")
        # Subscribe to incoming telemetry from ground station board
        client.subscribe(f"{MQTT_TOPIC_PREFIX}/telemetry/#")
        print(f"[MQTT] Subscribed to {MQTT_TOPIC_PREFIX}/telemetry/#")
    else:
        print(f"[!] Failed to connect to MQTT, return code {rc}")
        mqtt_connected = False

def on_mqtt_message(client, userdata, msg):
    """Handle incoming MQTT messages (telemetry from ground station + command responses)"""
    try:
        topic   = msg.topic
        payload = json.loads(msg.payload.decode())

        # --- Telemetry from Ground Station Board (sat/telemetry/<device_id>) ---
        if f"{MQTT_TOPIC_PREFIX}/telemetry/" in topic:
            # Ensure the entry has a real Unix timestamp
            if not payload.get('timestamp'):
                payload['timestamp'] = int(time.time())

            # Relabel as CDHS_Board — the CDHS is connected to the SAT LoRa,
            # so all data received via the LoRa link IS CDHS data.
            # This makes the frontend CDHS filter (src.includes('cdhs')) accept it.
            original_src = payload.get('src', 'unknown')
            payload['src'] = 'CDHS_Board'
            payload['dst'] = 'Station_01'
            print(f"[MQTT] Telemetry from {original_src} via {topic} → relabeled as CDHS_Board")
            process_telemetry(payload)
            return

        # --- Command Response (sat/command/response/<device_id>) ---
        command_id = payload.get('command_id')
        status     = payload.get('status')
        data       = payload.get('data')

        if command_id:
            print(f"[MQTT] Command response for {command_id}: {status}")
            update_command_status(command_id, status, data)

    except Exception as e:
        print(f"[!] MQTT Message Error: {e}")

def start_mqtt():
    """Initialize and start MQTT client in background"""
    global mqtt_client
    try:
        mqtt_client = mqtt.Client()
        mqtt_client.on_connect = on_mqtt_connect
        mqtt_client.on_message = on_mqtt_message
        
        print(f"[*] Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
        mqtt_client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"[!] MQTT Setup Error: {e}")

def update_command_status(command_id, status, response_data=None):
    """Update command status in DB"""
    timestamp = int(time.time())
    response_json = json.dumps(response_data) if response_data else None
    
    try:
        with db_session() as cur:
            cur.execute('''UPDATE command_log 
                SET status = %s, response_at = %s, response_data = %s 
                WHERE command_id = %s''', 
                (status, timestamp, response_json, command_id))
        
        # Notify Frontend
        socketio.emit('command_update', {
            "command_id": command_id,
            "status": status,
            "response_data": response_data,
            "timestamp": timestamp
        }, namespace='/ws/telemetry')
            
    except Exception as e:
        print(f"[!] Command Update Error: {e}")

# --- Helper Functions ---

def update_device_registry(entry):
    """Update device last_seen and status"""
    device_id = entry.get('src')
    timestamp = entry.get('timestamp', int(time.time()))
    firmware = entry.get('fw', 'unknown') 
    
    if not device_id:
        return

    try:
        with db_session() as cur:
            cur.execute("SELECT first_seen FROM devices WHERE device_id = %s", (device_id,))
            row = cur.fetchone()
            
            if row:
                cur.execute('''UPDATE devices 
                    SET last_seen = %s, connection_status = 'connected' 
                    WHERE device_id = %s''', (timestamp, device_id))
            else:
                cur.execute('''INSERT INTO devices 
                    (device_id, first_seen, last_seen, firmware_version, connection_status)
                    VALUES (%s, %s, %s, %s, 'connected')''',
                    (device_id, timestamp, timestamp, firmware))
    except Exception as e:
        print(f"[!] Registry Update Error: {e}")

def monitor_devices():
    """Background task to check for offline devices"""
    print("[*] Device monitor started")
    while True:
        try:
            cutoff = int(time.time()) - 60 
            with db_session() as cur:
                cur.execute('''UPDATE devices 
                    SET connection_status = 'disconnected' 
                    WHERE last_seen < %s AND connection_status = 'connected' ''', (cutoff,))
            socketio.sleep(10)
        except Exception as e:
            print(f"[!] Monitor Error: {e}")
            socketio.sleep(10)

def check_thresholds(entry):
    """Check telemetry data against thresholds and generate alerts"""
    device_id = entry.get('src')
    data = entry.get('data', {})
    timestamp = entry.get('timestamp', int(time.time()))
    
    if not device_id:
        return

    try:
        with db_session(dict_cursor=True) as cur:
            cur.execute("SELECT * FROM alert_thresholds WHERE device_id = %s", (device_id,))
            row = cur.fetchone()
            
        if not row:
            thresholds = {
                "temp_max": 35.0, "temp_min": 0.0,
                "voltage_max": 5.5, "voltage_min": 3.0,
                "current_max": 1.0, "power_max": 2.0
            }
        else:
            thresholds = dict(row)
            
    except Exception as e:
        print(f"[!] Error loading thresholds: {e}")
        return

    checks = [
        # Support both new field names and legacy names
        ("temp",    data.get("temp_C",        data.get("temp")),    thresholds.get("temp_max"),    "max"),
        ("temp",    data.get("temp_C",        data.get("temp")),    thresholds.get("temp_min"),    "min"),
        ("voltage", data.get("bus_voltage_V", data.get("voltage")), thresholds.get("voltage_max"), "max"),
        ("voltage", data.get("bus_voltage_V", data.get("voltage")), thresholds.get("voltage_min"), "min"),
        ("current", data.get("current_mA",   data.get("current")), thresholds.get("current_max"), "max"),
        ("power",   data.get("power_mW",     data.get("power")),   thresholds.get("power_max"),   "max")
    ]

    for param, value, limit, mode in checks:
        if value is None or limit is None:
            continue
            
        is_violation = False
        severity = "info"
        
        if mode == "max":
            if value >= limit:
                is_violation = True
                severity = "critical"
            # Removed 80% warning buffer to reduce noise as per user request
            
        elif mode == "min":
            if value <= limit:
                is_violation = True
                severity = "critical"
        
        if is_violation:
            create_alert(device_id, timestamp, param, limit, value, severity)

def create_alert(device_id, timestamp, alert_type, threshold, value, severity):
    """Create alert if not debounced"""
    debounce_key = f"{device_id}:{alert_type}:{severity}"
    last_time = alert_debounce.get(debounce_key, 0)
    
    # Increased debounce to 5 seconds to avoid overwhelming the user
    if (time.time() - last_time) < 5:
        return

    print(f"[ALERT] {severity.upper()}: {device_id} {alert_type} {value} (Limit: {threshold})")
    
    try:
        with db_session() as cur:
            cur.execute('''INSERT INTO alerts 
                (device_id, timestamp, alert_type, threshold, current_value, severity)
                VALUES (%s, %s, %s, %s, %s, %s)''',
                (device_id, timestamp, alert_type, threshold, value, severity))
        
        # Emit alert to frontend via WebSocket
        socketio.emit('alert', {
            'device_id': device_id,
            'timestamp': timestamp,
            'alert_type': alert_type,
            'threshold': threshold,
            'current_value': value,
            'severity': severity,
            'message': f"{alert_type.upper()} {severity.upper()}: {value} (Limit: {threshold})"
        })
        
    except Exception as e:
        print(f"[!] Alert DB Error: {e}")
        return

    alert_payload = {
        "event": "alert",
        "device_id": device_id,
        "alert_type": alert_type,
        "threshold": threshold,
        "current_value": value,
        "severity": severity,
        "timestamp": timestamp
    }
    socketio.emit('alert', alert_payload, namespace='/ws/telemetry')
    alert_debounce[debounce_key] = time.time()

def process_telemetry(entry):
    """Common processing for serial and injected data"""
    global packets_received
    
    timestamp = entry.get('timestamp', int(time.time()))
    packets_received += 1
    
    # 1. Update In-Memory Buffer
    telemetry_buffer.append(entry)
    
    # 2. Update Device Registry
    update_device_registry(entry)
    
    # 3. Save to SQLite Database
    data_content = entry.get('data', {})
    try:
        with db_session() as cur:
            cur.execute('''INSERT INTO telemetry 
                (device_id, timestamp, temp, voltage, current, power, uptime, rssi, baud_rate)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                (
                    entry.get('src'),
                    timestamp,
                    # Support both new field names (temp_C, bus_voltage_V, etc.) and legacy names
                    data_content.get('temp_C',        data_content.get('temp')),
                    data_content.get('bus_voltage_V', data_content.get('voltage')),
                    data_content.get('current_mA',    data_content.get('current')),
                    data_content.get('power_mW',      data_content.get('power')),
                    data_content.get('uptime'),
                    data_content.get('rssi'),
                    data_content.get('baud_rate')
                ))
    except Exception as e:
        print(f"[!] Database Insert Error: {e}")
        
    # 4. Broadcast
    socketio.emit('telemetry', entry, namespace='/ws/telemetry')
    
    # 5. Check Thresholds
    check_thresholds(entry)

def handle_raw_data(raw_line):
    """Robust parser for raw strings from Serial or Cloud Bridge"""
    if not raw_line: return
    
    # A. Broadcast to Serial Monitor (Default Namespace)
    socketio.emit('serial_rx', {
        'line': raw_line,
        'ts': int(time.time()),
        'dir': 'rx'
    })

    # B. Pre-process Wrapper Prefixes
    line = raw_line
    if raw_line.startswith('TX: '):
        line = raw_line[4:].strip()
    elif raw_line.startswith('TX '):
        line = raw_line[3:].strip()
    elif 'ACK TX: ' in raw_line:
        line = raw_line.split('ACK TX: ', 1)[-1].strip()
    elif '[CDHS] line:' in raw_line:
        line = raw_line.split('[CDHS] line:', 1)[-1].strip()
    elif raw_line.startswith('ADCS:') or raw_line.startswith('BT CMD') or raw_line.startswith('MPU') or raw_line.startswith('==='):
        print(f"[SAT DBG] {raw_line}")
        return
    elif raw_line.strip() == 'PONG':
        socketio.emit('command_ack', {'ack': 'ping', 'response': 'PONG'})
        return
    elif raw_line.startswith('MOTOR:') or raw_line.startswith('  GPIO:') or raw_line.startswith('Speed:') or raw_line.startswith('Axis:'):
        # Already handled by serial monitor emit above, just skip telemetry parse
        return

    # C. JSON Parse & Dispatch
    try:
        raw_data = json.loads(line)
        timestamp = int(time.time())
        
        entry = None
        
        # Format 1: SAT ESP32 Firmware (temp, voltage, current, yaw, pitch, roll...)
        if "temp" in raw_data and "voltage" in raw_data and "yaw" in raw_data:
            v = float(raw_data.get("voltage", 0))
            c = float(raw_data.get("current", 0))
            p = raw_data.get("power") or round(v * c, 2)
            entry = {
                "src": "CDHS_Board",
                "dst": "Station_01",
                "type": "telemetry",
                "timestamp": timestamp,
                "data": {
                    "temp":    raw_data.get("temp"),
                    "voltage": v,
                    "current": c,
                    "power":   p,
                }
            }
            # Special Orientation Dispatch
            socketio.emit('adcs_telemetry', {
                'roll':    raw_data.get('roll', 0),
                'pitch':   raw_data.get('pitch', 0),
                'yaw':     raw_data.get('yaw', 0),
                'lat':     raw_data.get('lat') if raw_data.get('lat', 0) != 0 else None,
                'lon':     raw_data.get('lng') if raw_data.get('lng', 0) != 0 else None,
                'alt':     raw_data.get('alt') if raw_data.get('alt', 0) != 0 else None,
                'wheel_x': 0, 'wheel_y': 0, 'wheel_z': 0
            }, namespace='/ws/telemetry')
            
            socketio.emit('adcs_status', {'connected': True, 'port': 'Shared with CDHS'}, namespace='/ws/telemetry')

        # Format 2: Old CDHS Board Format
        elif "temp_board_C" in raw_data:
            entry = {
                "src": "CDHS_Board", "dst": "Station_01", "type": "telemetry",
                "timestamp": timestamp,
                "data": {
                    "temp":    raw_data.get("temp_board_C"),
                    "voltage": raw_data.get("busVoltage_V"),
                    "current": raw_data.get("current_mA"),
                    "power":   raw_data.get("power_mW")
                }
            }

        # Format 3: Structured Telemetry
        elif "data" in raw_data and "type" in raw_data:
            entry = raw_data
            if "timestamp" not in entry: entry["timestamp"] = timestamp

        # Format 4: Simple ACK
        elif "ack" in raw_data:
            socketio.emit('command_ack', raw_data)
            return

        # Format 5: Generic Fallback
        else:
            entry = {
                "src": "CDHS_Board", "dst": "Station_01", "type": "telemetry",
                "timestamp": timestamp,
                "data": raw_data
            }

        if entry:
            process_telemetry(entry)

    except json.JSONDecodeError:
        pass # Not JSON - ignore
    except Exception as e:
        print(f"[PARSER ERROR] {e} | line: {line[:100]}")


# --- Built-in Simulation Worker ---

def sim_worker():
    """Background task: sends simulated Sat_1 telemetry while sim_active=True"""
    global sim_active, sim_t
    import math, random
    print("[SIM] Simulation worker started (idle until enabled)")
    while True:
        if sim_active:
            temp    = round(25 + 5 * math.sin(sim_t * 0.1) + random.uniform(-0.5, 0.5), 2)
            voltage = round(3.7 + 0.5 * math.sin(sim_t * 0.01), 2)
            current = round(0.5 + random.uniform(0, 0.1), 2)
            power   = round(voltage * current * 1000, 2)   # mW
            rssi    = int(-90 + random.uniform(-10, 20))
            snr     = round(8 + random.uniform(-2, 4), 1)
            entry = {
                "src": "Sat_1",
                "dst": "Station_01",
                "type": "telemetry",
                "timestamp": int(time.time()),
                "data": {
                    "temp": temp,
                    "voltage": voltage,
                    "current": current,
                    "power": power,
                    "rssi": rssi,
                    "snr": snr,
                    "uptime": int(sim_t),
                    "baud_rate": 7,
                    "freq": 868.1
                }
            }
            process_telemetry(entry)
            sim_t += 1
            socketio.sleep(1)
        else:
            socketio.sleep(0.5)   # low-cost idle check

def serial_worker():
    """Background thread to handle serial reading — auto-connects or waits for API"""
    global serial_conn, serial_connected, SERIAL_PORT
    
    # Auto-Connect to the port specified in .env during startup
    if not serial_connected and SERIAL_PORT and SERIAL_PORT != 'AUTO':
        try:
            import serial
            serial_conn = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)
            serial_connected = True
            print(f"[*] Auto-connected payload link on {SERIAL_PORT}")
        except Exception as e:
            print(f"[!] Auto-connect failed on {SERIAL_PORT}: {e}")

    while True:
        try:
            raw_line = None
            
            if serial_connected and serial_conn:
                try:
                    if serial_conn.in_waiting > 0:
                        raw_line = serial_conn.readline().decode('utf-8', errors='replace').strip()
                except Exception as e:
                    print(f"[!] Serial disconnected: {e}")
                    serial_connected = False
            
            if not raw_line:
                try:
                    # Block briefly to collect from bridge script
                    raw_line = bridge_rx_queue.get(timeout=0.1)
                except queue.Empty:
                    if not serial_connected:
                        socketio.sleep(0.5)
                    else:
                        socketio.sleep(0.01)
                    continue
            
            # Pass to shared handler
            handle_raw_data(raw_line)
            
        except Exception as e:
            print(f"[!] Serial worker error: {e}")
            socketio.sleep(1)

# --- WebSocket Events ---

@socketio.on('connect', namespace='/ws/telemetry')
def handle_connect():
    global active_connections
    active_connections += 1
    print(f"[WS] Client connected to /ws/telemetry. Total: {active_connections}")

@socketio.on('disconnect', namespace='/ws/telemetry')
def handle_disconnect():
    global active_connections
    active_connections -= 1
    print(f"[WS] Client disconnected from /ws/telemetry. Total: {active_connections}")

@socketio.on('connect')
def handle_default_connect():
    print(f"[WS] Client connected to DEFAULT namespace")

@socketio.on('disconnect')
def handle_default_disconnect():
    print(f"[WS] Client disconnected from DEFAULT namespace")

# --- API Endpoints ---

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "serial_connected": serial_connected,
        "database": "postgresql",
        "websocket": "enabled",
        "mqtt_connected": mqtt_connected
    })

@app.route('/api/serial/status', methods=['GET'])
def serial_status():
    """Returns serial port name and live connection state."""
    return jsonify({
        "port": SERIAL_PORT,
        "baud": SERIAL_BAUD,
        "connected": serial_connected
    })

# --- Interactive Ground Station Endpoints ---

@app.route('/api/ports', methods=['GET'])
def list_ports_api():
    from serial.tools import list_ports
    ports = []
    best_score = -1
    best_port = None
    for p in list_ports.comports():
        score = 0
        vid = p.vid
        # Give points for common ESP32 / Arduino vendor IDs
        if vid in [0x10C4, 0x1A86, 0x0403, 0x2341, 0x2E8A]: score += 2
        
        ports.append({
            "path": p.device,
            "manufacturer": p.manufacturer,
            "vendorId": f"{p.vid:04X}" if p.vid else None,
            "productId": f"{p.pid:04X}" if p.pid else None,
            "score": score
        })
        if score > best_score:
            best_score = score
            best_port = p.device
            
    ports.sort(key=lambda x: x["score"], reverse=True)
    return jsonify({"ports": ports, "bestGuess": best_port if best_score > 0 else (ports[0]["path"] if ports else None)})


@app.route('/api/connect', methods=['POST'])
def api_connect():
    global serial_conn, serial_connected, SERIAL_PORT, SERIAL_BAUD
    if serial_connected:
        return jsonify({"error": "Already connected to a port."}), 400
        
    data = request.json
    port = data.get('port')
    baud = data.get('baud', SERIAL_BAUD)
    
    if not port: return jsonify({"error": "Port required"}), 400
    
    try:
        import serial
        serial_conn = serial.Serial(port, baud, timeout=1)
        serial_connected = True
        SERIAL_PORT = port
        SERIAL_BAUD = baud
        
        # Notify clients that serial is connected
        socketio.emit('status', {'connected': True, 'port': port}, namespace='/ws/telemetry')
        socketio.emit('status', {'connected': True, 'port': port})
        socketio.emit('serial_status', {'connected': True, 'port': port, 'baud': baud})
        
        return jsonify({"status": "connected", "port": port})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/disconnect', methods=['POST'])
def api_disconnect():
    global serial_conn, serial_connected
    if not serial_connected:
        return jsonify({"status": "already disconnected"})
    try:
        if serial_conn:
            serial_conn.close()
            serial_conn = None
        serial_connected = False
        
        # Notify clients
        socketio.emit('status', {'connected': False, 'port': None}, namespace='/ws/telemetry')
        socketio.emit('status', {'connected': False, 'port': None})
        socketio.emit('serial_status', {'connected': False, 'port': None})
        
        return jsonify({"status": "disconnected"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def send_admin_notification(new_user, user_email):
    """Sends a notification email to the IT admin for approval"""
    if not all([SMTP_SERVER, SMTP_USER, SMTP_PASS]):
        print("[!] Email skipped: SMTP credentials not set in .env")
        return False
        
    subject = f"🛑 Action Required: Admin Registration for {new_user}"
    body = f"""
    The following user has requested admin access for the Satellite Dashboard:
    
    User: {new_user}
    Email: {user_email}
    
    Please log in to the Ground Station Dashboard as Super Admin to approve or deny this request.
    
    ---
    Satellite Command & Data Handling System
    """
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = IT_ADMIN_EMAIL
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        print(f"[*] Admin notification sent to {IT_ADMIN_EMAIL}")
        return True
    except Exception as e:
        print(f"[!] SMTP Error: {e}")
        return False

# --- Authentication System ---

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({"error": "All fields required"}), 400
        
    user_id = str(uuid.uuid4())
    pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    try:
        with db_session() as cur:
            cur.execute("INSERT INTO users (id, full_name, email, hashed_password, role, is_active) VALUES (%s, %s, %s, %s, 'student', FALSE)", 
                         (user_id, username, email, pw_hash))
        
        # 1. Mock Mailer - Log to session_log.txt
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        log_path = os.path.join(root_dir, 'session_log.txt')
        with open(log_path, "a") as f:
            f.write(f"\n[USER REG] {username} ({email}) requested admin access at {time.ctime()}\n")
            
        # 2. Real Email Notification
        threading.Thread(target=send_admin_notification, args=(username, email)).start()
            
        print(f"[*] Registration request for {username} logged.")
        return jsonify({"status": "pending", "message": "Registration request sent to IT Admin."})
    except psycopg2.IntegrityError:
        return jsonify({"error": "Username or Email already exists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
def verify_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"success": False, "error": "No token provided"}), 401
    
    token = auth_header.split(' ')[1]
    try:
        # We assume the token is a valid JWT signed by the main platform.
        # Use fallback decoder to avoid dependency issues with PyJWT
        payload = decode_jwt_unverified(token)
        sub = payload.get('sub')
        
        if not sub:
            return jsonify({"success": False, "error": "Invalid token payload"}), 401

        with db_session(dict_cursor=True) as cur:
            # Check if 'sub' is a UUID or an email
            if sub and '-' in sub and len(sub) > 20: 
                cur.execute("SELECT invitation_code, role, full_name, email FROM users WHERE id = %s", (sub,))
            else:
                cur.execute("SELECT invitation_code, role, full_name, email FROM users WHERE email = %s", (sub,))
            
            user = cur.fetchone()
            if not user:
                return jsonify({"success": False, "error": "User not found"}), 404
            
            # Fetch permissions for this code
            # Default all lockable pages to False for security
            permissions = {
                "data-budget": False, "power-budget": False, "link-budget": False,
                "mass-budget": False, "cost-budget": False, "dashboard": False,
                "lora-dashboard": False, "cdhs-telemetry": False, "adcs-telemetry": False,
                "software-guide": False
            }
            
            if user['invitation_code']:
                cur.execute("""
                    SELECT page_key, is_unlocked FROM page_access 
                    WHERE invitation_code = %s
                """, (user['invitation_code'],))
                for row in cur.fetchall():
                    permissions[row['page_key']] = bool(row['is_unlocked'])
            
            print(f"[*] Verified user {user['email']} via token. Perms: {permissions}")
            
            print(f"[*] Verified user {user['email']} via token. Perms: {permissions}")
            
            return jsonify({
                "success": True, 
                "user": {
                    "username": user['full_name'] or user['email'],
                    "email": user['email'],
                    "role": user['role'],
                    "permissions": permissions
                }
            })
    except Exception as e:
        print(f"[!] Token verification crash: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
         return jsonify({"error": "Credentials required"}), 400

    # Super-Admin Escape Hatch
    if username == "admin@spacepoint.ae" and password == "admin@1234":
        return jsonify({"success": True, "user": {"username": "admin@spacepoint.ae", "role": "admin", "is_super": True}})

    try:
        # 1. Authenticate User
        with db_session(dict_cursor=True) as cur:
            # We allow login via email (matching Madar)
            cur.execute("SELECT * FROM users WHERE email = %s", (username,))
            user = cur.fetchone()
            
        if user and bcrypt.check_password_hash(user['hashed_password'], password):
            if not user['is_active']:
                return jsonify({"error": "Account is inactive"}), 403
            
            # Default all lockable pages to False for security
            permissions = {
                "data-budget": False, "power-budget": False, "link-budget": False,
                "mass-budget": False, "cost-budget": False, "dashboard": False,
                "lora-dashboard": False, "cdhs-telemetry": False, "adcs-telemetry": False,
                "software-guide": False
            }
            
            if user['role'] != 'admin':
                with db_session(dict_cursor=True) as cur:
                    cur.execute("""
                        SELECT page_key, is_unlocked FROM page_access 
                        WHERE invitation_code = %s
                    """, (user['invitation_code'],))
                    for row in cur.fetchall():
                        permissions[row['page_key']] = bool(row['is_unlocked'])
                    
                    if not permissions.get('lora-dashboard'):
                        return jsonify({"error": "You do not have access to the Cube-Sat Ground Station. Please contact your instructor."}), 403

            return jsonify({
                "success": True, 
                "user": {
                    "username": user['full_name'] or user['email'], 
                    "email": user['email'],
                    "role": user['role'],
                    "is_super": user['role'] == 'admin',
                    "permissions": permissions
                }
            })
            
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/permissions/<code>', methods=['GET'])
def get_permissions_by_code(code):
    try:
        permissions = {}
        with db_session(dict_cursor=True) as cur:
            cur.execute("""
                SELECT page_key, is_unlocked FROM page_access 
                WHERE invitation_code = %s
            """, (code,))
            for row in cur.fetchall():
                permissions[row['page_key']] = row['is_unlocked']
        
        return jsonify({"success": True, "permissions": permissions})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/users/pending', methods=['GET'])
def get_pending_users():
    try:
        with db_session(dict_cursor=True) as cur:
            cur.execute("SELECT id, full_name as username, email, created_at FROM users WHERE is_active = FALSE")
            users = [dict(row) for row in cur.fetchall()]
        return jsonify({"users": users})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/approve', methods=['POST'])
def approve_user():
    data = request.json
    user_id = data.get('user_id')
    approve = data.get('approve', True)
    
    try:
        with db_session() as cur:
            if approve:
                cur.execute("UPDATE users SET is_active = TRUE WHERE id = %s", (user_id,))
            else:
                cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/auth', methods=['POST'])
def admin_auth():
    # Legacy shim - eventually remove this once UI is updated
    return auth_login()


@app.route('/api/admin/raw', methods=['POST'])
def admin_raw():
    global serial_conn, serial_connected
    if not serial_conn or not serial_connected:
        return jsonify({"error": "Not connected to a port"}), 400

    data = request.json
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Wrap with [CMD] prefix if not already present
        if not text.startswith('[CMD]'):
            text = f'[CMD]{text}'
        serial_conn.write(f"{text}\n".encode('utf-8'))
        # Emit to serial monitor
        socketio.emit('serial_tx', {
            'line': text,
            'ts': int(time.time()),
            'dir': 'tx'
        })
        socketio.emit('log', f"→ {text}", namespace='/ws/serial-monitor')
        return jsonify({"status": "sent", "payload": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/ground/command', methods=['POST'])
def ground_command():
    global serial_conn, serial_connected
    if not serial_connected:
        return jsonify({"error": "Not connected"}), 400
        
    payload = request.json
    action = payload.get('action')
    cmd_str = ''
    if action == 'motor_time':
        # New time-based motor control
        direction = payload.get('dir', 1)
        speed = payload.get('speed', 255)
        duration = payload.get('time', 2000)
        
        # Convert string directions to int if needed
        if direction == 'cw': direction = 1
        elif direction == 'ccw': direction = -1
        elif direction == 'stop': direction = 0

        # Create Shorthand commands if possible
        if direction == 0:
            cmd_str = json.dumps({"dir": 0, "speed": 0, "time": 0}, separators=(',', ':'))
        elif duration == 0 and speed == 255:
            if direction == 1:
                cmd_str = 'SPIN_CW'
            elif direction == -1:
                cmd_str = 'SPIN_CCW'
            else:
                cmd_str = json.dumps({"dir": direction, "speed": speed, "time": duration}, separators=(',', ':'))
        else:
            cmd_str = json.dumps({"dir": direction, "speed": speed, "time": duration}, separators=(',', ':'))
    elif action == 'take_picture':
        cmd_str = '{"cmd": "camera", "action": "capture"}'
    elif action == 'ping':
        cmd_str = 'PING'
    elif action == 'fake':
        cmd_str = 'FAKE'
    elif action == 'get_status':
        cmd_str = 'GET_STATUS'
    elif action == 'enable_fake':
        cmd_str = '{"enable_fake":""}'
    elif action == 'disable_fake':
        cmd_str = '{"disable_fake":""}'
    elif action == 'status':
        cmd_str = 'GET_STATUS'
    else:
        return jsonify({"error": "Unknown action"}), 400
        
    try:
        # All commands must use [CMD] prefix for the ESP32 parser
        final_payload = f'[CMD]{cmd_str}'
        serial_conn.write(f"{final_payload}\n".encode('utf-8'))
        socketio.emit('serial_tx', {
            'line': final_payload,
            'ts': int(time.time()),
            'dir': 'tx'
        })
        socketio.emit('log', f"→ {final_payload}", namespace='/ws/serial-monitor')
        return jsonify({"status": "sent", "command": final_payload})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify({
        "active_connections": active_connections,
        "packets_received": packets_received,
        "serial_connected": serial_connected,
        "mqtt_connected": mqtt_connected
    })

@app.route('/api/telemetry/latest', methods=['GET'])
def get_latest_telemetry():
    device_id = request.args.get('device_id')
    
    if not telemetry_buffer:
        return jsonify({"error": "No telemetry data available"}), 404
        
    if device_id:
        for entry in reversed(telemetry_buffer):
            if entry.get('src') == device_id:
                return jsonify(entry)
        return jsonify({"error": f"No data for device {device_id}"}), 404
    
    return jsonify(telemetry_buffer[-1])

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        device_id = request.args.get('device_id')
        minutes = int(request.args.get('minutes', 15))
        cutoff_time = int(time.time()) - (minutes * 60)
        
        query = "SELECT timestamp, temp, voltage, current, power, rssi FROM telemetry WHERE timestamp > %s"
        params = [cutoff_time]
        
        if device_id:
            query += " AND device_id = %s"
            params.append(device_id)
            
        query += " ORDER BY timestamp ASC"
        
        with db_session(dict_cursor=True) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            
            data = [dict(row) for row in rows]
                
        return jsonify({
            "device_id": device_id or "all",
            "count": len(data),
            "minutes": minutes,
            "data": data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Mission Gallery Endpoints ---

@app.route('/api/images', methods=['GET'])
def get_gallery_images():
    try:
        with db_session(dict_cursor=True) as cur:
            cur.execute("SELECT * FROM images ORDER BY timestamp DESC")
            images = [dict(row) for row in cur.fetchall()]
        return jsonify({"images": images})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/images/upload', methods=['POST'])
def upload_image():
    data = request.json
    img_base64 = data.get('image')
    device_id = data.get('device_id', 'Unknown')
    timestamp = data.get('timestamp', int(time.time()))
    lat = data.get('lat')
    lon = data.get('lon')
    alt = data.get('alt')
    
    if not img_base64:
        return jsonify({"error": "No image data"}), 400
        
    try:
        # Decode and save file
        filename = f"img_{int(time.time())}_{uuid.uuid4().hex[:8]}.jpg"
        gallery_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mission_images')
        filepath = os.path.join(gallery_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(img_base64))
            
        with db_session() as cur:
            cur.execute('''INSERT INTO images (filename, device_id, timestamp, lat, lon, alt)
                            VALUES (%s, %s, %s, %s, %s, %s)''', 
                         (filename, device_id, timestamp, lat, lon, alt))
            
        return jsonify({"success": True, "filename": filename})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/images/serve/<filename>')
def serve_mission_image(filename):
    gallery_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mission_images')
    from flask import send_from_directory
    return send_from_directory(gallery_dir, filename)

@app.route('/api/thresholds', methods=['GET', 'PUT'])
def handle_thresholds():
    device_id = request.args.get('device_id')
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400

    if request.method == 'GET':
        try:
            with db_session(dict_cursor=True) as cur:
                cur.execute("SELECT * FROM alert_thresholds WHERE device_id = %s", (device_id,))
                row = cur.fetchone()
                if row:
                    return jsonify(dict(row))
                else:
                    return jsonify({
                        "device_id": device_id,
                        "temp_max": 35.0, "temp_min": 0.0,
                        "voltage_max": 5.5, "voltage_min": 3.0,
                        "current_max": 1.0, "power_max": 2.0
                    })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'PUT':
        data = request.json
        threshold_values = (
            data.get('temp_max', 35.0),
            data.get('temp_min', 0.0),
            data.get('voltage_max', 5.5),
            data.get('voltage_min', 3.0),
            data.get('current_max', 1.0),
            data.get('power_max', 2.0)
        )
        try:
            with db_session() as cur:
                cur.execute('''INSERT INTO alert_thresholds 
                    (device_id, temp_max, temp_min, voltage_max, voltage_min, current_max, power_max)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (device_id) DO UPDATE SET
                    temp_max = EXCLUDED.temp_max,
                    temp_min = EXCLUDED.temp_min,
                    voltage_max = EXCLUDED.voltage_max,
                    voltage_min = EXCLUDED.voltage_min,
                    current_max = EXCLUDED.current_max,
                    power_max = EXCLUDED.power_max''',
                    (device_id,) + threshold_values)
            # Clear debounce for this device so new threshold takes effect immediately
            to_remove = [k for k in alert_debounce if k.startswith(f"{device_id}:")]
            for k in to_remove:
                del alert_debounce[k]
            return jsonify({"status": "updated", "device_id": device_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    device_id = request.args.get('device_id')
    active_only = request.args.get('active', 'false').lower() == 'true'
    
    query = "SELECT * FROM alerts"
    params = []
    conditions = []
    
    if device_id:
        conditions.append("device_id = %s")
        params.append(device_id)
    
    if active_only:
        conditions.append("acknowledged = FALSE")
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY timestamp DESC LIMIT 50"
    
    try:
        with db_session(dict_cursor=True) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return jsonify([dict(row) for row in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    try:
        with db_session() as cur:
            cur.execute("UPDATE alerts SET acknowledged = TRUE WHERE id = %s", (alert_id,))
        return jsonify({"status": "acknowledged", "id": alert_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/inject', methods=['POST'])
def debug_inject():
    """Inject fake telemetry data for testing"""
    entry = request.json
    if not entry or 'src' not in entry:
        return jsonify({"error": "Invalid telemetry format"}), 400
        
    if 'timestamp' not in entry:
        entry['timestamp'] = int(time.time())
        
    process_telemetry(entry)
    
    return jsonify({"status": "injected", "data": entry})

# --- Simulation Control Endpoints ---

@app.route('/api/sim/start', methods=['POST'])
def sim_start():
    global sim_active
    sim_active = True
    print("[SIM] Simulation STARTED via API")
    return jsonify({"status": "simulation_started"})

@app.route('/api/sim/stop', methods=['POST'])
def sim_stop():
    global sim_active
    sim_active = False
    print("[SIM] Simulation STOPPED via API")
    return jsonify({"status": "simulation_stopped"})

@app.route('/api/sim/status', methods=['GET'])
def sim_status():
    return jsonify({"sim_active": sim_active, "sim_t": sim_t})

@app.route('/api/devices', methods=['GET'])
def get_devices():
    try:
        with db_session(dict_cursor=True) as cur:
            cur.execute("SELECT * FROM devices")
            rows = cur.fetchall()
            return jsonify([dict(row) for row in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/devices/<device_id>', methods=['GET'])
def get_device_details(device_id):
    try:
        with db_session(dict_cursor=True) as cur:
            cur.execute("SELECT * FROM devices WHERE device_id = %s", (device_id,))
            row = cur.fetchone()
            if row:
                return jsonify(dict(row))
            else:
                return jsonify({"error": "Device not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
# --- Command & Control Endpoints ---
@app.route('/api/command', methods=['POST'])
def send_command():
    data = request.json
    device_id = data.get('device_id')
    command = data.get('command')
    params = data.get('params', {})
    
    if not device_id or not command:
        return jsonify({"error": "device_id and command are required"}), 400
        
    command_id = str(uuid.uuid4())
    payload = {
        "command_id": command_id,
        "command": command,
        "params": params,
        "timestamp": int(time.time())
    }
    raw_payload_str = json.dumps(payload)
    
    # 1. Save to command log
    try:
        with db_session() as cur:
            cur.execute('''INSERT INTO command_log 
                (command_id, device_id, command, status, sent_at)
                VALUES (%s, %s, %s, %s, %s)''',
                (command_id, device_id, command, 'queued', int(time.time())))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # 2. Command Translation Layer (Convert to ESP32 firmware protocol)
    sat_command_str = raw_payload_str  # Default
    if command == 'motor_time':
        direction = params.get('dir', 1)
        speed = params.get('speed', 255)
        duration = params.get('time', 2000)
        
        if direction == 0:
            sat_command_str = "STOP"
        elif duration == 0 and speed == 255:
            if direction == 1:
                sat_command_str = 'SPINCW'
            elif direction == -1:
                sat_command_str = 'SPINCCW'
            else:
                sat_command_str = f"dir{direction},speed{speed},time{duration}"
        else:
            sat_command_str = f"dir{direction},speed{speed},time{duration}"
    elif command == 'PING':
        sat_command_str = 'PING'
    elif command == 'FAKE':
        sat_command_str = 'FAKE'
    elif command == 'GET_STATUS':
        sat_command_str = 'GET_STATUS'
    elif command == 'TAKE_PICTURE' or command == 'CAPTURE_IMAGE':
        sat_command_str = json.dumps({"cmd": "camera", "action": "capture"})

    # 3. Dual-Path Execution Logic
    sent_via = None
    
    # CASE A: Command is for the Satellite/Board (Direct or via Ground Node)
    if device_id in ['CDHS_Board', 'SAT', 'Sat_1']:
        # Priority 1: Direct Serial OR Cloud Bridge
        final_serial_payload = f"CMD {sat_command_str}"
        
        if serial_connected and serial_conn:
            try:
                serial_conn.write(f"{final_serial_payload}\n".encode('utf-8'))
                sent_via = "serial"
                socketio.emit('serial_tx', {
                    'line': final_serial_payload,
                    'ts': int(time.time()),
                    'dir': 'tx'
                })
            except Exception as e:
                print(f"[!] Serial write failed: {e}")
        else:
            # Not physically connected (we are in the cloud!) -> Send to local bridge via WebSocket
            socketio.emit('bridge_tx', {'command': final_serial_payload})
            sent_via = "cloud_bridge"
            socketio.emit('serial_tx', {
                'line': final_serial_payload + " (via Bridge)",
                'ts': int(time.time()),
                'dir': 'tx'
            })

        # Priority 2: MQTT Fallback (Wireless LoRa Relay via Ground Node)
        if not sent_via and mqtt_client and mqtt_connected:
            try:
                topic = f"{MQTT_TOPIC_PREFIX}/command/{device_id}"
                mqtt_client.publish(topic, sat_command_str, qos=1)
                sent_via = "mqtt"
            except Exception as e:
                print(f"[!] MQTT publish failed: {e}")

    # CASE B: Generic MQTT (e.g. Simulator or other network devices)
    else:
        if mqtt_client and mqtt_connected:
            try:
                topic = f"{MQTT_TOPIC_PREFIX}/command/{device_id}"
                mqtt_client.publish(topic, sat_command_str, qos=1)
                sent_via = "mqtt"
            except Exception as e:
                pass

    if sent_via:
        update_command_status(command_id, 'sent', {"via": sent_via})
        return jsonify({"status": "sent", "command_id": command_id, "via": sent_via, "serial_payload": f"[CMD]{sat_command_str}"})
    else:
        update_command_status(command_id, 'failed', {"error": "No transport available"})
        return jsonify({
            "status": "failed", 
            "command_id": command_id, 
            "error": "Device offline (No Serial or MQTT link)"
        }), 503
@app.route('/api/commands', methods=['GET'])
def get_commands():
    device_id = request.args.get('device_id')
    query = "SELECT * FROM command_log"
    params = []
    
    if device_id:
        query += " WHERE device_id = %s"
        params.append(device_id)
        
    query += " ORDER BY sent_at DESC LIMIT 50"
    
    try:
        with db_session(dict_cursor=True) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return jsonify([dict(row) for row in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ── ADCS Serial Worker ─────────────────────────────────────────────────────────

def parse_adcs_packet(line):
    """
    Parse a line starting with 'ADCS:' into a telemetry dict.
    Expected format:
        ADCS:<roll>,<pitch>,<yaw>,<lat>,<lon>,<alt>,<wx>,<wy>,<wz>
    Returns dict or None on parse error.
    """
    try:
        payload = line[5:].strip()  # strip 'ADCS:' prefix
        parts = [float(x) for x in payload.split(',')]
        if len(parts) < 9:
            return None
        return {
            'roll':    parts[0],
            'pitch':   parts[1],
            'yaw':     parts[2],
            'lat':     parts[3] if parts[3] != 0.0 else None,
            'lon':     parts[4] if parts[4] != 0.0 else None,
            'alt':     parts[5] if parts[5] != 0.0 else None,
            'wheel_x': parts[6],
            'wheel_y': parts[7],
            'wheel_z': parts[8],
        }
    except (ValueError, IndexError):
        return None


def adcs_worker():
    """
    Background task: auto-detects the ADCS board on any available COM port
    (skips the CDHS port), reads 'ADCS:...' lines, and emits adcs_telemetry
    socket events to all connected clients.
    """
    global adcs_conn, adcs_connected, adcs_port_name
    from serial.tools import list_ports

    def find_adcs_port():
        global adcs_port_name
        available = [p.device for p in list_ports.comports()]
        if not available:
            return None

        # If ADCS_PORT is explicitly set (not AUTO), try it first
        preferred = [] if ADCS_PORT == 'AUTO' else [ADCS_PORT]
        # Exclude the port currently used by CDHS
        others = [p for p in available if p != SERIAL_PORT]
        candidates = preferred + [p for p in others if p not in preferred]

        if not candidates:
            return None

        print(f"[ADCS] Scanning ports for ADCS board: {candidates}")
        for port in candidates:
            try:
                conn = serial.Serial(port, SERIAL_BAUD, timeout=2)
                # Look for an ADCS: line within 30 reads
                for _ in range(30):
                    socketio.sleep(0.1)
                    if conn.in_waiting > 0:
                        raw = conn.readline().decode('utf-8', errors='ignore').strip()
                        if raw.startswith('ADCS:'):
                            print(f"[ADCS] Detected ADCS board on {port}")
                            adcs_port_name = port
                            return conn
                conn.close()
            except (serial.SerialException, OSError) as e:
                print(f"[ADCS] {port}: {e}")
        return None

    while True:
        try:
            if not adcs_connected:
                result = find_adcs_port()
                if result:
                    adcs_conn = result
                    adcs_connected = True
                    socketio.emit('adcs_status', {'connected': True, 'port': adcs_port_name})
                    print(f"[ADCS] Connected on {adcs_port_name}")
                else:
                    print("[ADCS] No ADCS board found — retrying in 10s")
                    socketio.sleep(10)
                    continue

            while adcs_connected:
                if adcs_conn and adcs_conn.in_waiting > 0:
                    try:
                        raw = adcs_conn.readline().decode('utf-8', errors='ignore').strip()
                    except Exception:
                        continue

                    if raw.startswith('ADCS:'):
                        parsed = parse_adcs_packet(raw)
                        if parsed:
                            socketio.emit('adcs_telemetry', parsed)
                else:
                    socketio.sleep(0.01)

        except (serial.SerialException, OSError) as e:
            print(f"[ADCS] Serial error: {e}")
            adcs_connected = False
            adcs_port_name = None
            socketio.emit('adcs_status', {'connected': False, 'port': None})
            if adcs_conn:
                try:
                    adcs_conn.close()
                except Exception:
                    pass
            socketio.sleep(5)


@socketio.on('adcs_command')
def handle_adcs_command(data):
    """
    Forward a reaction-wheel or orientation command to the ADCS board via serial.
    Expected payload: {type: 'WHEEL', axis: 'x'|'y'|'z', speed: <int RPM>}
                   or {type: 'RAW', cmd: '<string>'}
    """
    global adcs_conn, adcs_connected
    if not adcs_connected or not adcs_conn:
        print("[ADCS] Command received but ADCS not connected")
        return

    try:
        cmd_type = data.get('type', 'RAW')
        if cmd_type == 'WHEEL':
            axis  = data.get('axis', 'z').upper()
            speed = int(data.get('speed', 0))
            line  = f"WHEEL:{axis},{speed}\n"
        else:
            line = str(data.get('cmd', '')) + '\n'

        adcs_conn.write(line.encode('utf-8'))
        print(f"[ADCS] Sent command: {line.strip()}")
    except Exception as e:
        print(f"[ADCS] Command write error: {e}")


# ─── Bridge Handlers (Cloud ↔ Local Hardware Bridge) ────────────────────────

@socketio.on('forward_telemetry', namespace='/ws/telemetry')
def on_forward_telemetry(data):
    """Receive telemetry forwarded from a student's Web Serial frontend and process it."""
    if data:
        process_telemetry(data)

@socketio.on('bridge_telemetry')
def on_bridge_telemetry(data):
    """Receive raw serial lines from the local_bridge.py and process directly."""
    raw_line = data.get('raw_line', '').strip()
    if not raw_line:
        return
    
    # Process immediately (more reliable than queue for cloud workers)
    handle_raw_data(raw_line)
    # print(f"[BRIDGE RX] Processed: {raw_line[:80]}...")

@socketio.on('bridge_tx_ack')
def on_bridge_tx_ack(data):
    """Acknowledgement from bridge that a command was delivered to hardware."""
    print(f"[BRIDGE ACK] {data}")


init_db()
start_mqtt() # Start MQTT Client
socketio.start_background_task(serial_worker)
socketio.start_background_task(adcs_worker)
socketio.start_background_task(monitor_devices)
socketio.start_background_task(sim_worker)   # Built-in simulation (idle until /api/sim/start)

if __name__ == '__main__':
    print(f"[*] Starting WebSocket API on port {API_PORT}...")
    socketio.run(app, host='0.0.0.0', port=API_PORT, allow_unsafe_werkzeug=True)
