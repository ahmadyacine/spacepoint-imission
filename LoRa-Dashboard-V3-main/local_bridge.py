import serial
import time
import socketio
import json
import threading
import sys
import socket
import hashlib

# ----------------- Configuration -----------------
# 1. USB SERIAL Settings
SERIAL_PORT = "COM3"  # CHANGE THIS to your ESP32's COM port!
SERIAL_BAUD = 115200

# 2. WIFI (UDP) Settings
UDP_IP = "0.0.0.0"     # Listen on all network interfaces
UDP_PORT = 4210        # Matches the port used in ESP32 firmware

# 3. CLOUD RENDER URL
CLOUD_URL = "https://lora-dashboard-v3.onrender.com"

# -------------------------------------------------

sio = socketio.Client(reconnection=True, reconnection_delay=2, reconnection_delay_max=10)
serial_conn = None
serial_lock = threading.Lock()

# Deduplication state
last_packets = {}  # Store hashes of recent packets to prevent duplicates
DEDUP_WINDOW = 0.5 # Ignore identical packets within 0.5 seconds

def connect_serial():
    global serial_conn
    try:
        serial_conn = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)
        print(f"[SERIAL] Connected to ESP32 on {SERIAL_PORT}")
        return True
    except Exception as e:
        print(f"[!] Serial Error: {e}")
        return False

def forward_to_cloud(raw_line, source_label):
    """
    Central function to handle data from any source and push to Cloud.
    Includes simple de-duplication to prevent double-reporting from WiFi + Serial.
    """
    if not raw_line or not sio.connected:
        return

    # De-duplication Logic:
    # We hash the raw line to see if we've seen this exact data recently.
    # This works regardless of formatting as long as the content is identical.
    packet_hash = hashlib.md5(raw_line.encode()).hexdigest()
    now = time.time()
    
    if packet_hash in last_packets:
        if now - last_packets[packet_hash] < DEDUP_WINDOW:
            # print(f"[{source_label}] Ignored duplicate packet.") # Debug
            return

    # Mark as seen
    last_packets[packet_hash] = now
    
    # Clean up old hashes from the tracking dict (keep memory low)
    if len(last_packets) > 50:
        cutoff = now - 5.0
        to_remove = [h for h, t in last_packets.items() if t < cutoff]
        for h in to_remove: del last_packets[h]

    # Forward to Render
    try:
        sio.emit('bridge_telemetry', {'raw_line': raw_line})
        print(f"[{source_label} -> CLOUD] {raw_line[:80]}...")
    except Exception as e:
        print(f"[!] Cloud Forwarding Error: {e}")

def hardware_read_loop():
    """ Thread: Reads from local USB port """
    print(f"[SERIAL] Monitoring {SERIAL_PORT}...")
    while True:
        if serial_conn and serial_conn.is_open:
            try:
                line = serial_conn.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    forward_to_cloud(line, "SERIAL")
            except Exception as e:
                print(f"[!] Serial Read Error: {e}")
                time.sleep(2)
        else:
            time.sleep(1)

def wifi_read_loop():
    """ Thread: Reads from Local WiFi (UDP) """
    print(f"[WIFI] Listening for UDP packets on port {UDP_PORT}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.bind((UDP_IP, UDP_PORT))
    except Exception as e:
        print(f"[!] WiFi Socket Error: {e}")
        return

    while True:
        try:
            data, addr = sock.recvfrom(2048) # buffer size is 2048 bytes
            line = data.decode('utf-8', errors='ignore').strip()
            if line:
                forward_to_cloud(line, f"WIFI:{addr[0]}")
        except Exception as e:
            print(f"[!] WiFi Read Error: {e}")
            time.sleep(1)

@sio.event
def connect():
    print(f"[CLOUD] Successfully Connected to Render Dashboard -> {CLOUD_URL}")

@sio.event
def disconnect():
    print("[CLOUD] Disconnected from Render. Reconnecting...")

@sio.on('bridge_tx')
def on_bridge_tx(data):
    """ Cloud telling us to push a command down to the ESP32 """
    cmd = data.get('command')
    if not cmd: return
    
    # Priority 1: Send via WiFi if we know a device IP? 
    # (Actually WiFi command reception usually requires a known IP/Socket. 
    # For now, we remain hardwired for commands as it's more reliable.)
    if serial_conn and serial_conn.is_open:
        with serial_lock:
            try:
                serial_conn.write(f"{cmd}\n".encode('utf-8'))
                print(f"[CLOUD -> SERIAL TX] {cmd}")
            except Exception as e:
                print(f"Error writing to serial: {e}")

if __name__ == '__main__':
    print("=" * 60)
    print(" 🛰️  ANTI-GRAVITY DUAL-LINK HARDWARE BRIDGE")
    print("=" * 60)
    print(f" PRIMARY: WiFi (UDP Port {UDP_PORT})")
    print(f" BACKUP:  Serial ({SERIAL_PORT})")
    print("=" * 60)

    # 1. Start Serial
    if not connect_serial():
        print("[!] Warning: Serial port not found. Only WiFi will be available.")

    # 2. Start Cloud Socket connection
    try:
        sio.connect(CLOUD_URL, transports=['websocket', 'polling'])
    except Exception as e:
        print(f"[!] Initial Cloud Connection Failed: {e}")

    # 3. Start reading loops
    threading.Thread(target=hardware_read_loop, daemon=True).start()
    threading.Thread(target=wifi_read_loop, daemon=True).start()

    try:
        sio.wait()
    except KeyboardInterrupt:
        print("\nExiting Dual-Link Bridge...")
        if serial_conn:
            serial_conn.close()
        sio.disconnect()
        sys.exit(0)
