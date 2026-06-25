/**
 * ADCS Module — Attitude Determination & Control System
 * Handles MPU6050 orientation, GPS display, reaction-wheel commands,
 * and the sun-pointing simulation game.
 */

import '../adcs.css';
import { updateEarthSatPos } from './earth.js';
import { initAttitudeViz, updateSatOrientation } from './attitude.js';

// ── State ─────────────────────────────────────────────────────────────────────
let _socket = null;

const state = {
    roll: 0, pitch: 0, yaw: 0,
    lat: null, lon: null, alt: null,
    wheelSpeeds: { x: 0, y: 0, z: 0 },
    sunPointing: false,
    lockTimer: null,
    lockHoldSec: 0,
    alignmentPct: 0,
    connected: false,
};

// Sun direction unit vector (fixed — sun is "above" the satellite, at pitch=0 roll=0)
const SUN_DIR = { x: 0, y: 1, z: 0 };

// ── Init ──────────────────────────────────────────────────────────────────────
export function initADCS(socket) {
    _socket = socket;
    renderPanel();
    bindWheelButtons();
    bindSunPointingBtn();
    updateStatusBar(false);
}

// ── Orientation update (called from socket event) ─────────────────────────────
export function updateOrientation(roll, pitch, yaw) {
    state.roll = roll;
    state.pitch = pitch;
    state.yaw = yaw;

    // Update attitude cube
    const cube = document.getElementById('attitude-cube');
    if (cube) {
        cube.style.transform = `rotateX(${-pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`;
    }

    // Update New Visualization Box
    const vizCube = document.getElementById('satellite-viz-3d');
    if (vizCube) {
        vizCube.style.transform = `rotateX(${-pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`;
    }
    setValText('viz-roll', roll.toFixed(1) + '°');
    setValText('viz-pitch', pitch.toFixed(1) + '°');
    setValText('viz-yaw', yaw.toFixed(1) + '°');
    
    // Update 3D Model
    updateSatOrientation(roll, pitch, yaw);

    // Update Modal Overlay
    const modalRoll = document.getElementById('sat-roll-val');
    const modalPitch = document.getElementById('sat-pitch-val');
    const modalYaw = document.getElementById('sat-yaw-val');
    if (modalRoll) modalRoll.innerText = roll.toFixed(1) + '°';
    if (modalPitch) modalPitch.innerText = pitch.toFixed(1) + '°';
    if (modalYaw) modalYaw.innerText = yaw.toFixed(1) + '°';

    // Update HUD bars (normalize -180..180 → 0..100%)
    setBar('roll', roll, -180, 180);
    setBar('pitch', pitch, -90, 90);
    setBar('yaw', yaw, -180, 180);

    // Update orientation values text
    setValText('roll-val', roll.toFixed(1) + '°');
    setValText('pitch-val', pitch.toFixed(1) + '°');
    setValText('yaw-val', yaw.toFixed(1) + '°');

    // Update arena satellite position
    updateArena(roll, pitch, yaw);

    // Sun-pointing alignment check
    if (state.sunPointing) checkSunAlignment(roll, pitch, yaw);
}

// ── GPS update ────────────────────────────────────────────────────────────────
export function updateGPS(lat, lon, alt) {
    state.lat = lat;
    state.lon = lon;
    state.alt = alt;

    const fmt = (v, d) => v != null ? v.toFixed(d) : '---';
    setValText('gps-lat', fmt(lat, 4) + '°');
    setValText('gps-lon', fmt(lon, 4) + '°');
    setValText('gps-alt', fmt(alt, 1) + ' m');

    // Update New Visualization Box
    setValText('viz-lat', fmt(lat, 4) + '°');
    setValText('viz-lon', fmt(lon, 4) + '°');
    setValText('viz-alt', fmt(alt, 1) + ' m');

    updateEarthSatPos(lat, lon);
    
    const noFix = document.getElementById('gps-no-fix');
    if (noFix) noFix.style.display = (lat != null) ? 'none' : '';
}

// ── Wheel speed update (feedback from hardware) ───────────────────────────────
export function updateWheelSpeeds(wx, wy, wz) {
    state.wheelSpeeds = { x: wx, y: wy, z: wz };
    setWheelUI('x', wx);
    setWheelUI('y', wy);
    setWheelUI('z', wz);
}

// ── ADCS connected/disconnected ───────────────────────────────────────────────
export function setADCSConnected(isConnected, portName) {
    state.connected = isConnected;
    updateStatusBar(isConnected, portName);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function setBar(axis, value, min, max) {
    const bar = document.getElementById(`${axis}-bar`);
    if (!bar) return;
    const pct = ((value - min) / (max - min)) * 100;
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function setValText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function updateStatusBar(connected, portName) {
    const dot = document.getElementById('adcs-status-dot');
    const text = document.getElementById('adcs-status-text');
    if (!dot || !text) return;

    if (connected) {
        dot.className = 'adcs-status-dot connected';
        text.textContent = `ADCS Connected — ${portName || 'COMx'} | MPU6050 + GPS + Reaction Wheels OK`;
    } else {
        dot.className = 'adcs-status-dot disconnected';
        text.textContent = 'ADCS Disconnected — Waiting for device on any COM port…';
    }
}

// ── Sun-Pointing Arena ────────────────────────────────────────────────────────

/**
 * Draws the satellite in the arena based on roll/pitch/yaw.
 * The arena is a top-down view: we move the satellite sprite around the
 * center sun based on pitch (distance) and yaw (angle), while roll
 * rotates the satellite sprite itself.
 */
function updateArena(roll, pitch, yaw) {
    const sat = document.getElementById('arena-satellite');
    if (!sat) return;

    // Yaw → angle around sun (0..360° maps full circle)
    const angle = (yaw / 180) * Math.PI;
    const radius = 95; // px from center
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * radius;

    // Translate satellite relative to arena center
    sat.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px)) rotate(${roll}deg)`;

    // Rotate solar panels to always face "outward"
    sat.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px)) rotate(${yaw + 90}deg)`;
}

function checkSunAlignment(roll, pitch, yaw) {
    // Compute satellite's "top face" normal vector from euler angles
    const r = (roll * Math.PI) / 180;
    const p = (pitch * Math.PI) / 180;
    const y = (yaw * Math.PI) / 180;

    // Normal of +Y face after rotation (simplified)
    const nx = Math.sin(r) * Math.cos(p);
    const ny = Math.cos(r) * Math.cos(p);
    const nz = -Math.sin(p);

    // Dot product with sun direction (0,1,0)
    const dot = Math.abs(nx * SUN_DIR.x + ny * SUN_DIR.y + nz * SUN_DIR.z);
    const alignPct = Math.round(dot * 100);
    state.alignmentPct = alignPct;

    // Update readout
    setValText('align-readout', alignPct + '%');

    // Update SVG progress ring
    updateProgressRing(alignPct);

    // Colour feedback on arena border
    const arena = document.getElementById('sun-arena');
    if (arena) {
        const g = Math.round((alignPct / 100) * 155);
        arena.style.borderColor = `rgba(101, ${63 + g}, ${132 - g * 0.4}, 0.6)`;
        arena.style.boxShadow = alignPct > 80
            ? `0 0 40px rgba(57,255,20,${(alignPct - 80) / 20 * 0.5}), inset 0 0 40px rgba(0,0,0,0.5)`
            : '';
    }

    // Lock logic: hold ≥95% for 3 s
    if (alignPct >= 95) {
        if (!state.lockTimer) {
            state.lockHoldSec = 0;
            state.lockTimer = setInterval(() => {
                state.lockHoldSec++;
                if (state.lockHoldSec >= 3) {
                    triggerLock();
                    clearInterval(state.lockTimer);
                    state.lockTimer = null;
                }
            }, 1000);
        }
    } else {
        if (state.lockTimer) {
            clearInterval(state.lockTimer);
            state.lockTimer = null;
        }
        // Clear lock visuals if alignment drops
        clearLock();
    }
}

function updateProgressRing(pct) {
    const circle = document.getElementById('progress-ring-circle');
    if (!circle) return;
    const r = 152; // radius of the SVG ring (matches arena 320px / 2 - stroke/2)
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    circle.style.strokeDasharray = `${circ}`;
    circle.style.strokeDashoffset = `${offset}`;
    // Color gradient from purple → green
    const hue = Math.round(280 - (pct / 100) * 160); // 280 (purple) → 120 (green)
    circle.style.stroke = `hsl(${hue}, 80%, 60%)`;
}

function triggerLock() {
    const flash = document.getElementById('arena-lock-flash');
    const banner = document.getElementById('lock-banner');
    if (flash) flash.classList.add('visible');
    if (banner) banner.classList.add('visible');
}

function clearLock() {
    const flash = document.getElementById('arena-lock-flash');
    const banner = document.getElementById('lock-banner');
    if (flash) flash.classList.remove('visible');
    if (banner) banner.classList.remove('visible');
}

// ── Reaction Wheel Commands ───────────────────────────────────────────────────

function sendWheelCommand(axis, direction) {
    if (!_socket) return;
    const speed = direction === 0 ? 0 : direction * 150; // ±150 RPM
    _socket.emit('adcs_command', { type: 'WHEEL', axis, speed });
    // Optimistic UI update
    const newSpeeds = { ...state.wheelSpeeds, [axis]: speed };
    updateWheelSpeeds(newSpeeds.x, newSpeeds.y, newSpeeds.z);
}

function setWheelUI(axis, speed) {
    const valueEl = document.getElementById(`wheel-${axis}-speed`);
    const visual = document.getElementById(`wheel-${axis}-visual`);
    if (!valueEl || !visual) return;

    valueEl.textContent = speed === 0 ? '0 RPM' : `${speed > 0 ? '+' : ''}${speed} RPM`;

    if (speed !== 0) {
        const duration = Math.max(0.15, 1.5 - Math.abs(speed) / 200);
        visual.style.setProperty('--spin-duration', `${duration}s`);
        visual.classList.add('spinning');
    } else {
        visual.classList.remove('spinning');
    }
}

// ── Sun Pointing Toggle ───────────────────────────────────────────────────────

function bindSunPointingBtn() {
    document.getElementById('sun-pointing-btn')?.addEventListener('click', () => {
        state.sunPointing = !state.sunPointing;
        const btn = document.getElementById('sun-pointing-btn');
        if (btn) {
            btn.textContent = state.sunPointing ? ' Stop Sun-Pointing' : ' Start Sun-Pointing';
            btn.classList.toggle('active', state.sunPointing);
        }
        if (!state.sunPointing) {
            clearLock();
            updateProgressRing(0);
            setValText('align-readout', '0%');
            if (state.lockTimer) { clearInterval(state.lockTimer); state.lockTimer = null; }
        }
    });
}

// ── Bind Wheel Buttons ────────────────────────────────────────────────────────

function bindWheelButtons() {
    ['x', 'y', 'z'].forEach(axis => {
        document.getElementById(`wheel-${axis}-fwd`)?.addEventListener('click', () => sendWheelCommand(axis, 1));
        document.getElementById(`wheel-${axis}-rev`)?.addEventListener('click', () => sendWheelCommand(axis, -1));
        document.getElementById(`wheel-${axis}-stop`)?.addEventListener('click', () => sendWheelCommand(axis, 0));
    });
}

// ── Panel HTML ────────────────────────────────────────────────────────────────

function renderPanel() {
    const panel = document.getElementById('adcs-panel');
    if (!panel) return;

    panel.innerHTML = `
    <!-- Status Bar -->
    <div class="adcs-status-bar">
      <div class="adcs-status-dot disconnected" id="adcs-status-dot"></div>
      <div class="adcs-status-text" id="adcs-status-text">ADCS Disconnected — Waiting for device…</div>
    </div>

    <!-- Main grid: orientation + GPS -->
    <div class="adcs-main-grid">



      <!-- GPS Card -->
      <div class="adcs-card">
        <div class="adcs-card-title"> GPS (GY-GPS6MV2)</div>
        <div class="gps-grid">
          <div class="gps-item">
            <div class="gps-item-label">Latitude</div>
            <div class="gps-item-value" id="gps-lat">---</div>
          </div>
          <div class="gps-item">
            <div class="gps-item-label">Longitude</div>
            <div class="gps-item-value" id="gps-lon">---</div>
          </div>
          <div class="gps-item">
            <div class="gps-item-label">Altitude</div>
            <div class="gps-item-value" id="gps-alt">---</div>
          </div>
        </div>
        <div class="gps-no-fix" id="gps-no-fix">No GPS fix — waiting for satellite lock…</div>
      </div>
    </div>

    <!-- Sun-Pointing Game — full width -->
    <div class="adcs-card sun-pointing-card">
      <div class="adcs-card-title"> Sun-Pointing Simulation</div>
      <div class="sun-arena-wrap">

        <!-- The Arena -->
        <div class="sun-arena" id="sun-arena">
          <!-- Sun (fixed center) -->
          <div class="arena-sun"></div>
          <!-- Satellite (moves based on orientation) -->
          <div class="arena-satellite" id="arena-satellite">
            <div class="arena-sat-panel panel-left"></div>
            <div class="arena-sat-body">
                <div class="arena-sat-beacon"></div>
            </div>
            <div class="arena-sat-panel panel-right"></div>
          </div>
          <!-- Alignment progress ring overlay -->
          <svg class="arena-progress-svg" viewBox="0 0 320 320">
            <circle
              id="progress-ring-circle"
              cx="160" cy="160" r="152"
              fill="none"
              stroke="#653F84"
              stroke-width="4"
              stroke-linecap="round"
              stroke-dasharray="0"
              stroke-dashoffset="0"
              transform="rotate(-90 160 160)"
              style="transition: stroke-dashoffset 0.2s, stroke 0.2s;"
            />
          </svg>
          <!-- Lock flash overlay -->
          <div class="arena-lock-flash" id="arena-lock-flash"></div>
        </div>

        <!-- Controls -->
        <div class="sun-pointing-controls">
          <div class="alignment-readout"><span id="align-readout">0</span>%</div>
          <div class="alignment-label">Alignment</div>
          <button class="sun-pointing-btn" id="sun-pointing-btn"> Start Sun-Pointing</button>
          <div class="lock-banner" id="lock-banner"> SUN LOCK ACHIEVED</div>
        </div>
      </div>
    </div>

    <!-- Reaction Wheels — full width -->
    <div class="adcs-card reaction-wheels-card">
      <div class="adcs-card-title"> Reaction Wheel Control</div>
      <div class="wheels-grid">
        ${['X', 'Y', 'Z'].map(ax => `
        <div class="wheel-control">
          <div class="wheel-axis-label">${ax} Axis</div>
          <div class="wheel-visual" id="wheel-${ax.toLowerCase()}-visual">
            <div class="wheel-inner"></div>
            <div class="wheel-spin-marker"></div>
          </div>
          <div class="wheel-speed-value" id="wheel-${ax.toLowerCase()}-speed">0 RPM</div>
          <div class="wheel-btn-row">
            <button class="wheel-btn" id="wheel-${ax.toLowerCase()}-fwd">▲ CW</button>
            <button class="wheel-btn stop" id="wheel-${ax.toLowerCase()}-stop">■</button>
            <button class="wheel-btn" id="wheel-${ax.toLowerCase()}-rev">▼ CCW</button>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
  `;

    // Re-bind after render
    bindWheelButtons();
    bindSunPointingBtn();
    
    // Initialize 3D Satellite Attitude
    initAttitudeViz();
}
