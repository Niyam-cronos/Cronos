# Local Setup (No Docker)

This is the recommended setup if you're **not using Docker**.

---

## Prerequisites

Install on Mac with Homebrew:

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
```

Optional — **pgAdmin desktop app** (GUI for PostgreSQL):
- Download from [pgadmin.org/download](https://www.pgadmin.org/download/)
- Or skip pgAdmin and use **Prisma Studio** instead (built-in, easier)

Optional — **Python 3.11+** for face recognition:
```bash
brew install python@3.11
```

---

## Step 1 — Create the database

```bash
# Connect to Postgres (default superuser is your Mac username)
psql postgres

# Inside psql, run:
CREATE USER cronos WITH PASSWORD 'cronos';
CREATE DATABASE cronos OWNER cronos;
GRANT ALL PRIVILEGES ON DATABASE cronos TO cronos;
\q
```

If `psql` is not found, add Postgres to your PATH:
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 2 — Configure environment

```bash
cd backend
cp .env.example .env
```

Your `backend/.env` should have:
```env
DATABASE_URL=postgresql://cronos:cronos@localhost:5432/cronos
REDIS_URL=redis://localhost:6379
FACE_SERVICE_URL=http://localhost:8000
WEB_URL=http://localhost:3000
```

```bash
cd ../frontend
cp .env.example .env
```

---

## Step 3 — Install dependencies & setup database

```bash
# From project root
npm run install:all

cd backend
npm run db:generate
npm run db:push      # creates all tables
npm run db:seed      # demo users, company, office location
```

---

## Step 4 — View your data

### Option A: Prisma Studio (easiest — no install needed)

```bash
cd backend
npm run db:studio
```

Open **http://localhost:5555** — browse and edit all tables.

### Option B: pgAdmin (desktop app)

1. Open **pgAdmin 4** (install from pgadmin.org if needed)
2. Right-click **Servers → Register → Server**
3. **General** → Name: `Cronos Local`
4. **Connection** tab:
   - Host: `localhost`
   - Port: `5432`
   - Username: `cronos`
   - Password: `cronos`
   - Database: `cronos`
5. Browse: `Servers → Cronos Local → Databases → cronos → Schemas → public → Tables`

### Option C: psql command line

```bash
psql postgresql://cronos:cronos@localhost:5432/cronos

# Example queries:
\dt                          -- list tables
SELECT email FROM users;     -- view users
\q                           -- quit
```

---

## Step 5 — Start all services

Open **4 terminals**:

```bash
# Terminal 1 — Backend API + email worker
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — Face recognition (Python)
cd face-recognition
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 4 — Mobile (optional)
cd mobile-app && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Face AI | http://localhost:8000/health |
| Prisma Studio | http://localhost:5555 |

---

## Demo logins (after seed)

| Email | Password | Role |
|-------|----------|------|
| admin@cronos.com | Admin@123 | Admin |
| hr@cronos.com | Hr@12345 | HR |
| employee@cronos.com | Employee@123 | Employee |

---

## File uploads (face images)

Face enrollment images are stored locally under `backend/uploads/`. The API serves them at `/uploads/...` when the backend is running.

---

## SMTP (emails)

Leave SMTP blank in dev — emails print in the backend terminal.

For real emails (Resend example):
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_your_api_key
SMTP_FROM=noreply@yourdomain.com
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `psql: command not found` | `brew install postgresql@16` and add to PATH |
| `connection refused` on 5432 | `brew services start postgresql@16` |
| `Redis connection error` | `brew services start redis` |
| `redis-cli ping` fails | `brew install redis && brew services start redis` |
| Emails not sending | Redis must be running; check backend logs |
| Face service error | Start Python service on port 8000 |
| Permission denied on DB | Re-run CREATE USER/GRANT commands above |

---

## Docker (optional — not required)

If you prefer Docker later, `docker-compose.yml` is available but **not needed** for local development.

```bash
docker compose up -d   # only if you want Docker later
```
