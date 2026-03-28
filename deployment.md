# 🚀 Mission Portal VPS Deployment Guide

This guide provides step-by-step instructions to deploy the SpacePoint Mission Portal to your Ubuntu/Linux VPS at `/var/www/missionportal`.

---

## 🏗️ 1. Project Directory & Preparation

Connect to your VPS and create the necessary directory:

```bash
sudo mkdir -p /var/www/missionportal
sudo chown -R $USER:$USER /var/www/missionportal
cd /var/www/missionportal
```

Now, **clone your project** (or copy it) into this folder. If it's already there, skip to the next step.

---

## 🐍 2. Python Environment Setup

Create a virtual environment and install the required dependencies:

```bash
# Navigate to backend folder
cd /var/www/missionportal/backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies (including Gunicorn for production)
pip install -r requirements.txt
pip install gunicorn
```

---

## 🔐 3. Configuration (.env)

Create a production `.env` file in the `backend/` directory:

```bash
nano /var/www/missionportal/backend/.env
```

**Paste the following configuration (using your DB URL):**

```env
DATABASE_URL=postgresql://postgres:Ahmad213%23@localhost:5432/spacepoint_mission
SECRET_KEY=your_very_secure_secret_hash_here  # Change this to something random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

---

## 🗃️ 4. Database Setup & Seeding

Ensure PostgreSQL is running and your database exists. Then, use the seed script to populate initial components:

```bash
# Still in backend with .venv active
python3 seed.py
```

---

## ⚙️ 5. Setting up Gunicorn (Systemd)

We will create a system service so the app stays running even after you log out or the server restarts.

```bash
sudo nano /etc/systemd/system/missionportal.service
```

**Paste the following (replace `YOUR_VPS_USER` with your actual username):**

```ini
[Unit]
Description=Gunicorn instance to serve SpacePoint Mission Portal
After=network.target

[Service]
User=YOUR_VPS_USER
Group=www-data
WorkingDirectory=/var/www/missionportal/backend
Environment="PATH=/var/www/missionportal/backend/.venv/bin"
ExecStart=/var/www/missionportal/backend/.venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app -b 127.0.0.1:8000

[Install]
WantedBy=multi-user.target
```

**Start the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl start missionportal
sudo systemctl enable missionportal
```

---

## 🌐 6. Nginx Reverse Proxy

Now, expose your app to the internet (ports 80/443).

```bash
sudo nano /etc/nginx/sites-available/missionportal
```

**Paste the following configuration:**

```nginx
server {
    listen 80;
    server_name portal.yourdomain.com; # Change to your actual domain or IP

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets handling
    location /static/ {
        alias /var/www/missionportal/frontend/;
    }
}
```

**Enable the site and restart Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/missionportal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 7. SSL Certificate (HTTPS)

Secure your portal with a free Let's Encrypt SSL certificate:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d portal.yourdomain.com
```

---

## 📋 Useful Commands

- **Checklogs:** `sudo journalctl -u missionportal --tail 50 -f`
- **Restart App:** `sudo systemctl restart missionportal`
- **Status App:** `sudo systemctl status missionportal`
