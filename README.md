# 💧 Droplet

<div align="center">

```
  ____                 _      _   
 |  _ \ _ __ ___  _ __ | | ___| |_ 
 | | | | '__/ _ \| '_ \| |/ _ \ __|
 | |_| | | | (_) | |_) | |  __/ |_ 
 |____/|_|  \___/| .__/|_|\___|\__|
                 |_|               
```

**Temporary Peer Sharing Without Accounts. Create a room. Drop anything. Pick it up anywhere. Let it disappear.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite)](https://www.sqlite.org/)
[![AWS S3](https://img.shields.io/badge/Storage-AWS_S3-FF9900?logo=amazons3)](https://aws.amazon.com/s3/)
[![Tests](https://img.shields.io/badge/Tests-40_Passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![Design](https://img.shields.io/badge/Style-Neo--Brutalist-FFE000)](https://github.com/idi01-git/Droplet)

[Live Demo](https://droplet-web.onrender.com) • [Key Features](#-key-features) • [Architecture](#-architecture--tiered-storage) • [Quick Start](#-quick-start) • [API & WebSocket](#-api--websocket-protocol) • [Deployment](#-production-deployment) • [AWS Cost Protection](#-aws-cost-protection--kill-switch)

</div>

---

## 📖 Overview

**Droplet** solves the everyday friction of transferring terminal commands, code snippets, links, photos, and documents between devices—such as your personal laptop, a borrowed workstation, or a university lab PC—without logging into personal email, Slack, Discord, or messaging accounts on untrusted machines.

Users simply open a room, share a memorable **4-digit numeric code** (or QR code), drop items in real-time, and download what they need. Everything strictly self-destructs after **24 hours**.

---

## ✨ Key Features

- ⚡ **Zero Logins, Zero Friction:** No passwords, emails, or phone numbers required. Instant access from any browser.
- 🔢 **Memorable 4-Digit Room Codes:** Human-friendly codes (`0000`–`9999`) backed by high-entropy 64-character bearer tokens and exponential rate-limiting lockout against brute-force attacks.
- 🔄 **Real-Time WebSocket Sync:** Realtime broadcast powered by `ws`. Items appear across all connected peer devices without polling.
- 🗄️ **Hybrid Tiered Storage:** Text notes and metadata stay in SQLite on Render; files stream directly to AWS S3 (or Cloudflare R2), preventing server out-of-memory crashes while keeping compute costs minimal.
- 📦 **One-Click "Download All" ZIP:** Generates a clean archive (up to 200 MiB) on the fly with collision-free filenames and a compiled `room-notes.txt`.
- ⏳ **Guaranteed 24-Hour Self-Destruction:** All rooms and objects are automatically purged from database and cloud storage after 24 hours.
- 👑 **Granular Role Permissions:** Room creators hold cryptographic owner sessions enabling instant room deletion and token revocation. Joiners can delete their own uploaded items without touching others' content.
- 🎨 **Neo-Brutalist Aesthetic:** Vibrant `#FFE000` yellow, tactile `4px 4px 0 #000` drop shadows, bold `2.5px` black borders, and playful micro-animations.
- 📱 **Mobile-First Responsive UI:** Custom single-row Master Control Deck (`RoomInfoBar`) tailored with balanced spacing across all screen sizes (including iPhone 16 / Android).
- 💧 **Custom 404 Mascot Experience:** Dedicated 404 poster page featuring Droplet's confused mascot holding a wooden sign, optimized via a 38.7 KB WebP asset.

---

## 🏗️ Architecture & Tiered Storage

Droplet utilizes a high-performance **hybrid architecture** that balances low operating cost, zero memory leaks, and high throughput:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                │
│          React 18 + TypeScript + Vite + Vanilla CSS Neo-Brutalist       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ HTTPS REST API                  │ WSS Realtime Sync
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              SERVER TIER                                │
│                     Node.js + Express (Render.com)                      │
│                                                                        │
│  • SQLite (WAL mode): Rooms, sessions, text items, quotas, rate limits  │
│  • Background Worker: 60s periodic expiry & orphan cleaner             │
│  • WebSocket Hub: Broadcasts real-time events to room peers            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   │ S3 SDK Streaming
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             STORAGE TIER                                │
│                       AWS S3 / Cloudflare R2                            │
│                                                                        │
│  • Bucket: droplet-s3-idi01 (ap-south-1)                               │
│  • Streaming Uploads / Downloads (No memory buffering)                 │
│  • Lifecycle Rule: 48-Hour Automatic S3 Purge (Zero maintenance)      │
└────────────────────────────────────────────────────────────────────────┘
```

### Why Tiered Storage?
- **Render RAM Safety:** Render's free tier provides 512 MB RAM. Streaming multi-megabyte files directly through server memory would cause Out-Of-Memory (OOM) fatal crashes under concurrent traffic. By piping files directly to S3, server RAM usage stays flat (< 45 MB).
- **Cost Minimization:** Text notes and links stay in SQLite on Render with zero S3 API charges. Only binary files reach S3, where storage is billed at $0.023/GB/month and auto-purged every 48 hours.

---

## ⚙️ Application Quotas & Limits

All quotas are strictly centralized in [`shared/limits.ts`](file:///d:/Web%20Dev%202/Droplet/shared/limits.ts) and enforced server-side:

| Parameter | Limit | Security Rationale |
| :--- | :--- | :--- |
| **Room Lifetime** | `24 Hours` | Strict auto-destruction; non-extendable |
| **Room Code Format** | `4 digits` | `0000`–`9999` with constant-time verification |
| **Max Files Per Room** | `20 files` | Prevents denial-of-service storage exhaustion |
| **Max Single File Size** | `50 MiB` | Fast uploads without blocking pipe bandwidth |
| **Max Room Storage** | `200 MiB` | Total cumulative file payload per room |
| **Max Text Note Length** | `100 KiB` | Prevents memory abuse on text clips |
| **Concurrent Uploads** | `2 per room` | Bounded upload stream reservations |
| **Failed Join Lockout** | `5 attempts` | 5-minute lockout against code brute-forcing |
| **Room Creation Rate** | `5 rooms / 10m` | Per-IP throttling against scripted room spam |
| **Upload Rate Limit** | `5 files / min` | Per-IP burst control |
| **S3 Lifecycle Purge** | `2 Days` | AWS auto-deletes orphaned files from bucket |

---

## 🎨 Visual Design System (Neo-Brutalism)

Droplet features a signature neo-brutalist design system defined in [`src/index.css`](file:///d:/Web%20Dev%202/Droplet/src/index.css):

| Color Token | Hex Code | Visual Role |
| :--- | :--- | :--- |
| `--color-primary` | `#FFE000` | Bright electric yellow for hero badges, buttons, active states |
| `--color-ink` | `#000000` | High-contrast text, borders, and tactile drop shadows |
| `--color-background`| `#FFFDF0` | Warm cream canvas background |
| `--color-surface` | `#FFFFFF` | Crisp white cards and input containers |
| `--color-accent` | `#FFF8B8` | Light yellow accent for countdown chips and tags |
| `--color-error` | `#FF6B6B` | Destructive actions, delete room, alerts |
| `--color-success` | `#00D084` | Live sync indicators and copy confirmations |

- **Display Typography:** `Fredoka` & `Outfit` (bold, chunky, rounded display headers)
- **Body Typography:** `Inter` (high-clarity modern sans-serif)
- **Borders:** `2px solid #000000` (standard) / `2.5px solid #000000` (cards and master bars)
- **Tactile Shadows:** Hard offset `4px 4px 0px #000000` with `:active` button translation (`translate(2px, 2px)`)

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- **Git**

### 2. Clone and Install
```bash
git clone https://github.com/idi01-git/Droplet.git
cd Droplet
npm install
```

### 3. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

Configure your `.env`:
```ini
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Storage Driver: 'local' (filesystem) or 's3' (AWS S3 / Cloudflare R2)
STORAGE_DRIVER=local
DATA_DIR=./data
UPLOAD_DIR=./uploads

# Required if STORAGE_DRIVER=s3
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=droplet-s3-idi01
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
# AWS_ENDPOINT=  # Optional: only for MinIO or Cloudflare R2
```

### 4. Run Locally
Start both backend (port 3001) and frontend Vite dev server (port 5173) concurrently:
```bash
npm run dev
```

- Open Client: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Test 404 Page: `http://localhost:5173/404`

### 5. Run the Automated Test Suite
Run the 40 automated unit, integration, and E2E tests:
```bash
npm test
```

---

## 📡 API & WebSocket Protocol

### Room Management
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rooms` | Create a new room; returns room object, 4-digit code, and owner bearer token | None |
| `POST` | `/api/rooms/join` | Join room via 4-digit numeric code; returns participant bearer token | Rate-limited |
| `GET` | `/api/rooms/:roomId` | Retrieve room status, item list, and participant role | Bearer Token |
| `DELETE`| `/api/rooms/:roomId` | Owner-only room deletion; instantly revokes all participant sessions | Owner Bearer |
| `GET` | `/api/rooms/:roomId/download-all` | Stream all room notes & files as a single ZIP archive | Bearer Token |

### Sharing Items & Streaming Uploads
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rooms/:roomId/items/text` | Post text note, URL, or code snippet (max 100 KiB) | Bearer Token |
| `DELETE`| `/api/rooms/:roomId/items/:itemId` | Delete an item (allowed for item author or room owner) | Bearer Token |
| `POST` | `/api/rooms/:roomId/uploads/initiate` | Phase 1: Atomically validate and reserve file capacity | Bearer Token |
| `POST` | `/api/rooms/:roomId/uploads/:uploadId/complete` | Phase 2: Stream file payload to S3 and commit metadata | Bearer Token |
| `GET` | `/api/rooms/:roomId/items/:itemId/download` | Stream binary file download directly from storage provider | Bearer Token |

### WebSocket Protocol (`/ws?token=<bearerToken>&roomId=<roomId>`)
- Connection handshake validates the session token against SQLite.
- **Events Broadcasted:**
  - `ITEM_ADDED`: Sent when notes, links, or files are posted.
  - `ITEM_DELETED`: Sent with `itemId` when an item is removed.
  - `ROOM_DELETED`: Sent when the owner deletes the room.
  - `ROOM_EXPIRED`: Sent when the 24-hour lifetime terminates.

---

## ☁️ Production Deployment

### Option A: Render (Unified Fullstack Blueprint) — *Recommended*
Droplet includes a configured [`render.yaml`](file:///d:/Web%20Dev%202/Droplet/render.yaml) blueprint:
1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Select your repository. Render automatically builds the React frontend and starts the Node.js server.
4. Set your Environment Secrets in Render:
   - `STORAGE_DRIVER`: `s3`
   - `AWS_REGION`: `ap-south-1`
   - `AWS_BUCKET_NAME`: `your-bucket-name`
   - `AWS_ACCESS_KEY_ID`: `your-access-key`
   - `AWS_SECRET_ACCESS_KEY`: `your-secret-key`
5. **Keep-Alive (Prevent Free Tier Sleep):**
   - Use [UptimeRobot](https://uptimerobot.com) to ping `https://your-droplet.onrender.com/api/health` every 10 minutes.

### Option B: Docker Container
Run Droplet anywhere with Docker:
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

## 🛡️ AWS Cost Protection & Kill Switch

To guarantee your AWS S3 usage stays strictly within budget (e.g. **$2.00 max**), configure **AWS Budgets with an Automated Kill Switch**:

1. **Create Cost Budget:**
   - Go to **AWS Console** -> **Billing and Cost Management** -> **Budgets** -> **Create budget**.
   - Select **Cost budget**, name it `Droplet-Budget`, set period to **Monthly**, and amount to **`$2.00`**.
2. **Set Email Alerts:**
   - Alert 1: Actual spend reaches **80%** ($1.60).
   - Alert 2: Actual spend reaches **100%** ($2.00).
   - Alert 3: Forecasted spend breaches **100%**.
3. **Attach Automated Kill Switch Action:**
   - Under **Attach Actions**, choose trigger **100% of budgeted amount ($2.00)**.
   - Select **IAM Policy** -> Choose your IAM user (`droplet-s3-uploader`).
   - Attach an inline Deny policy:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "EmergencyS3StopOnBudgetBreach",
           "Effect": "Deny",
           "Action": ["s3:PutObject", "s3:PutObjectAcl"],
           "Resource": "arn:aws:s3:::your-bucket-name/*"
         }
       ]
     }
     ```
   - Check **"Automatically execute this action when the budget threshold is breached"**.
4. **S3 2-Day Lifecycle Purge:**
   - The S3 bucket automatically purges all objects older than 2 days via bucket lifecycle rules, preventing cumulative storage accumulation.

---

## 📂 Project Directory Structure

```
Droplet/
├── assets/                    # Brand assets, high-res mascots, and logos
├── public/                    # Static assets (favicons, manifest, robots.txt, 404 WebP)
│   └── assets/
│       ├── 404_Mascot.webp    # 38.7 KB optimized hero mascot
│       └── Horizontal_Logo.webp
├── server/                    # Node.js + Express backend
│   └── src/
│       ├── db/                # SQLite database and schema migrations
│       ├── middleware/        # Auth, rate-limiting, error handling
│       ├── routes/            # REST endpoints (rooms, items, uploads)
│       ├── services/          # S3 storage, realtime WebSocket, cleanup worker
│       └── utils/             # Cryptographic hashing & token generator
├── shared/                    # Shared TypeScript types & limits
│   ├── limits.ts              # Centralized limits & security constants
│   └── types.ts               # Universal DTOs & WebSocket events
├── src/                       # Frontend React application
│   ├── components/            # Neo-brutalist UI primitives & icons
│   │   ├── brand/             # Droplet logos, SVG mascot animations
│   │   ├── icons/             # Custom neo-brutalist SVG icon library
│   │   └── ui/                # RoomInfoBar, Navbar, Cards, Buttons, MessageBubbles
│   ├── hooks/                 # useRoomSync (WebSocket client)
│   ├── services/              # API client, RecentRooms localStorage
│   ├── views/                 # HomeView, RoomView, ExpiredView, NotFoundView
│   ├── App.tsx                # Client-side router & session manager
│   ├── index.css              # Neo-brutalist design tokens & media queries
│   └── main.tsx               # Application entry point
├── tests/                     # Automated Vitest test suites (40 tests)
├── render.yaml                # Render Blueprint deployment definition
└── package.json               # Dependencies and scripts
```

---

## 🧪 Testing

Droplet includes comprehensive automated test coverage covering database security, race-condition quota reservations, lifecycle expiries, ZIP generation, and WebSocket synchronization:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Suites:**
- `tests/limits.test.ts` — Validates centralized limits and constraints.
- `tests/db_security.test.ts` — SQL injection resistance and foreign key cascades.
- `tests/health.test.ts` — System health and uptime reporting.
- `tests/room_lifecycle.test.ts` — 24-hour expiration and owner deletion.
- `tests/uploads_quota.test.ts` — Two-phase reservation and byte ceiling enforcement.
- `tests/zip_cleanup.test.ts` — ZIP streaming archive bounded memory budget.
- `tests/items_realtime.test.ts` — WebSocket broadcast and real-time deletion.
- `tests/e2e_journey.test.ts` — Complete end-to-end peer sharing lifecycle.

---

## 🤝 Contributing

Contributions are warmly welcomed! Please follow these steps:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Ensure all tests pass (`npm test && npx tsc --noEmit`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information. Built for seamless, private, and temporary peer transfers.
