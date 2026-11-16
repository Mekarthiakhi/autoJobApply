# 🚀 Production Deployment & Operations Runbook

## Pre-Deployment Security & Readiness Checklist

- [x] Human-in-the-Loop submission safety strictly enforced (`controlledBrowserAgent.ts`)
- [x] Cryptographic draft hash binding (SHA-256) and 24h expiration TTL enabled
- [x] Multi-agent orchestration and explainable scoring verified
- [x] Single-pass query optimization and database indexes applied
- [ ] Set strong, unique `JWT_SECRET` (minimum 32 random characters) in production
- [ ] Configure `CORS_ORIGIN` to your production frontend domain (e.g. `https://app.yourdomain.com`)
- [ ] Configure AI Provider API Keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`)
- [ ] Set `ENABLE_SCHEDULED_JOBS=true` if automated cron scheduling is desired
- [ ] Ensure volume persistence for SQLite database: `./backend/jobs.db` and `./backups/`
- [ ] Setup SSL certificate (Let's Encrypt / Certbot) and Nginx reverse proxy

---

## 1. System Architecture & Persistence Model

AutoJobApply operates a Node.js Express backend and Vite/React frontend. The operational data store is **SQLite configured in Write-Ahead Logging (WAL) mode**, providing high-throughput concurrent reads and atomic writes without requiring an external database cluster.

### Persistent Filesystem Paths
| Path | Purpose | Backup Requirement |
| :--- | :--- | :---: |
| `backend/jobs.db` | Primary SQLite database file | **Critical** (Daily atomic backup) |
| `backend/jobs.db-wal` | SQLite Write-Ahead Log | Captured automatically by `VACUUM INTO` |
| `backups/` | Automated atomic SQLite snapshot archives | Retain for 30 days offsite |
| `exports/` | Generated PDF and CSV export files | Ephemeral / Scratch |
| `screenshots/` | Browser verification screenshots | Retain for 14 days |

---

## 2. Environment Configuration

### Staging & Production Secret Generation (MANDATORY)
Never use predictable, hardcoded, or shared example keys. Generate cryptographically random secrets for each deployment environment:
```bash
# Cryptographic secret generation command:
openssl rand -base64 32
# Or using Node.js crypto module:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Staging `.env` Template
```env
NODE_ENV=staging
PORT=5000

# Security (CRITICAL - Minimum 32 random characters generated cryptographically)
JWT_SECRET=<INSERT_CRYPTOGRAPHICALLY_GENERATED_32_CHAR_SECRET>
JWT_EXPIRE=7d

# CORS - Explicit staging origins only (Wildcard * is strictly rejected by server startup)
CORS_ORIGIN=https://staging.yourdomain.com

# Persistent SQLite Storage Path
DB_PATH=/app/data/jobs.db
SCREENSHOTS_DIR=/app/screenshots
EXPORT_DIR=/app/exports

# Automation & Schedulers (MUST be false on initial deployment)
ENABLE_SCHEDULED_JOBS=false

# Multi-Provider AI Keys (Optional in staging; falls back safely to deterministic MockProvider)
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Frontend Staging URL
VITE_API_URL=https://staging-api.yourdomain.com/api
```

### Production `.env` Template
```env
NODE_ENV=production
PORT=5000

# Security (CRITICAL - Minimum 32 random characters generated cryptographically)
JWT_SECRET=<INSERT_CRYPTOGRAPHICALLY_GENERATED_32_CHAR_SECRET>
JWT_EXPIRE=7d

# CORS - Explicit production origins only (Wildcard * is strictly rejected by server startup)
CORS_ORIGIN=https://app.yourdomain.com

# Persistent SQLite Storage Path
DB_PATH=/app/data/jobs.db
SCREENSHOTS_DIR=/app/screenshots
EXPORT_DIR=/app/exports

# Multi-Provider AI Keys (Automatic fallback: Gemini -> OpenAI -> Claude -> Mock)
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Automation & Schedulers
ENABLE_SCHEDULED_JOBS=true
DISCOVERY_CRON_SCHEDULE="0 */6 * * *"

# Optional Notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
RESEND_API_KEY=

# Frontend Production URL
VITE_API_URL=https://api.yourdomain.com/api
```

---

## 3. Production Build & Execution

### Build Commands
```bash
# 1. Install root, backend, and frontend dependencies
npm run install:all

# 2. Compile TypeScript backend
npm run build:backend

# 3. Compile optimized production frontend assets
npm run build:frontend
```

### Production Process Management (PM2)
```bash
# Start backend via PM2
pm2 start backend/dist/app.js --name "autojobapply-backend" --env production

# Check health and memory metrics
curl http://localhost:5000/health
```

---

## 4. Health Monitoring & Observability

The application exposes standard, zero-dependency health probes:

### Endpoint: `GET /health` or `GET /api/health`
**Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "uptime": 86420,
  "timestamp": "2026-11-13T14:15:00.000Z",
  "database": "connected",
  "environment": "production",
  "memory": {
    "rssMb": 84,
    "heapUsedMb": 42
  }
}
```
If the database connection is degraded, it returns HTTP 503 with status `"degraded"`.

---

## 5. Automated Database Backups & Integrity Checks

### Create Atomic Online Backup
SQLite Write-Ahead Logging allows consistent backups while active write transactions occur:
```bash
# CLI atomic backup (runs SQLite VACUUM INTO + PRAGMA integrity_check)
npm run db:backup
```
Backups are archived into `backups/jobs-backup-<timestamp>.db` and verified automatically with `PRAGMA integrity_check`.

### Scheduled Backup Cron Job
Add to host crontab (`crontab -e`):
```cron
# Run automated database backup every night at 2:00 AM
0 2 * * * cd /app && npm run db:backup >> /var/log/autojobapply-backup.log 2>&1
```

---

## 6. Disaster Recovery & Rollback Runbook

### Scenario A: Restoring from SQLite Database Backup
1. Stop the application process:
   ```bash
   pm2 stop autojobapply-backend
   ```
2. Identify the target healthy backup in `backups/`:
   ```bash
   ls -la backups/
   ```
3. Copy the backup file over `backend/jobs.db`:
   ```bash
   cp backups/jobs-backup-YYYY-MM-DDTHH-MM-SS.db backend/jobs.db
   rm -f backend/jobs.db-wal backend/jobs.db-shm
   ```
4. Restart application and verify health:
   ```bash
   pm2 start autojobapply-backend
   curl http://localhost:5000/health
   ```

### Scenario B: Emergency Application Code Rollback
If a regression or deployment issue occurs, recover from the audited recovery baseline:
```bash
# Recovery commit baseline: backup/pre-cleanup-2026-11-13 (c007f04)
git status --short
# Revert to stable tag or commit if needed
```

---

## 7. Security Hardening Architecture

1. **Human-in-the-Loop Review Mandatory**: No application can be submitted without prior answer verification and cryptographic draft hash binding.
2. **Bulk Approval Disabled by Policy**: Mass/bulk submissions are blocked at the controller level (HTTP 403 Forbidden).
3. **Anti-Bot Sentinel**: Automated pauses when encountering Cloudflare Turnstile, Google reCAPTCHA, hCaptcha, OTP, or LinkedIn checkpoints. Never attempts to solve or bypass challenges.
4. **Log Sanitization**: Passwords, tokens, cookies, and API keys are automatically redacted in application logs.
5. **Rate Limiting**: IP rate limiter enforces maximum 100 requests per 15 minutes globally, and 15 requests per 15 minutes for authentication routes.
6. **SQL Injection Immunity**: 100% of SQL operations utilize parameterized binding (`?`).

---

## 8. Network Security & Reverse Proxy Architecture

### Firewall Rules (UFW / AWS Security Group)
- **Allow Public Inbound**: Ports `80` (HTTP redirect) and `443` (HTTPS TLS).
- **Allow Restricted Inbound**: Port `22` (SSH restricted to admin IP / VPN).
- **Block Public Inbound**: Ports `5000` (Backend API) and `3000` (Frontend). Containers must bind exclusively to `127.0.0.1`.

### Production/Staging Nginx Reverse Proxy Configuration
```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name staging.autojobapply.com;
    return 301 https://$host$request_uri;
}

# HTTPS Primary Termination
server {
    listen 443 ssl http2;
    server_name staging.autojobapply.com;

    # TLS Certificates (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/staging.autojobapply.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.autojobapply.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Strict Block: Never expose internal data, backups, or database files
    location ~* (\.db|\.sqlite|\.env|backups|exports) {
        deny all;
        return 404;
    }

    # API Route Proxy to Backend Container
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }

    # Health Probe
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend Route Proxy to Nginx SPA Container
    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 9. Staging Secret Management & Safe Container Commands

### Protected Environment File Security
1. Store secrets in a protected file outside the repository (e.g. `/etc/autojobapply/staging.env`).
2. Restrict file permissions:
   ```bash
   sudo chown root:root /etc/autojobapply/staging.env
   sudo chmod 600 /etc/autojobapply/staging.env
   ```
3. Never pass secret strings via plaintext CLI arguments (`-e JWT_SECRET=xyz`). Pass via `--env-file` to prevent process table (`ps aux`) and shell history leaks:
   ```bash
   docker run -d \
     --name autojobapply-staging-backend \
     --restart unless-stopped \
     -p 127.0.0.1:5000:5000 \
     --env-file /etc/autojobapply/staging.env \
     -v /opt/autojobapply/staging/data:/app/data \
     -v /opt/autojobapply/staging/backups:/app/backups \
     -v /opt/autojobapply/staging/screenshots:/app/screenshots \
     -v /opt/autojobapply/staging/exports:/app/exports \
     autojobapply-backend:staging
   ```
