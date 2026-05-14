# Zusim Inventory Management System

Full-stack paint bucket inventory tracker with unique internal IDs, inbound labelling, outbound scanning, and label printing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | Supabase PostgreSQL via Prisma ORM |
| Printing | Zebra Browser Print / QZ Tray (abstracted) |

---

## Project Structure

```
ZusimManagment/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express entry point
│   │   ├── db.js                 # Prisma client singleton
│   │   ├── routes/
│   │   │   ├── products.js
│   │   │   ├── batches.js
│   │   │   ├── units.js
│   │   │   ├── scan.js
│   │   │   └── dashboard.js
│   │   └── utils/
│   │       └── idGenerator.js    # HP-YYYY-NNNNNN ID generation
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── api.js                # Centralised API client
│   │   ├── printing.js           # ZPL + Browser Print wrapper
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Feedback.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Products.jsx
│   │       ├── Inbound.jsx
│   │       ├── ScanPage.jsx      # ScanOut + ScanIn
│   │       └── Units.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── prisma/
│   └── schema.prisma
└── printing/
    ├── zplGenerator.js           # ZPL string builder
    ├── browserPrint.js           # Zebra Browser Print impl
    ├── qzTray.js                 # QZ Tray impl
    └── printService.js           # Unified print wrapper
```

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 running locally (or a hosted instance)
- A Zebra printer + [Browser Print](https://www.zebra.com/us/en/support-downloads/printer-software/browser-print.html) **or** [QZ Tray](https://qz.io) installed (for physical label printing)

---

## Quick Start

### 1 — Database

Create a PostgreSQL database:

```sql
CREATE DATABASE zusim_inventory;
```

### 2 — Backend

```bash
cd backend

# Copy and fill in your credentials
copy .env.example .env
# Edit .env: set DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/zusim_inventory

npm install

# Point Prisma at the prisma/ folder and generate the client
npx prisma generate --schema=../prisma/schema.prisma
npx prisma migrate dev --schema=../prisma/schema.prisma --name init

npm run dev
# → API running at http://localhost:3001
```

> **Tip**: add `"prisma": { "schema": "../prisma/schema.prisma" }` to `backend/package.json` if you want
> `npx prisma` commands to work without the `--schema` flag.

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
# → UI running at http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

**backend/.env**

```env
# Runtime DB URL (Supabase pooled URL recommended in production)
DATABASE_URL="postgresql://postgres:password@localhost:5432/zusim_inventory"

# Direct DB URL for Prisma migrate commands
DIRECT_URL="postgresql://postgres:password@localhost:5432/zusim_inventory"

PORT=3001
NODE_ENV=development
FRONTEND_URLS="http://localhost:5173,https://your-site.netlify.app"
```

**frontend/.env**

```env
# Local dev: optional (uses /api proxy by default)
VITE_API_BASE_URL="https://your-backend-domain.com"

# Required to unlock Manager role in Role Selector
VITE_MANAGER_PASSWORD="change-me"
```

---

## Deployment (Netlify + Supabase)

### 1. Supabase project setup

1. Create a new Supabase project.
2. In Supabase dashboard, copy:
: Pooler connection string (port `6543`) for `DATABASE_URL`
: Direct connection string (port `5432`) for `DIRECT_URL`
3. Ensure both include `sslmode=require`.

### 2. Backend deployment configuration

Deploy the `backend` service on your Node host of choice and set:

- `DATABASE_URL` = Supabase pooled URL
- `DIRECT_URL` = Supabase direct URL
- `FRONTEND_URLS` = your Netlify site URLs (comma-separated)
- `NODE_ENV=production`

Run migrations on deploy (or once manually):

```bash
npx prisma migrate deploy
```

### 3. Netlify frontend deployment

Deploy the `frontend` folder to Netlify with:

- Build command: `npm run build`
- Publish directory: `dist`
- Env var: `VITE_API_BASE_URL=https://your-backend-domain.com`

The repo already includes `frontend/netlify.toml` for SPA routing.

### 4. Oracle VM frontend auto-deploy (GitHub Actions)

If your frontend is hosted on Oracle VM (`/var/www/zusim` + Nginx), this repository includes a workflow at `.github/workflows/deploy-oracle-frontend.yml` that automatically deploys on each push to `master` when files under `frontend/` change.

One-time setup in GitHub repository settings:

1. Go to **Settings -> Secrets and variables -> Actions -> New repository secret**.
2. Add these secrets:
    - `ORACLE_HOST` = your Oracle public IP (example: `158.180.31.164`)
    - `ORACLE_USER` = `ubuntu`
    - `ORACLE_SSH_KEY` = private key contents used for SSH (full key text)
    - `ORACLE_PORT` = `22` (optional but recommended)

One-time setup on the Oracle VM:

1. Ensure the app is cloned at `~/app` and tracks the same GitHub repo.
2. Ensure Node/NPM are installed and `npm ci` works in `~/app/frontend`.
3. Allow passwordless sudo for deploy commands used by the workflow (`mkdir`, `rm`, `cp`, `nginx -t`, `systemctl reload nginx`) or configure equivalent permissions for the deploy user.

What the workflow does on each deploy:

1. `git pull --ff-only origin master`
2. `cd frontend && npm ci && npm run build`
3. Copies `frontend/dist/*` to `/var/www/zusim/`
4. Validates and reloads Nginx

You can also run it manually from GitHub via **Actions -> Deploy Frontend To Oracle -> Run workflow**.

---

## API Reference

All endpoints are prefixed with `http://localhost:3001` (or `/api` from the frontend via Vite proxy).

### Products

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| `GET` | `/products` | — | List all products |
| `POST` | `/products` | `{ name, manufacturer_barcode?, size? }` | Create product |
| `GET` | `/products/:id` | — | Get single product |

### Batches

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| `GET` | `/batches` | `?product_id=` | List batches |
| `POST` | `/batches` | `{ product_id, delivery_date, notes? }` | Create batch |

### Units

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| `POST` | `/units/generate` | `{ batch_id, quantity, location? }` | Generate N units |
| `GET` | `/units` | `?product_id=&batch_id=&status=&page=&limit=` | List units |
| `GET` | `/units/:id` | — | Get single unit + scan history |

### Scanning

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/scan/out` | `{ unit_id, note? }` | Mark unit as OUT |
| `POST` | `/scan/in` | `{ unit_id, note? }` | Mark unit as IN |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard` | Counts + recent scans |

---

## Printing Setup

### Option A — Zebra Browser Print (recommended for simple setups)

1. Install [Zebra Browser Print](https://www.zebra.com/us/en/support-downloads/printer-software/browser-print.html) on each workstation.
2. Uncomment the `<script>` tag for BrowserPrint in `frontend/index.html`.
3. In the browser, the app calls `window.BrowserPrint.getDefaultDevice(...)` to find the printer.

### Option B — QZ Tray

1. Install [QZ Tray](https://qz.io/download/) on each workstation.
2. `cd frontend && npm install qz-tray`
3. In `frontend/src/printing.js`, import from `qz-tray` and call `printWithQzTray(zpl)`.
4. Set `window.__PRINT_BACKEND__ = 'qz'` in `frontend/src/main.jsx` before the app mounts.

---

## ID Format

Units are assigned sequential IDs in the format:

```
HP-{YEAR}-{6-DIGIT-SEQUENCE}
```

Examples:
- `HP-2026-000001`
- `HP-2026-000042`
- `HP-2027-000001` (resets per year)

The sequence is tracked in the `id_counters` table and incremented atomically using Prisma `upsert`.

---

## Scan Workflow (Outbound)

1. Navigate to **Scan Out**.
2. The input field auto-focuses.
3. Scan a label with a barcode/QR scanner (or type the ID).
4. Press **Enter** — the unit is immediately marked `OUT`.
5. Success / error / duplicate feedback appears instantly below the input.
6. Input clears and re-focuses for the next scan.

---

## Error Codes

| Code | Meaning |
|------|---------|
| `UNIT_NOT_FOUND` | Scanned ID does not exist in the database |
| `ALREADY_OUT` | Unit was already scanned out |
| `ALREADY_IN` | Unit is already in stock (on scan-in) |
| `SERVER_ERROR` | Unexpected server error |

---

## Optional Enhancements (not yet implemented)

- **Authentication** — add JWT middleware to all API routes
- **Location field** — units table already has a `location` column; expose it in the UI
- **Batch filtering** on Inbound page
- **Export to CSV** on the Units page
- **Offline mode** — queue scans in IndexedDB when the network is down, sync on reconnect
