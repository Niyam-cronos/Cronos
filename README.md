# Cronos

**Workforce Attendance & HRMS** — enterprise HR management platform.

## Project Structure

```
cronos/
├── frontend/          Next.js web app
├── backend/           Express API + Prisma + PostgreSQL
├── mobile-app/        React Native Expo
├── face-recognition/  Python FastAPI (InsightFace)
└── docs/              Setup guides
```

## Quick Start (No Docker)

### 1. Install PostgreSQL & Redis (Mac)

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Create database
psql postgres -c "CREATE USER cronos WITH PASSWORD 'cronos';"
psql postgres -c "CREATE DATABASE cronos OWNER cronos;"
```

> Full guide: **[docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)**

### 2. Setup & seed database

```bash
npm run install:all
cd backend && cp .env.example .env
npm run db:generate && npm run db:push && npm run db:seed
```

### 3. Start services (3 terminals)

```bash
npm run dev:backend    # Terminal 1 — API :4000
npm run dev:frontend   # Terminal 2 — Web :3000
npm run face:dev       # Terminal 3 — Face AI :8000 (needs Python venv first)
```

Face recognition setup:
```bash
cd face-recognition
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Browse database

```bash
cd backend && npm run db:studio   # http://localhost:5555
```

Or use **pgAdmin desktop** — connect to `localhost:5432`, user `cronos`, db `cronos`.

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@cronos.com | Admin@123 | Admin |
| hr@cronos.com | Hr@12345 | HR |
| employee@cronos.com | Employee@123 | Employee |

## Environment Files

| Folder | File | Purpose |
|--------|------|---------|
| `frontend/` | `.env` | `NEXT_PUBLIC_API_URL` |
| `backend/` | `.env` | Database, JWT, Redis, SMTP |
| `mobile-app/` | `.env` | `EXPO_PUBLIC_API_URL` |

## Root Scripts

```bash
npm run dev:frontend
npm run dev:backend
npm run dev:mobile
npm run face:dev
npm run install:all
npm run db:push
npm run db:seed
npm run db:studio
```

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, TanStack Query
- **Backend:** Node.js, Express, Prisma, PostgreSQL, Redis, JWT, BullMQ
- **Mobile:** React Native, Expo
- **AI:** Python FastAPI + InsightFace (`face-recognition/`)
- **Storage:** Local filesystem (`backend/uploads/`, served at `/uploads`)

## API Endpoints

| Module | Base Path |
|--------|-----------|
| Auth | `/api/v1/auth` |
| Company | `/api/v1/company` |
| Masters | `/api/v1/masters` |
| Employees | `/api/v1/employees` |
| Attendance | `/api/v1/attendance` |
| Face | `/api/v1/face` |
| Leave | `/api/v1/leave` |
| Dashboard | `/api/v1/dashboard` |

## Milestones

| # | Status | Scope |
|---|--------|-------|
| 1–7 | ✅ | Foundation through dashboards |
| 8 | ✅ | Face recognition, SMTP, BullMQ, local file storage, GPS geofence |
| 9 | 🔜 | Full mobile app |
