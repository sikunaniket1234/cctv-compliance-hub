# Linux Local Server Deployment Guide

This guide details how to deploy the **CCTV Compliance Hub** on a local Linux server (e.g., an Ubuntu/Debian laptop running as a server) for 24/7 production use.

---

## Architecture Overview

```mermaid
graph TD
    subgraph Local LAN / NGO Site
        ESP32[ESP32 Heartbeat client]
        DVR[DVR / Cameras]
    end

    subgraph Linux Local Server
        Nginx[Nginx Reverse Proxy]
        Frontend[React Web App]
        Backend[Node.js Express API]
        MediaMTX[MediaMTX Streaming Server]
        MySQL[MySQL Database <br> Docker Container]
    end

    ESP32 -- Pings --_ Nginx
    Nginx -- Proxy --> Backend
    Backend -- Updates IP --> MySQL
    Backend -- Registers Streams --> MediaMTX
    MediaMTX -- Pulls RTSP --> DVR
    Frontend -- Plays WebRTC --> MediaMTX
```

---

## 1. Prerequisites

Ensure your Linux server has the following installed:
```bash
# Update repositories
sudo apt update && sudo apt upgrade -y

# Install Node.js & npm (Node v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git curl ffmpeg

# Install Docker & Docker Compose
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER # Run without sudo (requires logout/login)
```

---

## 2. Step 1: Database Setup (MySQL Docker Container)

Run MySQL inside a Docker container for ease of management and persistent storage.

1. Create a `docker-compose.yml` file in your database directory:
   ```yaml
   version: '3.8'
   services:
     db:
       image: mysql:8.0
       container_name: cctv-mysql
       restart: always
       environment:
         MYSQL_ROOT_PASSWORD: rootpassword
         MYSQL_DATABASE: cctv_compliance
         MYSQL_USER: cctv_user
         MYSQL_PASSWORD: cctvpassword
       ports:
         - "3306:3306"
       volumes:
         - mysql_data:/var/lib/mysql

   volumes:
     mysql_data:
   ```
2. Start the database:
   ```bash
   docker-compose up -d
   ```

---

## 3. Step 2: MediaMTX Server Setup

MediaMTX acts as our media proxy server that ingests RTSP streams and serves them as WebRTC (WHEP) for web browsers.

1. Download and extract the latest MediaMTX Linux release:
   ```bash
   wget https://github.com/bluenviron/mediamtx/releases/latest/download/mediamtx_v1.9.0_linux_amd64.tar.gz
   tar -xzf mediamtx_v1.9.0_linux_amd64.tar.gz -C /usr/local/bin mediamtx
   ```
2. Create the system configuration directory and configuration file:
   ```bash
   sudo mkdir -p /etc/mediamtx
   # Download the default config file from github or use yours
   wget https://raw.githubusercontent.com/bluenviron/mediamtx/main/mediamtx.yml -O /etc/mediamtx/mediamtx.yml
   ```
3. Set up MediaMTX as a **systemd service** so it runs continuously and restarts on boot:
   Create `/etc/systemd/system/mediamtx.service`:
   ```ini
   [Unit]
   Description=MediaMTX Real-time Media Server
   After=network.target

   [Service]
   Type=simple
   ExecStart=/usr/local/bin/mediamtx /etc/mediamtx/mediamtx.yml
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
4. Start and enable the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start mediamtx
   sudo systemctl enable mediamtx
   ```

---

## 4. Step 3: Backend Node.js API Setup

1. Clone your repository to `/var/www/cctv-compliance-hub`.
2. Configure your `/var/www/cctv-compliance-hub/backend/.env` file:
   ```env
   PORT=4000
   DB_HOST=127.0.0.1
   DB_USER=cctv_user
   DB_PASSWORD=cctvpassword
   DB_NAME=cctv_compliance
   JWT_SECRET=your_jwt_signing_key_here
   CAMERA_ENCRYPTION_KEY=your_32_character_encryption_key_here
   MEDIAMTX_API_URL=http://localhost:9997
   MEDIAMTX_PUBLIC_URL=http://<YOUR_SERVER_PUBLIC_IP_OR_DOMAIN>:8889
   HEARTBEAT_SECRET_TOKEN=my-secret-123
   ```
3. Install dependencies and seed the database schema:
   ```bash
   cd /var/www/cctv-compliance-hub/backend
   npm install
   node seed.js # Automatically synchronizes columns and seeds mock data
   ```
4. Set up the backend API as a **systemd service**:
   Create `/etc/systemd/system/cctv-backend.service`:
   ```ini
   [Unit]
   Description=CCTV Compliance Backend API
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/cctv-compliance-hub/backend
   ExecStart=/usr/bin/node src/server.js
   Restart=always
   RestartSec=5
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```
5. Start and enable the service:
   ```bash
   sudo chown -R www-data:www-data /var/www/cctv-compliance-hub
   sudo systemctl daemon-reload
   sudo systemctl start cctv-backend
   sudo systemctl enable cctv-backend
   ```

---

## 5. Step 4: Frontend Web App Setup (using Nginx)

1. Build the production React assets:
   ```bash
   cd /var/www/cctv-compliance-hub/frontend
   npm install
   # Create a production build of static files
   npm run build
   ```
   This will generate a `dist` directory with your compiled HTML/JS/CSS assets.

2. Configure **Nginx** to serve the static frontend and reverse proxy API calls and WHEP streams:
   Create `/etc/nginx/sites-available/cctv`:
   ```nginx
   server {
       listen 80;
       server_name <YOUR_SERVER_PUBLIC_IP_OR_DOMAIN>;

       # Serve static React frontend
       location / {
           root /var/www/cctv-compliance-hub/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to backend Node.js server
       location /api/ {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }

       # Proxy WHEP (WebRTC) streaming requests to MediaMTX
       location /cam/ {
           proxy_pass http://127.0.0.1:8889;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
3. Enable the Nginx site config and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/cctv /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl restart nginx
   ```

---

## 6. Step 5: Setting up IPv6 Dynamic Tracking

With IPv6 enabled, your DVR can be directly streamed to the server without port-forwarding issues.

### Router Firewall Setup (JioRouter/BSNL)
1. **Find your DVR's static IPv6 Interface ID:** Look at the DVR network screen. Locate its IPv6 address. The last 4 segments represent the Interface ID (e.g. for `2409:4060:abcd:1234::a8da:c2f:63bf`, the ID is `::a8da:c2f:63bf`).
2. Log in to your router page (e.g. `http://192.168.29.1`).
3. Navigate to **Security/Firewall ➔ IPv6 Firewall / Filtering**.
4. Add a rule to **Allow** incoming TCP traffic on port **`554`** destined for your DVR's static Interface ID.
5. In the CCTV Compliance Hub dashboard, add your camera and fill in the **IPv6 Interface ID** field with your DVR's static ID.
6. The ESP32 will periodically ping the server, sending the current dynamic prefix. The backend will automatically merge it and direct MediaMTX to the correct public address!
