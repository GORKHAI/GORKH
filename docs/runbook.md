# AI Operator Production Runbook

This document provides operational procedures for deploying, managing, and troubleshooting AI Operator in production.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Deployment](#deployment)
3. [Migrations](#migrations)
4. [Scaling](#scaling)
5. [Backup and Restore](#backup-and-restore)
6. [Incident Response](#incident-response)
7. [Rollback Strategy](#rollback-strategy)

---

## Environment Setup

### Required Environment Variables

Copy `.env.prod.example` to `.env.prod` and configure:

```bash
# Core runtime
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DEPLOYMENT_MODE=single_instance  # or multi_instance

# Database + cache (required)
POSTGRES_PASSWORD=<strong_random_password>
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/ai_operator
REDIS_URL=redis://redis:6379
RATE_LIMIT_BACKEND=redis

# Auth + origins (required)
WEB_ORIGIN=https://app.yourdomain.com
APP_BASE_URL=https://app.yourdomain.com
API_PUBLIC_BASE_URL=https://api.yourdomain.com
JWT_SECRET=<long_random_secret_min_32_chars>
ADMIN_API_KEY=<strong_admin_key>
ALLOW_INSECURE_DEV=false  # Must be false in production

# Metrics safety
METRICS_PUBLIC=false  # Keep false on public internet

# Billing (optional - set BILLING_ENABLED=false if not using Stripe)
BILLING_ENABLED=true
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Release metadata
DESKTOP_RELEASE_SOURCE=file  # or 'github'
DESKTOP_UPDATE_FEED_DIR=./updates
DESKTOP_UPDATE_ENABLED=true
DESKTOP_VERSION=1.0.0
DESKTOP_WIN_URL=https://...
DESKTOP_MAC_INTEL_URL=https://...
DESKTOP_MAC_ARM_URL=https://...

# Data retention
AUDIT_RETENTION_DAYS=30
STRIPE_EVENT_RETENTION_DAYS=30
SESSION_RETENTION_DAYS=30
RUN_RETENTION_DAYS=90
```

### Security Checklist

- [ ] `JWT_SECRET` is at least 32 characters and cryptographically random
- [ ] `ADMIN_API_KEY` is strong and stored securely (not in git)
- [ ] `ALLOW_INSECURE_DEV=false` in production
- [ ] All origins use `https://` (enforced when `ALLOW_INSECURE_DEV=false`)
- [ ] `METRICS_PUBLIC=false` (metrics should require admin key)
- [ ] Database password is strong
- [ ] Stripe keys are live keys (not test) if billing enabled
- [ ] `.env.prod` is NOT committed to git

---

## Deployment

### Prerequisites

- Docker 24.x+ with Docker Compose
- Access to container registry (if using pre-built images)
- Sufficient disk space for Postgres + Redis volumes

### Initial Deployment

```bash
# 1. Clone/deploy the repository
git clone <repo-url> /opt/ai-operator
cd /opt/ai-operator

# 2. Configure environment
cp .env.prod.example .env.prod
# Edit .env.prod with production values

# 3. Build images
docker compose -f docker-compose.prod.yml --env-file .env.prod build

# 4. Start infrastructure and apply migrations
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres redis
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate

# 5. Start core services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api web

# 6. Verify readiness
curl -fsS https://api.yourdomain.com/ready
```

### With Edge Proxy (Nginx)

```bash
# Start with nginx reverse proxy
docker compose -f docker-compose.prod.yml --env-file .env.prod --profile edge up -d
```

The nginx config handles:
- `/` → web (Next.js)
- `/api/` → api (Fastify)
- `/ws` → WebSocket upgrade
- `/events` → SSE with buffering disabled

### With Monitoring

```bash
# Start with Prometheus + Grafana
docker compose -f docker-compose.prod.yml --env-file .env.prod --profile monitoring up -d
```

Access Prometheus at `http://localhost:9090` (or configured port).

---

## Migrations

### Production Migration Strategy

**Always use `prisma migrate deploy` in production.** Never use `migrate dev`.

```bash
# Run migrations as a one-off job
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate

# Or using the migrate service (runs automatically on compose up)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d migrate
```

### Migration Safety

1. **Backup before migrating:**
   ```bash
   docker exec -t ai-operator-postgres-1 pg_dump -U postgres ai_operator > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations in staging first**

3. **Forward-only policy:** Migrations are designed to be forward-only. Down migrations are not supported.

4. **Zero-downtime considerations:**
   - Additive changes (new columns, tables) are safe
   - Destructive changes (column drops) require application updates first
   - Consider using `prisma migrate deploy` during low-traffic windows

---

## Scaling

### Single Instance (Default)

Works out of the box with:
- 1 API container
- 1 Web container
- Shared Postgres
- Shared Redis

### Multi-Instance (Horizontal Scaling)

**Requirements:**
- `DEPLOYMENT_MODE=multi_instance`
- Shared Postgres (all instances)
- Shared Redis (REQUIRED for rate limiting, presence, device commands)
- Sticky sessions for WebSocket connections

**WebSocket/SSE Topology:**

| Feature | Requirement |
|---------|-------------|
| WebSocket (`/ws`) | Sticky routing recommended (client → same instance) |
| SSE (`/events`) | Sticky routing recommended |
| HTTP API | Stateless, can round-robin |
| Device Commands | Redis-backed queue, works across instances |

**Load Balancer Configuration:**

```nginx
# Example: Nginx upstream with sticky sessions (ip_hash)
upstream api_backend {
    ip_hash;  # Sticky by client IP
    server api1:3001;
    server api2:3001;
    server api3:3001;
}

server {
    location /ws {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
    
    location /events {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
}
```

**Redis is Required for Multi-Instance:**

- Rate limiting sync across instances
- Device presence tracking
- Device command queue (at-least-once delivery)

If Redis is unavailable, the API falls back to in-memory mode with warnings.

---

## Backup and Restore

### Automated Backups

**Minimum: Daily logical backups**

```bash
# Daily backup cron job (run on host)
0 2 * * * docker exec -t ai-operator-postgres-1 pg_dump -U postgres ai_operator > /backups/ai-operator_$(date +\%Y\%m\%d).sql

# Retain last 7 days, monthly archives
find /backups -name "ai-operator_*.sql" -mtime +7 -delete
```

**Preferred: WAL archiving for PITR** (if your platform supports it)

### Manual Backup

```bash
# Full database backup
docker exec -t ai-operator-postgres-1 pg_dump -U postgres ai_operator > backup_$(date +%Y%m%d_%H%M%S).sql

# With compression
docker exec -t ai-operator-postgres-1 pg_dump -U postgres ai_operator | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore from Backup

```bash
# 1. Stop API (keep Postgres running)
docker compose -f docker-compose.prod.yml stop api

# 2. Drop and recreate database (CAUTION: destroys current data)
docker exec -i ai-operator-postgres-1 psql -U postgres -c "DROP DATABASE ai_operator;"
docker exec -i ai-operator-postgres-1 psql -U postgres -c "CREATE DATABASE ai_operator;"

# 3. Restore from backup
docker exec -i ai-operator-postgres-1 psql -U postgres -d ai_operator < backup_YYYYMMDD_HHMMSS.sql

# 4. Restart API
docker compose -f docker-compose.prod.yml start api

# 5. Verify
curl -fsS https://api.yourdomain.com/ready
```

### Testing Restores

**Test restore procedures in non-production before production cutover.**

```bash
# Restore to a separate test database
docker exec -i ai-operator-postgres-1 psql -U postgres -c "CREATE DATABASE ai_operator_restore_test;"
docker exec -i ai-operator-postgres-1 psql -U postgres -d ai_operator_restore_test < backup.sql
```

---

## Incident Response

### Health Checks

#### Liveness (`/health`)

```bash
curl https://api.yourdomain.com/health
```

- Returns `200` if process is running
- Does NOT check database connectivity
- Use for Kubernetes liveness probes

#### Readiness (`/ready`)

```bash
curl https://api.yourdomain.com/ready
```

Checks:
- Database connectivity
- Schema validation (required tables exist)
- Environment configuration
- Returns `200` if ready, `503` if not

**Interpreting readiness failures:**

```json
{
  "ok": false,
  "checks": {
    "database": { "ok": true },
    "schema": { "ok": false, "error": "Missing table: Run" }
  },
  "failures": ["Schema check failed"]
}
```

### Admin Diagnostics (`/admin/health`)

```bash
curl -H "x-admin-api-key: $ADMIN_API_KEY" https://api.yourdomain.com/admin/health
```

Returns:
- Readiness status
- WebSocket connection count
- SSE client count
- Screen frames in memory
- Rate limit keys count
- GitHub release cache stats
- Uptime

### Metrics (`/metrics`)

```bash
# With admin key
curl -H "x-admin-api-key: $ADMIN_API_KEY" https://api.yourdomain.com/metrics

# If METRICS_PUBLIC=true (not recommended for public internet)
curl https://api.yourdomain.com/metrics
```

Key metrics to monitor:
- `http_requests_total` - Request volume and status codes
- `http_request_duration_ms` - Latency histogram
- `rate_limit_hits_total` - Rate limiting events
- `ws_connections_current` - Active WebSocket connections
- `sse_clients_current` - Active SSE clients
- `readiness_failures_total` - Readiness check failures

### Common Alerts and Responses

#### Alert: Database Connection Failures

**Symptoms:** `/ready` returns `503`, database check fails

**Response:**
1. Check Postgres container: `docker ps | grep postgres`
2. Check Postgres logs: `docker logs ai-operator-postgres-1`
3. Check connection string in `.env.prod`
4. Verify network connectivity: `docker network ls`, `docker network inspect ...`

#### Alert: High 5xx Error Rate

**Symptoms:** Prometheus alert `ApiHigh5xxRate` firing

**Response:**
1. Check API logs: `docker logs ai-operator-api-1`
2. Check `/admin/health` for connection counts
3. Check database health
4. Check for recent deployments (possible bad rollout)

#### Alert: WebSocket Connections Dropped

**Symptoms:** Prometheus alert `WsConnectionsDropped` firing

**Response:**
1. Check API logs for WebSocket errors
2. Verify Redis is healthy (if using multi-instance)
3. Check load balancer sticky session configuration
4. Review device connection patterns

#### Alert: Rate Limiting Spike

**Symptoms:** `rate_limit_hits_total` increasing rapidly

**Response:**
1. Check if legitimate traffic spike or attack
2. Review `http_requests_total` by status
3. Check nginx/access logs for source IPs
4. Consider adjusting rate limits if legitimate growth

#### Alert: Stripe Webhook Failures

**Symptoms:** Prometheus alert `StripeWebhookFailures` firing

**Response:**
1. Check Stripe Dashboard for failed webhook deliveries
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check API logs for webhook processing errors
4. Verify endpoint URL is publicly accessible

### Log Analysis

**View API logs:**
```bash
docker logs -f ai-operator-api-1 --tail 100
```

**Structured log fields to search:**
- `requestId` - Correlation ID across requests
- `userId` - User identifier
- `eventType` - Audit event type
- `err` - Error messages

**Example: Find errors for a specific user:**
```bash
docker logs ai-operator-api-1 2>&1 | jq 'select(.userId == "user_id_here" and .level >= 50)'
```

---

## Rollback Strategy

### Application Rollback

**To rollback to a prior image tag:**

```bash
# 1. Identify the previous stable image tag
docker images | grep ai-operator-api

# 2. Update docker-compose.prod.yml to use previous tag
# Or use environment variable: IMAGE_TAG=prev-tag

# 3. Re-deploy with previous version
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api

# 4. Verify rollback
curl -fsS https://api.yourdomain.com/ready
curl https://api.yourdomain.com/health
```

### Database Rollback

**Important:** Prisma migrations are forward-only. There is no automatic down migration.

**If a migration must be reverted (rare):**

1. **Assess impact:** Can the application work with the new schema?
2. **Create manual revert script:** Write SQL to undo schema changes
3. **Restore from backup:** If data loss is acceptable:
   ```bash
   # Stop API
   docker compose -f docker-compose.prod.yml stop api
   
   # Restore database to pre-migration state
   docker exec -i ai-operator-postgres-1 psql -U postgres -d ai_operator < pre_migration_backup.sql
   
   # Mark migration as pending in _prisma_migrations (if needed)
   
   # Start old API version
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api
   ```

**Prevention:**
- Always test migrations in staging
- Use additive changes (new columns/tables) instead of destructive changes
- Deploy application changes before schema changes when possible

### Emergency Stop

**To immediately stop all services:**

```bash
docker compose -f docker-compose.prod.yml down
```

**To stop only API (keep database):**

```bash
docker compose -f docker-compose.prod.yml stop api web
```

**To disable billing temporarily:**

```bash
# Edit .env.prod
BILLING_ENABLED=false

# Restart API
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api
```

---

## Post-Incident Review

After any incident:

1. Document timeline of events
2. Review logs and metrics
3. Identify root cause
4. Update runbook with lessons learned
5. Schedule follow-up tasks (monitoring improvements, code fixes)

---

## Support Contacts

- **Technical Lead:** [contact]
- **On-call Engineer:** [contact]
- **Infrastructure:** [contact]
