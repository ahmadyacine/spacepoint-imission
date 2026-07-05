# 🚀 SpacePoint Mission Portal — VPS Deployment Guide

Full deployment guide for the SpacePoint Mission Portal stack on a fresh Ubuntu/Linux VPS.
This covers **Mission Portal** (FastAPI + Gunicorn), **Ground Station** (Python Socket.IO backend + Vite frontend), and the **Software Guide** (static HTML).

> **Domain used:** `madar.spacepoint.ae`  
> **VPS path:** `/var/www/missionportal`  
> **Ports:** Mission Portal → `8002`, Ground Station backend → `5000`

---

## 📋 Prerequisites

- Ubuntu 22.04+ VPS with root access
- PostgreSQL installed and running
- Nginx installed
- Python 3.10+, Node.js (for local builds only)
- Domain DNS `A` record pointing to your VPS IP

---

## 🏗️ Step 1 — Clone the Repository

```bash
cd /var/www
sudo git clone https://github.com/ahmadyacine/spacepoint-imission.git missionportal
cd missionportal
```

Your folder structure should look like:
```
/var/www/missionportal/
├── backend/                        ← Mission Portal FastAPI backend
├── frontend/                       ← Mission Portal HTML frontend
├── LoRa-Dashboard-V3-main/         ← Ground Station (Vite frontend + Python backend)
│   ├── dist/                       ← Built frontend (served by Nginx)
│   └── backend/                    ← Ground Station Python backend (port 5000)
├── spacepoint-software-guide-main/ ← Static software guide HTML
├── deployment.md
└── README.md
```

---

## 🐍 Step 2 — Mission Portal Backend Setup

```bash
cd /var/www/missionportal/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Create the `.env` file

> ⚠️ This file is NOT in the repo (it's in `.gitignore`). You must create it manually on every new VPS.

```bash
cat > /var/www/missionportal/backend/.env << 'EOF'
DATABASE_URL=postgresql://spacepoint_user:Ahmad213%23@localhost:5432/spacepoint_mission
SECRET_KEY=bb40cad84c1f28dd2456464ac1e7d825b8c9e7f1a2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF
```

### Seed the database

```bash
python3 seed.py
```

---

## 🛰️ Step 3 — Ground Station Backend Setup

```bash
cd /var/www/missionportal/LoRa-Dashboard-V3-main/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Create the Ground Station `.env` file

> ⚠️ Also NOT in the repo. Must be created manually.

```bash
cat > /var/www/missionportal/LoRa-Dashboard-V3-main/backend/.env << 'EOF'
SERIAL_PORT=AUTO
SERIAL_BAUD=115200
API_PORT=5000
ADCS_PORT=AUTO
DATABASE_URL=postgresql://spacepoint_user:Ahmad213%23@localhost:5432/spacepoint_mission
EOF
```

---

## ⚙️ Step 4 — Systemd Services

### Mission Portal Service

```bash
sudo nano /etc/systemd/system/missionportal.service
```

```ini
[Unit]
Description=Gunicorn instance for Mission Portal
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/var/www/missionportal/backend
Environment="PATH=/var/www/missionportal/backend/.venv/bin"
ExecStart=/var/www/missionportal/backend/.venv/bin/gunicorn \
    -w 1 \
    -k uvicorn.workers.UvicornWorker \
    -b 127.0.0.1:8002 \
    app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### Ground Station Service

```bash
sudo nano /etc/systemd/system/groundstation.service
```

```ini
[Unit]
Description=Ground Station Backend
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/var/www/missionportal/LoRa-Dashboard-V3-main/backend
ExecStart=/var/www/missionportal/LoRa-Dashboard-V3-main/backend/venv/bin/python serial_reader.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Enable & Start Both Services

```bash
sudo systemctl daemon-reload

sudo systemctl enable missionportal
sudo systemctl start missionportal

sudo systemctl enable groundstation
sudo systemctl start groundstation

# Verify both are running
sudo systemctl status missionportal
sudo systemctl status groundstation
```

> If a service fails, check logs with:
> ```bash
> sudo journalctl -u groundstation -n 50 --no-pager
> ```

---

## 🔒 Step 5 — SSL Certificate (Chicken-and-Egg Fix)

You must get the SSL cert **before** adding SSL to the Nginx config, because Certbot needs Nginx to be running on port 80 first.

### 5a — Temporary HTTP-only Nginx config

```bash
sudo nano /etc/nginx/sites-available/missionportal
```

Paste this minimal config:

```nginx
server {
    listen 80;
    server_name madar.spacepoint.ae;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:8002;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/missionportal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5b — Get the SSL certificate

```bash
sudo certbot certonly --webroot -w /var/www/html -d madar.spacepoint.ae
```

Verify the cert files exist:
```bash
ls /etc/letsencrypt/live/madar.spacepoint.ae/
# Should show: fullchain.pem, privkey.pem, cert.pem, chain.pem
ls /etc/letsencrypt/options-ssl-nginx.conf
ls /etc/letsencrypt/ssl-dhparams.pem
```

---

## 🌐 Step 6 — Full Nginx Configuration (with SSL)

Now replace the Nginx config with the complete production version:

```bash
sudo nano /etc/nginx/sites-available/missionportal
```

```nginx
server {
    listen 443 ssl;
    server_name madar.spacepoint.ae;

    ssl_certificate /etc/letsencrypt/live/madar.spacepoint.ae/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/madar.spacepoint.ae/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    # ==========================================
    # 1. MISSION PORTAL
    # ==========================================
    location / {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/missionportal/frontend/;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8002/docs;
        proxy_set_header Host $host;
    }

    # ==========================================
    # 2. GROUND STATION
    # ==========================================

    # Force trailing slash
    location = /ground-station {
        return 301 /ground-station/;
    }

    # Serve the built Vite frontend
    location /ground-station/ {
        alias /var/www/missionportal/LoRa-Dashboard-V3-main/dist/;
        try_files $uri $uri/ /ground-station/index.html;
    }

    # Proxy REST API calls to Ground Station backend
    # NOTE: rewrite strips /gs-api/ prefix so /gs-api/api/x → /api/x on port 5000
    location /gs-api/ {
        rewrite ^/gs-api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Socket.IO WebSocket (root namespace)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Socket.IO /ws/telemetry namespace
    location /ws/ {
        proxy_pass http://127.0.0.1:5000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # ==========================================
    # 3. SOFTWARE GUIDE
    # ==========================================

    location = /guide {
        return 301 /guide/;
    }

    location /guide/ {
        alias /var/www/missionportal/spacepoint-software-guide-main/;
        index index.html;
        try_files $uri $uri/ /guide/index.html;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name madar.spacepoint.ae;
    return 301 https://$host$request_uri;
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Step 7 — Verify Everything Works

| URL | Expected Result |
|-----|----------------|
| `https://madar.spacepoint.ae` | Mission Portal login page (green padlock) |
| `https://madar.spacepoint.ae/docs` | FastAPI Swagger UI |
| `https://madar.spacepoint.ae/ground-station/` | Ground Station Dashboard |
| `https://madar.spacepoint.ae/guide/` | Software Guide static site |
| `curl http://localhost:5000/api/thresholds?device_id=CDHS_Board` | JSON response (not HTML) |

---

## 🔄 Updating After a Git Push

Whenever you push new code from your local machine:

```bash
cd /var/www/missionportal
git pull

# Restart Mission Portal if backend changed
sudo systemctl restart missionportal

# Restart Ground Station if its backend changed
sudo systemctl restart groundstation

# No Nginx restart needed — the dist/ folder is served statically
```

---

## 📋 Useful Commands

| Task | Command |
|------|---------|
| Mission Portal logs | `sudo journalctl -u missionportal -n 50 --no-pager` |
| Ground Station logs | `sudo journalctl -u groundstation -n 50 --no-pager` |
| Restart Mission Portal | `sudo systemctl restart missionportal` |
| Restart Ground Station | `sudo systemctl restart groundstation` |
| Restart Nginx | `sudo systemctl reload nginx` |
| Test Nginx config | `sudo nginx -t` |
| Renew SSL cert | `sudo certbot renew --dry-run` |
| Check Ground Station API | `curl http://localhost:5000/api/thresholds?device_id=CDHS_Board` |

---

## ⚠️ Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `502 Bad Gateway` on `/gs-api/` | Ground Station backend not running | `sudo systemctl start groundstation` |
| `404 Not Found` on `/gs-api/api/x` | Wrong Nginx rewrite (double `/api/api/`) | Use `rewrite ^/gs-api/(.*) /$1 break;` |
| WebSocket fails (`wss://...socket.io`) | Ground Station backend down OR wrong Nginx block | Start groundstation service + add `/socket.io/` and `/ws/` Nginx blocks |
| SSL cert error on `nginx -t` | Certbot files not yet generated | Follow Step 5 (get cert first, add SSL config second) |
| `.env not found` errors in logs | `.env` is gitignored, must be created manually | See Step 2 and Step 3 |
| `password authentication failed for user "postgres"` | Wrong DB credentials in Ground Station `.env` | Check Mission Portal `.env` for correct `DATABASE_URL` and copy credentials |
| `venv/bin/gunicorn not found` | venv name mismatch (`.venv` vs `venv`) | Make sure service file path matches the actual venv folder name |
