# 💧 Droplet

> **Create a room. Drop anything. Pick it up anywhere. Let it disappear.**

Droplet is a lightweight, account-free, temporary, room-based sharing web application built with a playful **neo-brutalist** design. It allows users to quickly transfer text notes, terminal commands, code snippets, URLs, and files between devices (such as a personal laptop and a university lab computer) using a simple 4-digit code.

All shared rooms and uploads automatically expire and are purged from storage after **24 hours**.

---

## ✨ Key Features

- **No Logins or Accounts Required:** Instant access without password or email friction on shared public computers.
- **4-Digit Room Codes:** Simple, memorable 4-digit numeric codes with rate-limited brute-force lockout.
- **Real-Time WebSocket Sync:** Items appear instantly across all connected screens without aggressive polling.
- **Two-Phase Atomic Quota Reservations:** Prevents race conditions and storage overruns across concurrent uploads.
- **Bounded "Download All" ZIP:** Single-click archive generation (up to 200 MiB) with collision-free filenames and a compiled `room-notes.txt`.
- **Strict 24-Hour Expiry:** Immediate access denial at request time, accompanied by an automatic background physical purge.
- **Owner Control:** Room creators receive owner privileges to delete the room early, revoking all device sessions instantly.
- **Neo-Brutalist Aesthetic:** Vibrant `#FFE000` yellow, bold `#000000` strokes, tactile `4px 4px 0 #000` offset shadows, and custom Fredoka display typography.

---

## 🎨 Visual Design System

Droplet adheres to a strict neo-brutalist visual design language:

| Token | Value | Role |
| :--- | :--- | :--- |
| `--color-primary` | `#FFE000` | Bright yellow for primary actions, badges, and accents |
| `--color-ink` | `#000000` | High-contrast text, borders, and hard offset shadows |
| `--color-background` | `#FFFDE7` | Warm creamy canvas background |
| `--color-surface` | `#F5F3EA` | Neutral surface for secondary containers |
| `--color-surface-card` | `#FFFFFF` | Crisp white cards and inputs |
| `--color-error` | `#FF6B6B` | Error alerts and destructive actions |
| `--color-success` | `#00D084` | Success banners and confirmations |
| `--color-info` | `#3B82F6` | Links and informative notices |
| `--color-accent` | `#A855F7` | Owner role badge |

- **Headings Font:** `Fredoka` (playful, chunky display font)
- **UI / Body Font:** `Inter` (clean, highly legible sans-serif)
- **Borders:** `2px solid #000000` (standard) / `3px solid #000000` (panels and modals)
- **Tactile Shadows:** `4px 4px 0px #000000` with interactive `:active` pressed states (`translate(2px, 2px)`)

---

## ⚙️ Application Quotas & Limits

All quotas are centralized in [`shared/limits.ts`](file:///d:/Web%20Dev%202/Droplet/shared/limits.ts) and strictly enforced server-side:

| Setting | Limit | Purpose |
| :--- | :--- | :--- |
| **Room Lifetime** | 24 Hours | Non-extendable fixed expiration |
| **Room Code** | 4 decimal digits | 0000 - 9999 |
| **Files Per Room** | 20 files | Prevents bulk abuse |
| **Max File Size** | 50 MiB | Per individual file upload |
| **Max Room Storage** | 200 MiB | Total uploaded file bytes per room |
| **Text Item Size** | 100 KiB | Maximum note / snippet length |
| **Concurrent Uploads** | 2 per room | Bounded server resource allocation |
| **Download All Budget** | 200 MiB | Bounded archive generation |
| **Join Lockout** | 5 failed attempts | 5-minute lockout against brute-force |
| **Creation Rate Limit** | 5 rooms / 10 min | Per-IP room creation ceiling |
| **Circuit Breaker** | 2 GiB | Global storage ceiling |

---

## 🛠️ Technology Stack & Architecture

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Vanilla CSS Design Tokens (Neo-Brutalist)
- **Icons:** Lucide React
- **Backend API:** Node.js + Express + TypeScript
- **Database:** SQLite via `better-sqlite3` with WAL mode and foreign key cascades
- **Real-Time Channel:** `ws` (WebSocket) with room-based broadcast and ping/pong heartbeats
- **Storage Layer:** Abstract Storage Provider (Local Disk Driver + S3/R2 Adapter ready)
- **Archive Generation:** JSZip (bounded in-memory / streaming)
- **Testing:** Vitest + Supertest

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`

### 2. Installation
```bash
git clone https://github.com/your-username/droplet.git
cd droplet
npm install
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
STORAGE_DRIVER=local
DATA_DIR=./data
UPLOAD_DIR=./uploads
```

### 4. Running the Development Server
Starts both the frontend Vite dev server and the backend API server concurrently:
```bash
npm run dev
```
- Frontend UI: `http://localhost:5173`
- Backend API & WebSocket: `http://localhost:3001`

### 5. Running the Test Suite
Executes the full automated test suite (38 unit, integration, and E2E tests):
```bash
npm test
```

### 6. Production Build
```bash
npm run build
npm start
```

---

## 📡 REST API & WebSocket Reference

### Room Management
- `POST /api/rooms` — Create room and issue owner session.
- `POST /api/rooms/join` — Join active room with 4-digit code (rate-limited).
- `GET /api/rooms/:roomId` — Retrieve room metadata and unexpired items.
- `DELETE /api/rooms/:roomId` — Owner-only early room deletion.
- `GET /api/rooms/:roomId/download-all` — Download all files and notes as a single ZIP.

### Sharing & Files
- `POST /api/rooms/:roomId/items/text` — Share text snippet or link (max 100 KiB).
- `DELETE /api/rooms/:roomId/items/:itemId` — Delete item (author or owner).
- `POST /api/rooms/:roomId/uploads/initiate` — Phase 1: validate quotas and atomically reserve capacity.
- `POST /api/rooms/:roomId/uploads/:uploadId/complete` — Phase 2: upload file payload and commit capacity.
- `GET /api/rooms/:roomId/items/:itemId/download` — Authorized streaming file download.

### WebSocket Events (`/ws?token=...&roomId=...`)
- `ITEM_ADDED` — Emitted when a new note, link, or file is uploaded.
- `ITEM_DELETED` — Emitted when an item is removed.
- `ROOM_EXPIRED` — Emitted when a room reaches its 24-hour limit.
- `ROOM_DELETED` — Emitted when the owner deletes the room.

---

## ☁️ Deployment Instructions

### Option A: Render (Unified Fullstack Deployment) — *Recommended*
Deploy frontend, backend, WebSockets, and SQLite as a single unified service:
1. Push code to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint** and select your repository (it will automatically detect [`render.yaml`](file:///d:/Web%20Dev%202/Droplet/render.yaml)).
3. Render builds the React frontend and starts the Express + WebSocket server on a single URL (`https://your-droplet.onrender.com`).
4. **Prevent Free Tier Sleep with UptimeRobot (100% Free):**
   - Create a free account on [UptimeRobot](https://uptimerobot.com).
   - Add a new monitor:
     - **Monitor Type:** HTTP(s)
     - **Friendly Name:** Droplet Health
     - **URL:** `https://your-droplet.onrender.com/api/health`
     - **Monitoring Interval:** Every 5 to 10 minutes
   - UptimeRobot will ping the health endpoint externally, ensuring Render never spins down and alerting you if any outage occurs.

### Option B: Cloudflare (Pages + Workers + D1 + R2)
1. **Frontend:** Deploy `dist` to **Cloudflare Pages**.
2. **API:** Port `server/src` to **Cloudflare Workers** using the D1 database binding (`env.DB`) and R2 bucket binding (`env.BUCKET`).
3. **Cron Trigger:** Configure `wrangler.toml` scheduled trigger (`*/5 * * * *`) calling `CleanupService.purgeExpiredRooms()`.
4. **Environment Variables:** Set secrets in Cloudflare Dashboard: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `BUCKET_NAME`.

### Option C: Docker / Node Server
Droplet runs standalone with zero external dependencies (built-in SQLite and local storage driver):
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 📄 License
MIT License. Built for seamless, private, and temporary transfers.
