import './style.css';
import './satellite-animations.css';
import { initDashboard, updateMetric, resetCharts } from './modules/charts.js';
import { initSocket } from './modules/socket.js';
import { initUI, updateConnectionStatus, showAlert } from './modules/ui.js';
import { initScene } from './modules/scene.js';
import { initHistory } from './modules/history.js';
import { exportHistoryPDF } from './modules/exportPdf.js';
import { initADCS, updateOrientation, updateGPS, updateWheelSpeeds, setADCSConnected } from './modules/adcs.js';
import { initEarthViz } from './modules/earth.js';
import { initMap, updateMap, resizeMap } from './modules/map.js';
import { connectWebSerial, disconnectWebSerial, writeCommand } from './modules/web_serial.js';

let isWebSerialActive = false;

// Expose PDF export globally so HTML button works
window.exportHistoryPDF = exportHistoryPDF;

// --- Initialization ---
console.log(' Cube-Sat Ground Station Initializing...');

// 1. Setup UI & Scene
initScene();
initUI();
initHistory();
initEarthViz();
initMap();

// 1.5 Setup Data Source Toggle
window.currentDataSource = 'CDHS'; // Default to CDHS as requested
window.isSimActive = false; // Simulation starts OFF
window.isGraphPaused = false; // Charts update live by default

// Sync pause button UI across header + modal
function syncPauseUI() {
  const paused = window.isGraphPaused;
  const label = paused ? ' Resume' : ' Pause';
  const headerBtn = document.getElementById('graph-pause-btn');
  const modalBtn = document.getElementById('modal-pause-btn');
  [headerBtn, modalBtn].forEach(btn => {
    if (!btn) return;
    btn.textContent = label;
    btn.style.background = paused ? 'rgba(255,200,0,0.18)' : 'rgba(0,210,255,0.12)';
    btn.style.borderColor = paused ? 'rgba(255,200,0,0.5)' : 'rgba(0,210,255,0.35)';
    btn.style.color = paused ? 'rgba(255,215,0,0.95)' : 'rgba(0,210,255,0.9)';
  });
}

window.toggleGraphPause = () => {
  window.isGraphPaused = !window.isGraphPaused;
  syncPauseUI();
  console.log(`[Charts] ${window.isGraphPaused ? 'Paused' : 'Resumed'}`);
};

// Helper to sync toggle button visual state
function syncSimToggleUI() {
  const btn = document.getElementById('sim-toggle-btn');
  if (!btn) return;
  if (window.isSimActive) {
    btn.innerText = ' SIM: ON';
    btn.style.background = 'rgba(0, 210, 100, 0.25)';
    btn.style.borderColor = '#00e676';
    btn.style.color = '#00e676';
  } else {
    btn.innerText = ' SIM: OFF';
    btn.style.background = 'rgba(255, 65, 108, 0.2)';
    btn.style.borderColor = '#ff416c';
    btn.style.color = '#ff416c';
  }
}

function updateDashboardLayout(source) {
  const gridContainer = document.querySelector('.grid-container');
  const adcsPanel = document.getElementById('adcs-panel');
  const cards = document.querySelectorAll('.card');
  const simToggle = document.getElementById('sim-toggle-btn');

  // Show/Hide Sim Toggle — only visible in SIM mode
  if (source === 'SIM' && simToggle) {
    simToggle.classList.remove('hidden');
    syncSimToggleUI();
  } else if (simToggle) {
    simToggle.classList.add('hidden');
  }

  // ADCS mode: hide main grid, show ADCS panel
  if (source === 'ADCS') {
    if (gridContainer) gridContainer.style.display = 'none';
    if (adcsPanel) adcsPanel.classList.add('active');
    return;
  }

  // CDHS / SIM mode: show main grid, hide ADCS panel
  if (gridContainer) gridContainer.style.display = '';
  if (adcsPanel) adcsPanel.classList.remove('active');

  // Define visible metrics for each source
  const cdhsMetrics = ['temp', 'batt', 'item_current', 'power', 'rssi', 'snr'];
  const simMetrics = ['temp', 'batt', 'item_current', 'power', 'rssi', 'snr'];

  cards.forEach(card => {
    const cardId = card.id.replace('card-', '');
    if (source === 'CDHS') {
      card.style.display = cdhsMetrics.includes(cardId) ? 'flex' : 'none';
    } else {
      card.style.display = simMetrics.includes(cardId) ? 'flex' : 'none';
    }
  });

  // Ensure tactical map resizes if grid visibility changed
  resizeMap();
}

// Toggle simulation ON/OFF — calls backend API to start/stop built-in sim worker
window.toggleSimulation = async () => {
  const endpoint = window.isSimActive ? '/stop' : '/start';
  try {
    const res = await fetch(`${API_BASE}/api/sim${endpoint}`, { method: 'POST' });
    const result = await res.json();
    console.log('[SIM] Toggle response:', result);
    window.isSimActive = !window.isSimActive;
    syncSimToggleUI();
    console.log(`[SIM] ${window.isSimActive ? 'Started' : 'Stopped'} (backend confirmed)`);
  } catch (e) {
    console.error('[SIM] Failed to toggle simulation:', e);
  }
};

// Sync sim toggle state from server when switching to SIM mode
async function syncSimStateFromServer() {
  try {
    const res = await fetch(`${API_BASE}/api/sim/status`);
    const data = await res.json();
    window.isSimActive = data.sim_active;
    syncSimToggleUI();
    console.log(`[SIM] Synced state from server: active=${data.sim_active}`);
  } catch (e) {
    console.error('[SIM] Could not fetch sim status:', e);
  }
}

window.setDataSource = (source) => {
  window.currentDataSource = source;
  console.log(`[Source] Switched to ${source}`);

  // Reset Charts to prevent data leakage from previous source
  resetCharts();

  // Update Button States
  document.querySelectorAll('.source-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.source === source);
  });

  // Update Layout Visibility (toggle button visibility handled here)
  updateDashboardLayout(source);

  // Show/hide Simulation Control card
  if (window.updateSimControlVisibility) window.updateSimControlVisibility(source);

  // Sync actual sim state from server when switching to SIM mode
  if (source === 'SIM') {
    syncSimStateFromServer();
  }

  // Reload Thresholds for the new source
  if (window.loadThresholds) {
    window.loadThresholds();
  }
    
  // Immediate UI update for notices/buttons
  pollSerialStatus();
};

// 2. Setup Dashboard Charts
const container = document.querySelector('.grid-container');
initDashboard(container);
// CRITICAL FIX: Ensure correct layout is applied on load
updateDashboardLayout(window.currentDataSource);
// Hide sim-control-card by default (starts in CDHS mode)
setTimeout(() => {
  if (window.updateSimControlVisibility) window.updateSimControlVisibility(window.currentDataSource);
}, 0);

// CDHS Serial Port Status — poll on load and every 5 s
async function pollSerialStatus() {
  const dot = document.getElementById('cdhs-port-dot');
  const text = document.getElementById('cdhs-port-text');
  if (!dot || !text) return;
  try {
    const res = await fetch(`${API_BASE}/api/serial/status`);
    const data = await res.json();
    const ok = data.connected;
    dot.className = `cdhs-port-dot ${ok ? 'connected' : 'disconnected'}`;
    text.textContent = `CDHS: ${data.port} ${ok ? '✓' : '✗'}`;
    
    // Auto-sync visibility of connection buttons
    const btnDetect = document.getElementById('btn-detect');
    const btnDisconnect = document.getElementById('btn-disconnect');
    const portLabel = document.getElementById('active-port-label');

    if (ok) {
        if (btnDetect) btnDetect.classList.add('hidden');
        if (btnDisconnect) btnDisconnect.classList.remove('hidden');
        if (portLabel) portLabel.textContent = data.port;
    } else {
        if (btnDetect) btnDetect.classList.remove('hidden');
        if (btnDisconnect) btnDisconnect.classList.add('hidden');
        if (portLabel) portLabel.textContent = 'No Port';
    }

    // Toggle "(Wired USB)" notice visibility
    // Only show if port is connected AND we are in CDHS (Wired) mode
    const isWired = ok && (window.currentDataSource === 'CDHS');
    document.querySelectorAll('.wired-notice').forEach(el => {
        if (isWired) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
  } catch {
    const dot = document.getElementById('cdhs-port-dot');
    const text = document.getElementById('cdhs-port-text');
    if (dot) dot.className = 'cdhs-port-dot disconnected';
    if (text) text.textContent = 'CDHS: offline';
  }
}
pollSerialStatus();
setInterval(pollSerialStatus, 5000);


// 3. Setup Socket Connection
const socket = initSocket({
  onConnect: () => updateConnectionStatus('System Live', '#9b72c0'),
  onDisconnect: () => updateConnectionStatus('Offline', '#ff416c'),
  onTelemetry: (data) => {
    if (isWebSerialActive) return; // Prevent duplicate rendering from backend if using local USB

    // --- Source Filtering ---
    const activeSource = window.currentDataSource || 'CDHS';
    const rawSrc = data.src || 'Unknown';
    const src = rawSrc.toLowerCase();

    // Strict Separation Logic
    let isAllowed = false;

    if (activeSource === 'CDHS') {
      // Allow only CDHS_Board or similar real hardware sources
      if (src.includes('cdhs') || src.includes('board')) {
        isAllowed = true;
      }
    } else if (activeSource === 'SIM') {
      // Check Toggle State
      if (!window.isSimActive) return;

      // Allow only Sat_1 or debug sources
      if (src.includes('sat') || src.includes('debug')) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      // Only log if it's NOT the simulation spamming while we are in CDHS mode
      // (Optional: quiet log)
      // console.log(`[Filter] Dropped ${rawSrc} in ${activeSource} mode`);
      return;
    }

    // DEBUG: Confirm data is passing filter
    // console.log(`[Processing] ${rawSrc} -> ${activeSource} Mode`, data.data);

    const payload = data.data || {};
    const timestamp = data.timestamp || Date.now() / 1000;

    // Map backend fields to frontend metric IDs
    // Supports both new firmware names (temp_C, bus_voltage_V, etc.) and legacy names
    const map = {
      // New firmware field names
      'temp_C': 'temp',
      'bus_voltage_V': 'batt',
      'current_mA': 'item_current',
      'power_mW': 'power',
      // Legacy / SIM field names (kept for backward compat)
      'temp': 'temp',
      'hum': 'hum',
      'voltage': 'batt',
      'current': 'item_current',
      'power': 'power',
      // Common fields
      'rssi': 'rssi',
      'snr': 'snr',
      'uptime': 'pay',
      'baud_rate': 'dr',
      'freq': 'freq'
    };

    for (const [key, value] of Object.entries(payload)) {
      const metricId = map[key];
      if (metricId) {
        if (activeSource === 'CDHS_Board' && (metricId === 'rssi' || metricId === 'snr')) {
            // Keep RSSI/SNR blank explicitly for wired hardware
            continue;
        }
        // console.log(`Updating ${metricId} with ${value}`); // Reduced log noise
        updateMetric(metricId, value, timestamp);
      }
    }

    // Check for GPS in standard telemetry stream too
    if (payload.lat != null && payload.lon != null) {
        updateMap(payload.lat, payload.lon);
    }
  },
  onAlert: (data) => {
    console.log('Alert:', data);
    showAlert(data);
  },
  onCommandUpdate: (update) => {
    // Log update logic
    const logConsole = document.getElementById('command-log');
    if (!logConsole) return;

    const div = document.createElement('div');
    div.className = `log-entry ${update.status}`;
    const time = new Date(update.timestamp * 1000).toLocaleTimeString();

    let msg = `<span class="timestamp">[${time}]</span> Command <b>${update.command_id.substring(0, 8)}</b>: ${update.status.toUpperCase()}`;

    if (update.response_data) {
      msg += ` - ${JSON.stringify(update.response_data)}`;
    }

    div.innerHTML = msg;
    logConsole.prepend(div);
  },
  onSerialRx: (data) => {
    const term = document.getElementById('serial-terminal');
    if (!term) return;
    const div = document.createElement('div');
    div.style.color = '#ccc';
    div.textContent = `[RAW SERIAL] ${data.line}`;
    term.appendChild(div);
    while (term.children.length > 200) term.firstChild.remove();
    term.scrollTop = term.scrollHeight;
  },
  onSerialTx: (data) => {
    const term = document.getElementById('serial-terminal');
    if (!term) return;
    const div = document.createElement('div');
    div.style.color = '#00d2ff';
    div.textContent = `[CMD TX] ${data.line}`;
    term.appendChild(div);
    while (term.children.length > 200) term.firstChild.remove();
    term.scrollTop = term.scrollHeight;
  }
});

// Expose socket for global commands if needed (though we should refactor that too)
window.socket = socket;

// 4. Init ADCS module now that socket is available
initADCS(socket);

// Handle ADCS telemetry from backend
socket.on('adcs_telemetry', (data) => {
  if (isWebSerialActive) return; // Prevent duplicate rendering from backend if using local USB
  if (data.roll != null) updateOrientation(data.roll, data.pitch, data.yaw);
  if (data.lat != null) {
      updateGPS(data.lat, data.lon, data.alt);
      updateMap(data.lat, data.lon);
  }
  if (data.wheel_x != null) updateWheelSpeeds(data.wheel_x, data.wheel_y, data.wheel_z);
});

// Handle ADCS connection status events
socket.on('adcs_status', (data) => {
  setADCSConnected(data.connected, data.port);
});


// 4. Admin Panel Command Logic (Keep existing logic or refactor?)
// For now, let's keep the global window functions for the onclick handlers in HTML
// But ideally, we should move this to a module too.

// Satellite rotation state
let satelliteRotationY = 0; // Yaw
let satelliteRotationX = 0; // Pitch

window.sendCommand = async (command, params = {}) => {
  const deviceId = 'Sat_1'; // Default target
  const satelliteBody = document.querySelector('.sat-body');
  const satellite = document.querySelector('.satellite-3d');

  if (satelliteBody) {
    switch (command) {
      case 'ROTATE_Z':
      case 'MOTOR_ROTATE': {
        // Z-axis motor rotation animation (reaction wheel)
        const deg = params.deg || params.degrees || 90;
        satelliteRotationY += deg;
        satelliteBody.style.transform = `translate(-50%, -50%) rotateX(${satelliteRotationX}deg) rotateY(${satelliteRotationY}deg)`;
        satelliteBody.style.transition = 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
        break;
      }
      case 'TAKE_PICTURE':
      case 'CAPTURE_IMAGE':
        if (satellite) {
          satellite.classList.add('taking-photo');
          setTimeout(() => satellite.classList.remove('taking-photo'), 500);
        }
        break;
      case 'PING':
        if (satellite) {
          satellite.classList.add('pinging');
          setTimeout(() => satellite.classList.remove('pinging'), 1000);
        }
        break;
      case 'RESET':
        satelliteRotationY = 0;
        satelliteRotationX = 0;
        satelliteBody.style.transform = 'translate(-50%, -50%) rotateX(0deg) rotateY(0deg)';
        satelliteBody.classList.add('resetting');
        setTimeout(() => satelliteBody.classList.remove('resetting'), 1000);
        break;
    }
  }

  try {
    // --- NATIVE WEB SERIAL COMMAND PATH ---
    if (isWebSerialActive) {
        let sat_command_str = command;
        if (command === 'motor_time') {
            const direction = params.dir != null ? params.dir : 1;
            const speed = params.speed != null ? params.speed : 255;
            const duration = params.time != null ? params.time : 2000;
            
            if (direction === 0) {
                sat_command_str = "STOP";
            } else if (duration === 0 && speed === 255) {
                if (direction === 1) sat_command_str = 'SPINCW';
                else if (direction === -1) sat_command_str = 'SPINCCW';
                else sat_command_str = `dir${direction},speed${speed},time${duration}`;
            } else {
                sat_command_str = `dir${direction},speed${speed},time${duration}`;
            }
        }
        
        await writeCommand(sat_command_str);
        if (window.showNotification) {
            window.showNotification('Command Sent via USB', `CMD ${sat_command_str}`, 'success');
        }
        return;
    }

    // --- FALLBACK CLOUD COMMAND PATH (SIM or Legacy bridge) ---
    const res = await fetch(`${API_BASE}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, command, params })
    });

    const result = await res.json();
    if (result.status === 'sent' || result.status === 'queued_offline') {
      console.log(`Command ${command} sent:`, result);
      // Show confirmation with the exact serial payload sent to ESP32
      const payload = result.serial_payload || command;
      if (command === 'motor_time') {
        const spd = params.speed != null ? params.speed : 255;
        const dir = params.dir;
        const time = params.time;
        window.showNotification(' Motor Command Sent',
          `Serial TX: ${payload}\nSpeed: ${spd}/255 | Dir: ${dir} | Time: ${time}ms`, 'success');
      } else {
        window.showNotification(' Command Sent', `${command} → ${payload}`, 'success');
      }
    } else {
      console.error('Command failed:', result);
      window.showNotification('Command Failed', result.error || 'Unknown error', 'error');
    }
  } catch (e) {
    console.error('Command Error:', e);
    window.showNotification('Network Error', 'Could not send command', 'error');
  }
};

window.sendCustomCommand = () => {
  const input = document.getElementById('custom-cmd-input').value;
  if (!input) return;
  const [cmd, ...args] = input.split(' ');
  const params = { args: args.join(' ') };
  window.sendCommand(cmd.toUpperCase(), params);
};

window.injectData = async () => {
  const temp = parseFloat(document.getElementById('sim-temp').value);
  const voltage = parseFloat(document.getElementById('sim-batt').value);
  const current = parseFloat(document.getElementById('sim-current').value);
  const power = parseFloat(document.getElementById('sim-power').value);
  const rssi = parseFloat(document.getElementById('sim-rssi').value);
  const snr = parseFloat(document.getElementById('sim-snr').value);

  const payload = {
    src: 'Sat_1',
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      temp,
      voltage,
      rssi,
      snr,
      current,
      power,
      uptime: 9999
    }
  };

  try {
    await fetch(`${API_BASE}/api/debug/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Injected Data:', payload);
  } catch (e) {
    console.error('Injection Error:', e);
  }
};

// ==========================================
// GROUND STATION PORT detection & ADMIN LOGIC
// ==========================================
let pendingDevicePort = null;
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

window.detectPorts = async () => {
    try {
        await connectWebSerial({
            onConnect: () => {
                isWebSerialActive = true;
                document.getElementById('btn-detect').classList.add('hidden');
                document.getElementById('btn-disconnect').classList.remove('hidden');
                document.getElementById('active-port-label').textContent = 'Web Serial USB';
                if(window.showNotification) window.showNotification('Connected', `Direct USB connection opened`, 'success');
            },
            onDisconnect: () => {
                isWebSerialActive = false;
                document.getElementById('btn-disconnect').classList.add('hidden');
                document.getElementById('btn-detect').classList.remove('hidden');
                document.getElementById('active-port-label').textContent = 'No Port';
                setADCSConnected(false, null);
                if(window.showNotification) window.showNotification('Disconnected', `USB connection closed`, 'info');
            },
            onTelemetry: (entry) => {
                // Update live dashboard
                if (entry.type === 'telemetry' && entry.data) {
                    for (const metricId of ['temp', 'voltage', 'current', 'power']) {
                        if (entry.data[metricId] != null) {
                            // Always pass a NUMBER to updateMetric so charts store numeric data
                            const numVal = parseFloat(entry.data[metricId]);
                            const mappedId = metricId === 'voltage' ? 'batt' : (metricId === 'current' ? 'item_current' : metricId);
                            updateMetric(mappedId, numVal, entry.timestamp);
                        }
                    }
                }
                
                // Hybrid History Approach: Silently forward data to Postgres via VPS backend
                if (window.socket) window.socket.emit('forward_telemetry', entry);
            },
            onAdcsTelemetry: (data) => {
                setADCSConnected(true, 'Shared with CDHS (Web Serial)');
                if (data.roll != null) updateOrientation(data.roll, data.pitch, data.yaw);
                if (data.lat != null) {
                    updateGPS(data.lat, data.lon, data.alt);
                    updateMap(data.lat, data.lon);
                }
                if (data.wheel_x != null) updateWheelSpeeds(data.wheel_x, data.wheel_y, data.wheel_z);
            },
            onSerialRx: (data) => {
                const term = document.getElementById('serial-terminal');
                if (!term) return;
                const div = document.createElement('div');
                div.style.color = '#ccc';
                div.textContent = `[RAW USB] ${data.line}`;
                term.appendChild(div);
                while (term.children.length > 200) term.firstChild.remove();
                term.scrollTop = term.scrollHeight;
            },
            onSerialTx: (data) => {
                const term = document.getElementById('serial-terminal');
                if (!term) return;
                const div = document.createElement('div');
                div.style.color = '#00d2ff';
                div.textContent = `[CMD USB TX] ${data.line}`;
                term.appendChild(div);
                while (term.children.length > 200) term.firstChild.remove();
                term.scrollTop = term.scrollHeight;
            }
        });
    } catch (e) {
        if(window.showNotification) window.showNotification('Web Serial Error', e.message, 'error');
    }
};

window.closePortsModal = () => document.getElementById('ports-modal').classList.add('hidden');

window.confirmPortConnect = async () => {
    document.getElementById('confirm-modal').classList.add('hidden');
    if(!pendingDevicePort) return;
    try {
        const res = await fetch(`${API_BASE}/api/connect`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({port: pendingDevicePort})
        });
        const data = await res.json();
        if(res.ok) {
            document.getElementById('btn-detect').classList.add('hidden');
            document.getElementById('btn-disconnect').classList.remove('hidden');
            document.getElementById('active-port-label').textContent = pendingDevicePort;
            if(window.showNotification) window.showNotification('Connected', `Port ${pendingDevicePort} opened`, 'success');
        } else {
            if(window.showNotification) window.showNotification('Connect Failed', data.error, 'error');
        }
    } catch(e) {
        if(window.showNotification) window.showNotification('Connect Error', e.message, 'error');
    }
};

window.disconnectPort = async () => {
    await disconnectWebSerial();
};

window.unlockAdmin = async () => {
    const pass = document.getElementById('admin-passphrase').value;
    try {
        const res = await fetch(`${API_BASE}/api/admin/auth`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({passphrase: pass})
        });
        if(res.ok) {
            document.getElementById('admin-lock-screen').style.display = 'none';
            document.getElementById('admin-unlocked-content').classList.remove('hidden');
        } else {
            document.getElementById('admin-pass-error').textContent = 'Incorrect passphrase';
        }
    } catch (e) {
        document.getElementById('admin-pass-error').textContent = 'Auth failed';
    }
};

window.sendGroundCmd = async (action, data = {}) => {
    try {
        const payload = { action, ...data };
        const res = await fetch(`${API_BASE}/api/ground/command`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if(!res.ok && window.showNotification) window.showNotification('Command Error', result.error, 'error');
    } catch(e) {}
};

window.sendRawAdminCmd = async () => {
    const input = document.getElementById('raw-cmd-input');
    const text = input.value.trim();
    if(!text) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/raw`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text})
        });
        if(res.ok) input.value = '';
    } catch(e) {}
};

window.forceConnectPort = async () => {
    const port = document.getElementById('force-port-input').value;
    if(!port) return;
    pendingDevicePort = port;
    window.confirmPortConnect();
};

// ==========================================
// COMMAND CENTER LOGIC
// ==========================================

// Helper: Read current speed from the Motor Speed slider (0-255)
function getMotorSpeed() {
  const slider = document.getElementById('motor-speed');
  return slider ? parseInt(slider.value) : 255;
}

window.updateCmdDuration = () => {
  const val = parseFloat(document.getElementById('cmd-motor-duration-val').value) || 0;
  const unit = parseInt(document.getElementById('cmd-motor-duration-unit').value) || 1000;
  const ms = Math.round(val * unit);
  const hiddenInput = document.getElementById('cmd-motor-duration');
  if (hiddenInput) hiddenInput.value = ms;
  
  const warn = document.getElementById('motor-cmd-warning');
  if (warn) {
    warn.style.display = ms > 180000 ? 'block' : 'none';
  }
};

window.updateAdminDuration = () => {
  const val = parseFloat(document.getElementById('motor-duration-admin-val').value) || 0;
  const unit = parseInt(document.getElementById('motor-duration-admin-unit').value) || 1000;
  const ms = Math.round(val * unit);
  const hiddenInput = document.getElementById('motor-duration-admin');
  if (hiddenInput) hiddenInput.value = ms;
  
  const warn = document.getElementById('motor-admin-warning');
  if (warn) {
    warn.style.display = ms > 180000 ? 'block' : 'none';
  }
};

window.setMotorDuration = (ms) => {
  const valInput = document.getElementById('cmd-motor-duration-val');
  const unitSelect = document.getElementById('cmd-motor-duration-unit');
  if (valInput && unitSelect) {
    if (ms >= 3600000 && ms % 3600000 === 0) {
      valInput.value = ms / 3600000;
      unitSelect.value = '3600000';
    } else if (ms >= 60000 && ms % 60000 === 0) {
      valInput.value = ms / 60000;
      unitSelect.value = '60000';
    } else {
      valInput.value = ms / 1000;
      unitSelect.value = '1000';
    }
    window.updateCmdDuration();
  }
};

window.sendMotorCommandUI = (dirStr) => {
  const speed = getMotorSpeed();
  const input = document.getElementById('cmd-motor-duration');
  const time = input ? parseInt(input.value) : 2000;
  
  let dir = 0;
  if (dirStr === 'cw') dir = 1;
  else if (dirStr === 'ccw') dir = -1;
  else if (dirStr === 'stop') dir = 0;

  console.log(`[Command] Motor UI: dir=${dir}, speed=${speed}, time=${time}ms`);
  window.sendCommand('motor_time', { dir, speed, time });
};

window.sendMotorTimeAdmin = (dirStr) => {
  const speed = getMotorSpeed();
  const input = document.getElementById('motor-duration-admin');
  const time = input ? parseInt(input.value) : 2000;
  
  let dir = 0;
  if (dirStr === 'cw') dir = 1;
  else if (dirStr === 'ccw') dir = -1;
  else if (dirStr === 'stop') dir = 0;

  console.log(`[Command] Motor Admin: dir=${dir}, speed=${speed}, time=${time}ms`);
  window.sendCommand('motor_time', { dir, speed, time });
};