const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
// UI Logic for Login, Admin Panel, and Notifications

export function initUI() {
    initLogin();
    initRegistration();
    initAdminPanel();
    initGallery();
    initAlerts();

    // Auto-load thresholds on init (wait for main.js to set default source)
    setTimeout(() => {
        if (window.loadThresholds) {
            window.loadThresholds();
        }
    }, 500);
}

function initLogin() {
    const loginPortal = document.getElementById('login-portal');
    const loginForm = document.getElementById('login-form');
    const guestBtn = document.getElementById('guest-entry');
    const dashboard = document.querySelector('.dashboard-container');

    if (!loginPortal) return;

    const enterDashboard = (user) => {
        // user object: { username: string, role: string, is_super: boolean }
        const isAdmin = user && (user.role === 'admin' || user.is_super === true);
        const perms = user ? (user.permissions || {}) : {};

        console.log('[AccessControl] Entering Dashboard as:', user.username, 'Admin:', isAdmin);
        console.table(perms);

        // 0. Enforce Page Access Locks
        const gridContainer = document.querySelector('.grid-container');
        const vizGrid = document.querySelector('.viz-grid');

        if (!isAdmin && perms['cdhs-telemetry'] !== true) {
            if (gridContainer) gridContainer.classList.add('locked-feature');
        } else {
            if (gridContainer) gridContainer.classList.remove('locked-feature');
        }

        if (!isAdmin && perms['adcs-telemetry'] !== true) {
            if (vizGrid) vizGrid.classList.add('locked-feature');
        } else {
            if (vizGrid) vizGrid.classList.remove('locked-feature');
        }
        
        // 1. Hide login portal immediately
        loginPortal.classList.add('hidden');

        // 2. Trigger the cinematic Earth horizon animation
        const cinematic = document.getElementById('earth-horizon-cinematic');
        const spaceObjects = document.getElementById('space-objects');

        if (spaceObjects) {
            spaceObjects.style.transition = 'transform 3s cubic-bezier(0.4, 0, 0.2, 1), opacity 2s ease';
            spaceObjects.style.transform = 'translateY(-100%) scale(1.5)';
            spaceObjects.style.opacity = '0';
        }

        if (cinematic) {
            cinematic.classList.add('active');
            setTimeout(() => {
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
            }, 3200);
        } else {
            dashboard.style.opacity = '1';
            dashboard.style.transform = 'translateY(0)';
        }

        if (isAdmin) {
            updateConnectionStatus(`Admin: ${user.username}`, user.is_super ? '#00d2ff' : '#9b72c0');
            const adminPanel = document.getElementById('admin-panel');
            setTimeout(() => {
                if (adminPanel) adminPanel.classList.remove('hidden');
                
                // Show User Management card if super-admin
                if (user.is_super) {
                    const mgmtCard = document.getElementById('user-mgmt-card');
                    if (mgmtCard) {
                        mgmtCard.classList.remove('hidden');
                        initUserManagement();
                    }
                }
            }, 3200);
        }
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                enterDashboard(data.user);
            } else {
                alert(data.error || 'Login failed.');
            }
        } catch (err) {
            console.error('Login error:', err);
            // Fallback for offline mode / super-admin if server is down during dev
            if (username === 'admin@spacepoint.ae' && password === 'admin@1234') {
                 enterDashboard({ username: 'Admin', role: 'admin', is_super: true });
            } else {
                 alert('Authentication Server Unreachable.');
            }
        }
    });

    // ── Auto-verify for students coming from the Hub ─────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token') || localStorage.getItem('sp_token');
    if (urlToken) {
        // Hide login portal immediately to ensure seamless entry
        loginPortal.classList.add('hidden');
        
        // Use MissionPortal API (relative since we are hosted on same domain)
        const MISSION_API = window.location.origin;

        fetch(`${MISSION_API}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${urlToken}` }
        })
        .then(res => {
            if (!res.ok) throw new Error('Invalid MissionPortal token');
            return res.json();
        })
        .then(async (user) => {
            // Fetch permissions from MissionPortal
            const checkPerm = async (key) => {
                try {
                    const res = await fetch(`${MISSION_API}/api/page-access/check/${key}`, {
                        headers: { 'Authorization': `Bearer ${urlToken}` }
                    });
                    const data = await res.json();
                    return data.is_unlocked === true;
                } catch { return false; }
            };

            const cdhsUnlocked = await checkPerm('cdhs-telemetry');
            const adcsUnlocked = await checkPerm('adcs-telemetry');

            enterDashboard({
                username: user.full_name || user.email,
                role: user.role,
                permissions: {
                    'cdhs-telemetry': cdhsUnlocked,
                    'adcs-telemetry': adcsUnlocked
                }
            });
        })
        .catch(err => {
            loginPortal.classList.remove('hidden');
            console.error('Auto-login failed:', err);
        });
    }

    guestBtn.addEventListener('click', () => {
        // Students should NOT have unlimited access. 
        // "Continue as Guest" now starts with all restricted features LOCKED.
        enterDashboard({ 
            username: 'Guest', 
            role: 'guest', 
            permissions: {} 
        });
    });
}

function initRegistration() {
    const openBtn = document.getElementById('open-register');
    const modal = document.getElementById('register-modal');
    const form = document.getElementById('register-form');

    if (!openBtn || !modal || !form) return;

    openBtn.onclick = (e) => {
        e.preventDefault();
        modal.classList.remove('hidden');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                alert(data.message);
                modal.classList.add('hidden');
                form.reset();
            } else {
                alert(data.error || 'Registration failed.');
            }
        } catch (err) {
            alert('Failed to connect to registration server.');
        }
    };
}

async function initUserManagement() {
    const list = document.getElementById('pending-users-list');
    if (!list) return;

    const refreshList = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/pending`);
            const data = await res.json();
            
            if (data.users && data.users.length > 0) {
                list.innerHTML = data.users.map(u => `
                    <div class="pending-user-item" style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-weight:600; color:#fff;">${u.username}</span>
                            <span style="font-size:0.75rem; color:#888;">${u.email} • Requested: ${new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-cmd" onclick="window.approveUser(${u.id}, true)" style="border-color:#39ff14; color:#39ff14;">Approve</button>
                            <button class="btn-cmd" onclick="window.approveUser(${u.id}, false)" style="border-color:#ff6b6b; color:#ff6b6b;">Deny</button>
                        </div>
                    </div>
                `).join('');
            } else {
                list.innerHTML = `<p style="color:#888; font-style:italic;">No pending registration requests.</p>`;
            }
        } catch (err) {
            list.innerHTML = `<p style="color:#ff6b6b;">Failed to load pending users.</p>`;
        }
    };

    window.approveUser = async (id, approve) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: id, approve })
            });
            if (res.ok) {
                showNotification(approve ? 'User Approved' : 'Request Denied', `Action successful for user ID ${id}`, approve ? 'success' : 'info');
                refreshList();
            }
        } catch (err) {
            showNotification('Error', 'Failed to update user status', 'error');
        }
    };

    refreshList();
}

function initAdminPanel() {
    // Slider Event Listeners for Live Update labels
    document.getElementById('sim-temp')?.addEventListener('input', (e) => {
        document.getElementById('sim-temp-val').innerText = e.target.value;
    });

    document.getElementById('sim-batt')?.addEventListener('input', (e) => {
        document.getElementById('sim-batt-val').innerText = e.target.value;
    });

    document.getElementById('sim-current')?.addEventListener('input', (e) => {
        document.getElementById('sim-current-val').innerText = e.target.value;
    });

    document.getElementById('sim-power')?.addEventListener('input', (e) => {
        document.getElementById('sim-power-val').innerText = e.target.value;
    });

    document.getElementById('sim-rssi')?.addEventListener('input', (e) => {
        document.getElementById('sim-rssi-val').innerText = e.target.value;
    });

    document.getElementById('sim-snr')?.addEventListener('input', (e) => {
        document.getElementById('sim-snr-val').innerText = parseFloat(e.target.value).toFixed(1);
    });

    // ── Alert Tab Switching ──────────────────────────────────────────────────
    window.switchAlertTab = (tab) => {
        ['cdhs', 'sim'].forEach(t => {
            document.getElementById(`alert-panel-${t}`)?.classList.toggle('hidden', t !== tab);
            document.getElementById(`alert-tab-${t}`)?.classList.toggle('active', t === tab);
        });
    };

    // ── Per-device Save / Load ────────────────────────────────────────────────
    const PREFIX = { 'CDHS_Board': 'cdhs', 'Sat_1': 'sim' };

    window.saveThresholdsFor = async (deviceId) => {
        const p = PREFIX[deviceId] || 'cdhs';
        const limits = {
            temp_max: parseFloat(document.getElementById(`${p}-threshold-temp-max`).value),
            temp_min: parseFloat(document.getElementById(`${p}-threshold-temp-min`).value),
            voltage_max: parseFloat(document.getElementById(`${p}-threshold-voltage-max`).value),
            voltage_min: parseFloat(document.getElementById(`${p}-threshold-voltage-min`).value),
            current_max: parseFloat(document.getElementById(`${p}-threshold-current-max`).value),
            power_max: parseFloat(document.getElementById(`${p}-threshold-power-max`).value),
        };
        try {
            await fetch(`${API_BASE}/api/thresholds?device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(limits)
            });
            showNotification('Settings Saved', `Thresholds updated for ${deviceId}`, 'success');
        } catch (e) {
            showNotification('Error', 'Failed to save thresholds', 'error');
        }
    };

    window.loadThresholdsFor = async (deviceId) => {
        const p = PREFIX[deviceId] || 'cdhs';
        try {
            const res = await fetch(`${API_BASE}/api/thresholds?device_id=${deviceId}`);
            const t = await res.json();
            document.getElementById(`${p}-threshold-temp-max`).value = t.temp_max ?? 35.0;
            document.getElementById(`${p}-threshold-temp-min`).value = t.temp_min ?? 0.0;
            document.getElementById(`${p}-threshold-voltage-max`).value = t.voltage_max ?? 5.5;
            document.getElementById(`${p}-threshold-voltage-min`).value = t.voltage_min ?? 3.0;
            document.getElementById(`${p}-threshold-current-max`).value = t.current_max ?? 1.0;
            document.getElementById(`${p}-threshold-power-max`).value = t.power_max ?? 2.0;
            console.log(`[Thresholds] Loaded for ${deviceId}:`, t);
        } catch (e) {
            console.error('Load Thresholds Error:', e);
            showNotification('Error', 'Failed to load thresholds', 'error');
        }
    };

    // Legacy shims — used by setDataSource switch and old callers
    window.saveThresholds = () => {
        const device = window.currentDataSource === 'CDHS' ? 'CDHS_Board' : 'Sat_1';
        window.saveThresholdsFor(device);
    };
    window.loadThresholds = () => {
        // Load both tabs so values are always up-to-date
        window.loadThresholdsFor('CDHS_Board');
        window.loadThresholdsFor('Sat_1');
    };

    // ── Simulation Control Card visibility ───────────────────────────────────
    // Show sim-control-card only when SIM mode is active
    window.updateSimControlVisibility = (source) => {
        const card = document.getElementById('sim-control-card');
        if (!card) return;
        card.style.display = source === 'SIM' ? '' : 'none';
    };
}

function initAlerts() {
    // Setup container
}

export function updateConnectionStatus(text, color) {
    const status = document.getElementById('connection-status');
    if (status) {
        status.innerHTML = `<span class="dot" style="background:${color}; box-shadow:0 0 10px ${color};"></span> ${text}`;
    }
}

export function showNotification(title, message, type = 'info') {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `alert-notification ${type}`; // 'info', 'warning', 'critical', 'success'

    if (type === 'error' || type === 'critical') {
        el.classList.add('critical');
        playAlertSound('critical');
        showBrowserNotification(title, message, 'critical');
    } else if (type === 'warning') {
        el.classList.add('warning');
        playAlertSound('warning');
    }

    el.innerHTML = `
      <div class="alert-icon">${type === 'success' ? '' : type === 'error' || type === 'critical' ? '' : ''}</div>
      <div class="alert-content">
        <div class="alert-title">${title}</div>
        <div class="alert-message">${message}</div>
      </div>
      <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(el);
    setTimeout(() => {
        if (el.parentElement) {
            el.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => el.remove(), 300);
        }
    }, 5000);
}

// Legacy showAlert for socket compatibility
export function showAlert(alertData) {
    const severity = alertData.severity || 'info';
    const title = alertData.alert_type ? alertData.alert_type.toUpperCase() : 'Alert';
    const message = alertData.message || `${alertData.current_value} (Limit: ${alertData.threshold})`;

    showNotification(title, message, severity);
}

function playAlertSound(severity) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = severity === 'critical' ? 800 : 600;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio not supported', e);
    }
}

function showBrowserNotification(title, message, severity) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: severity === 'critical' ? '' : '',
            tag: 'alert-notification'
        });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// Make global for existing HTML onclicks
window.showNotification = showNotification;
window.showAlert = showAlert;

// Helper for show/hide password buttons
window.togglePassword = function(id) {
    // ... togglePassword logic
}

function initGallery() {
    const modal = document.getElementById('gallery-modal');
    const grid = document.getElementById('gallery-grid');
    const lightbox = document.getElementById('gallery-lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbMeta = document.getElementById('lightbox-meta');

    if (!modal || !grid) return;

    window.openGallery = () => {
        modal.classList.remove('hidden');
        window.refreshGallery();
    };

    window.refreshGallery = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/images`);
            const data = await res.json();
            
            if (data.images && data.images.length > 0) {
                grid.innerHTML = data.images.map(img => `
                    <div class="gallery-card" onclick="window.openLightbox('${img.filename}', '${img.lat}', '${img.lon}', '${img.alt}', ${img.timestamp})">
                        <div class="gallery-tag">Archive</div>
                        <img src="${API_BASE}/api/images/serve/${img.filename}" alt="Satellite View">
                        <div class="gallery-meta-overlay">
                            <div style="font-weight:600; font-size:0.9rem;"> Orbital Capture</div>
                            <div class="gallery-meta-row">
                                <span> ${img.lat?.toFixed(4)}, ${img.lon?.toFixed(4)}</span>
                                <span> ${img.alt?.toFixed(1)}m</span>
                            </div>
                            <div style="font-size:0.7rem; opacity:0.6; margin-top:5px;">${new Date(img.timestamp * 1000).toLocaleString()}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:100px; color:#888;"> No mission images archived yet.</div>`;
            }
        } catch (err) {
            grid.innerHTML = `<p style="color:#ff6b6b; grid-column: 1/-1; text-align:center;">Failed to load gallery images.</p>`;
        }
    };

    window.openLightbox = (filename, lat, lon, alt, ts) => {
        lbImg.src = `${API_BASE}/api/images/serve/${filename}`;
        lbMeta.innerHTML = `
            <b>Orbital View</b> &nbsp;·&nbsp; 
            GPS: <b>${lat}, ${lon}</b> &nbsp;·&nbsp; 
            Alt: <b>${alt}m</b> &nbsp;·&nbsp; 
            Sync: <b>${new Date(ts * 1000).toLocaleString()}</b>
        `;
        lightbox.classList.remove('hidden');
    };

    window.capturePhoto = async () => {
        showNotification(' Capture Triggered', 'Requesting image from satellite sensors...', 'info');
        
        // Simulation / Real Flow
        const isSim = window.currentDataSource === 'SIM';
        
        if (isSim) {
            // Mock base64 image (space themed placeholder)
            // Using a colored block as a base64 mock
            const canvas = document.createElement('canvas');
            canvas.width = 640; canvas.height = 480;
            const ctx = canvas.getContext('2d');
            const g = ctx.createRadialGradient(320, 240, 20, 320, 240, 300);
            g.addColorStop(0, '#001a33'); g.addColorStop(1, '#000');
            ctx.fillStyle = g; ctx.fillRect(0,0,640,480);
            ctx.fillStyle = '#fff';
            // Stars
            for(let i=0; i<50; i++) ctx.fillRect(Math.random()*640, Math.random()*480, 2, 2);
            // Earth Curve
            ctx.beginPath(); ctx.arc(320, 1000, 700, 0, Math.PI*2);
            ctx.fillStyle = '#00d2ff'; ctx.fill();
            
            const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
            
            try {
                const res = await fetch(`${API_BASE}/api/images/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64,
                        device_id: 'SIM_1',
                        lat: (Math.random() * 180 - 90).toFixed(4),
                        lon: (Math.random() * 360 - 180).toFixed(4),
                        alt: (Math.random() * 500 + 350).toFixed(1)
                    })
                });
                if (res.ok) {
                    showNotification(' Photo Saved', 'Image successfully archived in Mission Gallery!', 'success');
                    if (!modal.classList.contains('hidden')) window.refreshGallery();
                }
            } catch (err) {
                showNotification('Error', 'Failed to archive simulated photo', 'error');
            }
        } else {
            // Real hardware implementation would wait for ESP32 response over serial
            // Here we just notify that the command was sent
            window.sendCommand('CAPTURE_IMAGE');
        }
    };
}
