# CCTV Compliance Hub

The **CCTV Compliance Hub** is a lightweight, high-performance web platform designed to help NGOs, shelters, hostels, schools, and government-funded institutions meet security compliance guidelines. The platform allows institutions to register multiple physical locations, configure camera feeds, and expose secure, real-time live-view streams to external inspectors.

---

## 📁 Repository Structure

This codebase is organized as a clean monorepo:
* **`backend/`**: Express API server built with Sequelize ORM for database mapping and automatic MediaMTX stream provisioning.
* **`frontend/`**: React application powered by Vite, providing the administrative dashboard and the public live-view grid player.
* **`mediamtx/`**: Configuration templates for MediaMTX (the real-time RTSP-to-WebRTC streaming gateway).

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
* **Node.js** (v18 or higher recommended)
* **MediaMTX Binary:** Download the MediaMTX executable for your OS (Windows/Linux/macOS) from the [official MediaMTX Releases page](https://github.com/bluenviron/mediamtx/releases). Extract and place the executable inside the `mediamtx/` directory.

---

### 2. Backend Setup & Database Setup (MySQL in Docker)

To run the application with a MySQL database inside Docker:

1. **Spin up MySQL in Docker:**
   Run the following command to start a MySQL container:
   ```bash
   docker run -d \
     --name cctv-mysql \
     -p 3306:3306 \
     -e MYSQL_DATABASE=cctv_hub \
     -e MYSQL_ROOT_PASSWORD=your_root_password \
     mysql:latest
   ```

2. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure environment variables:**
   * Copy `backend/.env.example` to `backend/.env`.
   * Configure the `.env` file to use your Docker MySQL details:
     ```env
     DB_DIALECT=mysql
     DB_NAME=cctv_hub
     DB_USER=root
     DB_PASSWORD=your_root_password
     DB_HOST=127.0.0.1
     DB_PORT=3306
     JWT_SECRET=super_secret_key
     ```

5. **Run the development server:**
   ```bash
   npm start
   ```
   The backend will connect to your MySQL Docker container, synchronize tables, and launch at `http://localhost:4000`. It will also automatically sync all registered cameras with your local MediaMTX instance.

---

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend UI will be available at `http://localhost:5173`.

---

### 4. Running MediaMTX
1. Navigate to the mediamtx directory:
   ```bash
   cd ../mediamtx
   ```
2. Start the media server using our custom configuration file:
   * **Windows:**
     ```powershell
     .\mediamtx.exe mediamtx.yml
     ```
   * **Linux / macOS:**
     ```bash
     ./mediamtx mediamtx.yml
     ```

---

## 🛠️ Core Files to Commit to GitHub

To keep the repository clean and secure, **do not** commit private credentials, local test files, local SQLite databases, dependencies, or compiled binaries. 

Here is the list of core files that should be tracked and committed to Git:

### 1. Project Root Configuration
* `README.md`

### 2. Backend Files
* `backend/package.json`
* `backend/package-lock.json`
* `backend/.env.example`
* `backend/.gitignore`
* `backend/src/` (Entire contents containing: controllers, models, routes, config, app.js, and server.js)

### 3. Frontend Files
* `frontend/package.json`
* `frontend/package-lock.json`
* `frontend/vite.config.js`
* `frontend/.gitignore`
* `frontend/index.html`
* `frontend/src/` (Entire contents containing: components, pages, styles, assets, and App.jsx)

### 4. MediaMTX Templates
* `mediamtx/mediamtx.yml`

---

## 🚫 Files to Exclude (.gitignore Checklist)

Ensure the following paths are added to your `.gitignore` to prevent tracking:
```text
# Node dependencies
node_modules/

# Local configuration & credentials
.env

# SQLite local databases
*.sqlite
*.db

# Build outputs
dist/

# MediaMTX binaries & SSL keys
mediamtx/mediamtx.exe
mediamtx/mediamtx
mediamtx/auto.crt
mediamtx/auto.key

# Local test & utility scripts
backend/db_check.js
backend/digestParserTest.js
backend/loginAndTest.js
backend/probe*.js
backend/rtsp*.js
backend/tcpTest.js
backend/test*.js
```

---

## ⚙️ How It Works (Stream Routing)

1. **On-Demand Streaming (`sourceOnDemand: true`):**
   MediaMTX is configured to only pull the RTSP stream from the local camera/DVR when a client actively accesses the web viewer. This saves up to **95%+ bandwidth** on the host network.
2. **WebRTC Web-Viewer (WHEP):**
   The browser UI connects to MediaMTX's WHEP (WebRTC HTTP Egress Protocol) endpoint to display sub-second latency video grids directly inside standard modern browsers without installing plugins.
