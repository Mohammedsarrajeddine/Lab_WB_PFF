# Production Deployment Guide — PFF Lab

**Date:** 2026-04-08
**Stack:** FastAPI + React 19 + PostgreSQL/pgvector + Caddy + Docker Compose
**Target:** Single Linux server with auto-TLS

---

## 1. Final Production Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Linux Server (Ubuntu 22.04+)              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Docker Compose                                          │    │
│  │                                                          │    │
│  │  ┌─────────┐    ┌───────────┐    ┌──────────────────┐   │    │
│  │  │  Caddy   │───▶│  frontend  │    │     backend      │   │    │
│  │  │  :80/:443│    │  (nginx)  │    │  (uvicorn×2)     │   │    │
│  │  │  auto-TLS│───▶│  :80      │    │  :8000           │   │    │
│  │  └─────────┘    └───────────┘    └────────┬─────────┘   │    │
│  │       │              ▲                     │             │    │
│  │       │         frontend_net          backend_net        │    │
│  │       │                                    │             │    │
│  │       └──── /api/* ───────────────────────▶│             │    │
│  │                                            │             │    │
│  │                                    ┌───────▼─────────┐   │    │
│  │                                    │   PostgreSQL 18  │   │    │
│  │                                    │   + pgvector     │   │    │
│  │                                    │   :5432          │   │    │
│  │                                    └─────────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Volumes: pgdata, caddy_data (TLS certs), caddy_config           │
│  Backups: ~/app/backups/ (rotated, last 7)                       │
└──────────────────────────────────────────────────────────────────┘
```

### Key design decisions

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Reverse proxy** | Caddy 2 | Auto-TLS, zero-config HTTPS, HTTP/3, simpler than nginx for single-server |
| **Frontend serving** | nginx:alpine inside container | Gzip, immutable asset caching, SPA fallback — replaces `vite preview` |
| **TLS** | Let's Encrypt via Caddy | Automatic provisioning + renewal, no certbot cron |
| **Container networking** | 2 bridge networks | `frontend_net` (caddy ↔ frontend), `backend_net` (caddy ↔ backend ↔ db). DB is never reachable from frontend |
| **Database** | In-compose PostgreSQL | Single server; no managed DB needed. `pgdata` volume persists across deploys |
| **Workers** | Uvicorn ×2 | Configurable via `UVICORN_WORKERS`. APScheduler runs in-process |
| **Logs** | Docker json-file driver | Rotated (20MB × 5 for backend, 5MB × 3 for frontend). View via `docker compose logs` |

---

## 2. What Changed From Previous Version

| Area | Before (❌) | After (✅) |
|------|------------|-----------|
| **Frontend production** | `vite preview` (dev tool, no gzip, no caching) | `nginx:1.27-alpine` with gzip, immutable asset headers, SPA fallback |
| **Reverse proxy** | None — ports exposed directly | Caddy with auto-TLS, HSTS, security headers |
| **Database in prod compose** | Missing — no `db` service | Full PostgreSQL + pgvector with healthcheck, memory limit, named volume |
| **Network isolation** | Flat — all services on default bridge | Two networks: `frontend_net` + `backend_net`. DB unreachable from frontend |
| **Entrypoint** | Seeds demo data on every restart | Demo seed gated behind `SEED_DEMO_DATA=true`, workers configurable |
| **Deploy script** | Pull + up (no backup, no health wait) | Pre-deploy backup, health wait with 90s timeout, image tag persistence |
| **Healthcheck** | HTTP-only (no DB) | `SELECT 1` DB probe, returns `degraded` if DB unreachable |
| **Backup** | None | `backup-db.sh` with gzip + 7-day rotation |
| **Rollback** | None | `rollback.sh` — re-deploys a previous image tag with pre-rollback backup |
| **CD pipeline** | Uploaded only compose + deploy script | Now uploads Caddyfile + all ops scripts, targets `runtime` stage for frontend |

---

## 3. Deployment Topology

### 3.1 Server OS & prerequisites

- **OS:** Ubuntu 22.04 LTS (or 24.04)
- **Requirements:** Docker Engine ≥ 24, Docker Compose V2 plugin, `git` (optional)
- **Firewall:** Open ports 80 (HTTP→redirect), 443 (HTTPS), 22 (SSH)
- **DNS:** A record pointing your domain → server IP

### 3.2 Domain routing (Caddy)

| Path pattern | Destination | Notes |
|-------------|-------------|-------|
| `/api/*` | `backend:8000` | FastAPI API |
| `/webhook*` | `backend:8000` | WhatsApp webhooks |
| Everything else | `frontend:80` | React SPA (nginx) |

### 3.3 Container networking

```
frontend_net:  caddy ↔ frontend (nginx)
backend_net:   caddy ↔ backend (uvicorn) ↔ db (postgres)
```

- **DB is only on `backend_net`** — no external exposure, no port mapping
- Caddy bridges both networks to route traffic

### 3.4 Persistent volumes

| Volume | Contents | Backup? |
|--------|----------|---------|
| `pgdata` | PostgreSQL data directory | ✅ via `backup-db.sh` |
| `caddy_data` | TLS certificates + OCSP staples | ❌ (auto-reprovisions) |
| `caddy_config` | Caddy runtime config | ❌ |

---

## 4. Database Operations

### 4.1 Migration workflow

Alembic runs automatically on every container start via `entrypoint.sh`:

```bash
alembic upgrade head  # idempotent — skips if already at head
```

**Creating a new migration (local dev):**
```bash
cd fastapi_app
alembic revision --autogenerate -m "description"
```

The migration file ships with the backend Docker image. On next deploy, `entrypoint.sh` applies it before uvicorn starts.

### 4.2 Backup strategy

**Automated pre-deploy backups:** `deploy-compose.sh` calls `backup-db.sh` before every deploy.

**Manual backup:**
```bash
cd ~/app
./scripts/deploy/backup-db.sh ./backups
```

- Format: `pff_lab_YYYYMMDD_HHMMSS.sql.gz`
- Rotation: keeps last 7 backups, deletes older
- Uses `pg_dumpall --clean` for full cluster dump

**Recommended cron (daily at 3am):**
```bash
crontab -e
# Add:
0 3 * * * cd /home/deploy/app && ./scripts/deploy/backup-db.sh ./backups >> ./backups/cron.log 2>&1
```

### 4.3 Restore procedure

```bash
cd ~/app
./scripts/deploy/restore-db.sh ./backups/pff_lab_20260408_030000.sql.gz
```

This will:
1. Stop the backend (prevent writes)
2. Pipe the dump into PostgreSQL via `psql --single-transaction`
3. Restart the backend

### 4.4 Rollback limitations

| Scenario | Supported? | Notes |
|----------|-----------|-------|
| Rollback app images (no migration) | ✅ Full | `rollback.sh <tag>` |
| Rollback after additive migration (new column/table) | ⚠️ Partial | Old code ignores new columns — works if columns are nullable |
| Rollback after destructive migration (dropped column) | ❌ | Must `alembic downgrade -1` before rolling back images, or restore from backup |
| Data rollback | ✅ | Restore from pre-deploy backup |

**Rollback command:**
```bash
cd ~/app
./scripts/deploy/rollback.sh sha-abc123def456
```

---

## 5. Secrets Handling

### 5.1 GitHub Secrets (for CI/CD pipeline)

| Secret | Purpose |
|--------|---------|
| `DEPLOY_SSH_PRIVATE_KEY` | Ed25519 key for SSH to server |
| `DEPLOY_SSH_HOST` | Server IP or hostname |
| `DEPLOY_SSH_PORT` | SSH port (default 22) |
| `DEPLOY_SSH_USER` | Linux user (e.g. `deploy`) |
| `DEPLOY_APP_DIR` | Absolute path on server (e.g. `/home/deploy/app`) |
| `GHCR_USERNAME` | GitHub username for GHCR pull |
| `GHCR_READ_TOKEN` | PAT with `read:packages` scope |
| `FRONTEND_PUBLIC_API_URL` | Public API URL (e.g. `https://lab.example.com`) |

### 5.2 Server-only secrets (`.env.production`)

These **never** go into GitHub Secrets or version control:

- `POSTGRES_PASSWORD`
- `AUTH_SECRET_KEY`
- `AUTH_INITIAL_OPERATOR_PASSWORD`
- `WHATSAPP_APP_SECRET` / `WHATSAPP_ACCESS_TOKEN`
- `GROQ_API_KEY` / `GEMINI_API_KEY`

### 5.3 Creating `.env.production` safely

```bash
# On the server, first deploy only:
ssh deploy@your-server
cd ~/app

# Copy template
cp .env.production.example .env.production

# Edit with real values
nano .env.production

# Lock permissions (readable only by owner)
chmod 600 .env.production
```

**Never commit `.env.production`.** The `.gitignore` already excludes `.env.*` files.

---

## 6. Observability

### 6.1 Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Backend only (last 100 lines)
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Caddy access logs (inside volume)
docker compose -f docker-compose.prod.yml exec caddy cat /data/access.log
```

Logs are rotated by the Docker `json-file` driver (configured in compose).

### 6.2 Health checks

| Service | Endpoint / Command | Interval | Healthy response |
|---------|-------------------|----------|-----------------|
| **backend** | `GET /api/v1/health` | 30s | `{"status":"ok","db_connected":true}` |
| **frontend** | `wget http://127.0.0.1:80/` | 30s | HTTP 200 |
| **db** | `pg_isready -U pff` | 10s | exit 0 |
| **caddy** | `wget http://127.0.0.1:2019/config/` | 30s | HTTP 200 (admin API) |

**Manual check from outside:**
```bash
curl -s https://lab.example.com/api/v1/health | python3 -m json.tool
```

### 6.3 Restart policies

All services use `restart: unless-stopped`. This means:
- Auto-restart on crash
- Survive server reboot (Docker starts on boot)
- Only stop if explicitly `docker compose stop`

### 6.4 Error tracking

- **Backend:** Python `logging` module with `--log-level info`. Replace `print()` calls with `logger.*()` for proper level control.
- **Caddy:** Structured access logs to `/data/access.log` with rotation.
- **Optional:** Add Sentry (`pip install sentry-sdk[fastapi]`) for production error tracking with stack traces + alerting.

### 6.5 Uptime monitoring (free tier options)

| Service | What it does | Setup |
|---------|-------------|-------|
| **UptimeRobot** (free) | Pings `https://lab.example.com/api/v1/health` every 5min | Create account → add HTTP monitor |
| **Healthchecks.io** (free) | Monitors cron jobs (backup script) | Ping a URL at end of `backup-db.sh` |
| **Better Stack** (free tier) | Uptime + status page | Alternative to UptimeRobot |

---

## 7. File Inventory

### New files created

| File | Purpose |
|------|---------|
| `deploy/Caddyfile` | Caddy reverse proxy config with auto-TLS |
| `frontend-pff-lab/deploy/nginx.conf` | nginx config for SPA serving (gzip, cache, fallback) |
| `scripts/deploy/backup-db.sh` | Database backup with gzip + rotation |
| `scripts/deploy/restore-db.sh` | Database restore with safety prompts |
| `scripts/deploy/rollback.sh` | Image rollback with pre-rollback backup |

### Modified files

| File | Changes |
|------|---------|
| `frontend-pff-lab/Dockerfile` | Production stage now uses `nginx:1.27-alpine` instead of `vite preview` |
| `docker-compose.prod.yml` | Complete rewrite: added Caddy, db, networks, volumes, healthchecks, logging |
| `fastapi_app/entrypoint.sh` | Conditional demo seed, configurable workers, `set -euo pipefail` |
| `fastapi_app/app/api/routes/health.py` | Added DB connectivity check |
| `fastapi_app/app/schemas/health.py` | Added `db_connected` field |
| `.env.production.example` | Added DOMAIN, POSTGRES_*, UVICORN_WORKERS, SEED_DEMO_DATA |
| `.github/workflows/cd.yml` | Frontend targets `runtime` stage, uploads Caddyfile + all scripts |
| `scripts/deploy/deploy-compose.sh` | Pre-deploy backup, health wait, image tag persistence |

---

## 8. Server Setup — Exact Terminal Steps

### 8.1 First-time server setup (run once)

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Create deploy user
adduser deploy
usermod -aG docker deploy

# 3. Install Docker (Ubuntu)
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# 4. Setup SSH key for GitHub Actions
su - deploy
mkdir -p ~/.ssh
# Paste your deploy public key into authorized_keys
nano ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys

# 5. Create app directory
mkdir -p ~/app/backups

# 6. Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 7. Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 8.2 First deploy (run once after GitHub Actions pushes files)

```bash
ssh deploy@your-server
cd ~/app

# Create .env.production from template
cp .env.production.example .env.production
nano .env.production   # Fill in real secrets
chmod 600 .env.production

# Set the DOMAIN env var for Caddy
# (already in .env.production — Caddy reads it from the compose environment)

# First deploy with demo data
SEED_DEMO_DATA=true BACKEND_IMAGE=ghcr.io/you/repo/backend:sha-xxx \
  FRONTEND_IMAGE=ghcr.io/you/repo/frontend:sha-xxx \
  docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
curl -s https://your-domain.com/api/v1/health
```

### 8.3 Setup daily backup cron

```bash
crontab -e
# Add this line:
0 3 * * * cd /home/deploy/app && ./scripts/deploy/backup-db.sh ./backups >> ./backups/cron.log 2>&1
```

---

## 9. Windows 11 Local Testing Commands

Run these from PowerShell in the project root to validate before pushing.

### 9.1 Validate compose files

```powershell
# Validate dev compose
docker compose config

# Validate prod compose (needs env vars)
$env:BACKEND_IMAGE="test-backend:ci"; $env:FRONTEND_IMAGE="test-frontend:ci"; $env:POSTGRES_PASSWORD="test123"
docker compose -f docker-compose.prod.yml config
```

### 9.2 Build images locally

```powershell
# Build backend
docker build -t pff-backend:local ./fastapi_app

# Build frontend (production nginx target)
docker build --target runtime --build-arg VITE_API_BASE_URL=http://localhost:8000 -t pff-frontend:local ./frontend-pff-lab

# Verify frontend is nginx-based
docker run --rm pff-frontend:local nginx -v
```

### 9.3 Test production compose locally

```powershell
# Create a local .env.production for testing
Copy-Item .env.production.example .env.production
# Edit .env.production: set POSTGRES_PASSWORD, AUTH_SECRET_KEY, DOMAIN=localhost

# Set required env vars
$env:BACKEND_IMAGE="pff-backend:local"
$env:FRONTEND_IMAGE="pff-frontend:local"
$env:POSTGRES_PASSWORD="localtest123"

# Start prod stack (Caddy will use self-signed cert for localhost)
docker compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost/api/v1/health

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Tear down
docker compose -f docker-compose.prod.yml down -v
```

### 9.4 Test individual scripts (Git Bash on Windows)

```bash
# Validate deploy script syntax
bash -n scripts/deploy/deploy-compose.sh
bash -n scripts/deploy/backup-db.sh
bash -n scripts/deploy/rollback.sh
bash -n scripts/deploy/restore-db.sh
```

---

## 10. Pre-Production Staging Checklist

### Infrastructure
- [ ] Server provisioned (Ubuntu 22.04+, ≥2GB RAM, ≥20GB disk)
- [ ] Docker + Docker Compose V2 installed
- [ ] DNS A record pointing domain → server IP
- [ ] Firewall: ports 80, 443, 22 open
- [ ] `deploy` user created with Docker group access
- [ ] SSH key pair generated and public key in `~deploy/.ssh/authorized_keys`

### GitHub
- [ ] All GitHub Secrets configured (see §5.1)
- [ ] GitHub Environment `staging` created with required reviewers (optional)
- [ ] GitHub Environment `production` created with required reviewers
- [ ] GHCR read token (PAT with `read:packages`) created and stored

### Server configuration
- [ ] `~/app` directory created
- [ ] `.env.production` created from template with real values
- [ ] `.env.production` permissions set to `600`
- [ ] `DOMAIN` in `.env.production` matches DNS record
- [ ] `POSTGRES_PASSWORD` is strong (≥20 chars, random)
- [ ] `AUTH_SECRET_KEY` is strong (`openssl rand -hex 32`)
- [ ] `CORS_ORIGINS` matches `https://<your-domain>`
- [ ] `FRONTEND_PUBLIC_API_URL` GitHub Secret = `https://<your-domain>`

### First deploy verification
- [ ] `docker compose -f docker-compose.prod.yml ps` — all 4 services healthy
- [ ] `curl https://<domain>/api/v1/health` returns `{"status":"ok","db_connected":true}`
- [ ] Frontend loads at `https://<domain>/`
- [ ] Login works with initial operator credentials
- [ ] HTTPS certificate valid (check browser padlock)
- [ ] HTTP→HTTPS redirect works (`curl -I http://<domain>`)

### Operations
- [ ] Daily backup cron configured
- [ ] First manual backup tested: `./scripts/deploy/backup-db.sh ./backups`
- [ ] Restore tested on a disposable instance
- [ ] Rollback tested: deploy v2, rollback to v1
- [ ] `docker compose logs backend` shows clean startup (no errors)

### Security
- [ ] No `.env.production` in git history
- [ ] SSH password auth disabled on server (`PasswordAuthentication no`)
- [ ] `WHATSAPP_SIMULATION_MODE=false` in production
- [ ] `SEED_DEMO_DATA=false` in production
- [ ] `VITE_SHOW_SIMULATION` not set or `false` in frontend build
- [ ] Automatic OS security updates enabled

---

## 11. GitHub Secrets Quick Reference

```
DEPLOY_SSH_PRIVATE_KEY    = <ed25519 private key>
DEPLOY_SSH_HOST           = 203.0.113.10
DEPLOY_SSH_PORT           = 22
DEPLOY_SSH_USER           = deploy
DEPLOY_APP_DIR            = /home/deploy/app
GHCR_USERNAME             = your-github-username
GHCR_READ_TOKEN           = ghp_xxxxxxxxxxxxx
FRONTEND_PUBLIC_API_URL   = https://lab.example.com
```
