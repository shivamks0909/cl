# OpinionInsights — Survey Routing Platform

## Project Overview

**OpinionInsights** is a production-grade Next.js survey routing platform with intelligent respondent tracking, multi-supplier quota management, GeoIP validation, HMAC-secured callbacks, and a full admin dashboard.

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI | React 19.2.3, Tailwind CSS 3.4 |
| Language | TypeScript 5 |
| Database | Supabase (InsForge PostgreSQL) + SQLite (local dev) |
| Auth | bcryptjs + session cookies |
| Testing | Playwright E2E, Jest |
| Deployment | Vercel |

### Key Dependencies

```
@supabase/supabase-js     — Cloud database
better-sqlite3            — Local SQLite fallback
framer-motion             — Animations
lucide-react              — Icons
bcryptjs                  — Password hashing
maxmind                   — GeoIP lookup
exceljs                    — CSV/Excel exports
uuid                       — ID generation
```

---

## Database

### Dual-Mode Architecture

`lib/unified-db.ts` provides a Supabase-compatible wrapper over SQLite for local development, automatically switching based on environment:

| Env Variable | Database Used |
|-------------|---------------|
| `USE_SQLITE=true` | Local SQLite |
| `NODE_ENV=test` | Local SQLite |
| No Supabase URL | Local SQLite |
| Production (Vercel) | Supabase |

### Tables

- **projects** — Survey projects with codes, URLs, PID settings
- **clients** — Client/customer accounts
- **suppliers** — Vendor suppliers (Dynata, Lucid, etc.)
- **supplier_project_links** — Project-supplier associations
- **responses** — Survey response tracking
- **tracking_sessions** — Active respondent sessions
- **admins** — Admin user accounts
- **audit_logs** — Security & routing audit trail
- **callback_logs** — S2S callback records

---

## Routing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/r/{code}/{supplier}/{uid}` | Unified routing (recommended) |
| GET | `/r/{code}/{uid}?supplier=XXX` | Single-segment routing |
| GET | `/track?code=XXX&uid=YYY` | Legacy tracking endpoint |
| GET | `/init/{transactionId}/{rid}` | TrustSample custom init |

---

## API Endpoints

### Core APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (returns db_source, latency_ms) |
| GET | `/api/callback?pid=X&cid=Y&type=Z` | Survey outcome callback (HMAC verified) |
| POST | `/api/s2s/callback` | S2S session verification |
| GET | `/api/respondent-stats/{session}` | Respondent session stats |

### Admin APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/projects` | List all projects |
| POST | `/api/admin/projects` | Create project |
| PUT | `/api/admin/projects/{id}` | Update project |
| DELETE | `/api/admin/projects/{id}` | Delete project |
| GET | `/api/admin/clients` | List all clients |
| GET | `/api/admin/responses` | List responses |
| GET | `/api/admin/suppliers` | List suppliers |
| GET | `/api/admin/audit-logs` | Audit log trail |
| POST | `/api/admin/audit-logs` | Create audit entry |

---

## Core Services

| File | Purpose |
|------|---------|
| `lib/unified-db.ts` | DB abstraction (SQLite shim / Supabase) |
| `lib/callback-trust-engine.ts` | Callback genuineness evaluation, auto-project creation, response recording |
| `lib/tracking-service.ts` | Response tracking, session management |
| `lib/redirect-resolver.ts` | Multi-supplier redirect URL resolution |
| `lib/geoip-service.ts` | GeoIP routing (Vercel/Cloudflare/IPInfo/MaxMind) |
| `lib/audit-service.ts` | Audit logging |
| `lib/dashboardService.ts` | Dashboard analytics |
| `lib/session-service.ts` | Secure session management |
| `lib/security-config.ts` | Security constants and headers |
| `lib/auth.ts` | Admin authentication |
| `lib/getClientIp.ts` | Client IP detection (proxy-aware) |
| `lib/sanitize-utils.ts` | Input sanitization |

---

## Security

### Protection Layers

1. **HMAC SHA-256** — Signature verification on all callbacks
2. **IP Rate Limiting** — 3 requests/min per project per IP
3. **Duplicate UID Detection** — Per-project deduplication
4. **Bot Detection** — Blocks headless browsers, curl, etc.
5. **Referer Validation** — Rejects self-referer loops, invalid URLs
6. **Session Cookies** — HttpOnly, Secure, SameSite
7. **CSP Headers** — Content Security Policy via middleware
8. **Admin Session Management** — Lockout after 5 failed attempts

### Security Middleware (`middleware-security.ts`)

Sets headers: CSP, HSTS, COOP, COEP, X-Frame-Options, X-Content-Type-Options, etc.

---

## Admin Dashboard (`/admin`)

| Section | Features |
|---------|----------|
| Dashboard | KPI stats, project analytics, live activity feed, traffic charts |
| Projects | CRUD, PID tool, multi-country URLs, quota settings |
| Clients | CRUD operations |
| Suppliers | Manage vendors, redirect URLs, parameter mappings |
| Responses | Filter, export (CSV/Excel), response maintenance |
| Settings | Security config, callback URLs |
| Audit Logs | Searchable event trail |

---

## Testing

### E2E Tests (Playwright)

Location: `tests/e2e/`

| Test | Coverage |
|------|----------|
| 01-login.spec.ts | Login flow |
| 02-dashboard.spec.ts | Dashboard UI |
| 03-clients.spec.ts | Client management |
| 04-projects.spec.ts | Project CRUD |
| 05-suppliers.spec.ts | Supplier management |
| 06-redirect-flows.spec.ts | Redirect resolution |
| 07-callback-security.spec.ts | HMAC verification |
| 08-export.spec.ts | CSV/Excel exports |
| 09-ui-stability.spec.ts | UI responsiveness |
| 10-response-table.spec.ts | Response filtering |
| 11-settings.spec.ts | Settings page |
| 12-audit-logs.spec.ts | Audit log viewing |
| 13-pid-generation.spec.ts | PID auto-generation |
| 14-session-tracking.spec.ts | Session management |

### Run Tests

```bash
npm run test:e2e       # Run all E2E tests
npm run test           # Run Jest unit tests
```

---

## Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
USE_SQLITE=true                    # Use SQLite locally

# GeoIP (optional)
GEOIP_PROVIDER=auto
MAXMIND_DB_PATH=./data/GeoLite2-Country.mmdb
IPINFO_TOKEN=your-ipinfo-token

# Security
ADMIN_MASTER_KEY=your-master-key
NODE_ENV=development

# Deployment
VERCEL=1                           # Set automatically on Vercel
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/migrate-full-schema.sql` | Production PostgreSQL schema |
| `scripts/reset-local-db.js` | Seed local SQLite with test data |
| `scripts/create-admin-user.js` | Create admin account |
| `scripts/automated-test-runner.js` | Run E2E tests |
| `scripts/verify_db_state.js` | Validate DB state |
| `scripts/test-fallback.js` | Test Supabase fallback |

---

## Default Credentials (Local Dev)

- **Email:** admin@opinioninsights.com
- **Password:** admin123

---

## Quick Start

```bash
# 1. Install
npm install
npm rebuild better-sqlite3

# 2. Create admin
node scripts/create-admin-user.js

# 3. Seed test data
node scripts/reset-local-db.js

# 4. Run dev server
npm run dev
```

---

## Type Definitions

Key types in `lib/types.ts`:

- `Project` — Survey project with PID settings, country URLs
- `Supplier` — Vendor with redirect URLs, param mappings
- `Response` — Survey response with status tracking
- `Client` — Customer account
- `KPIStats`, `ProjectAnalytics` — Dashboard metrics

---

## Status Codes

Responses tracked with statuses:

- `in_progress` — Started but not completed
- `complete` — Survey completed
- `terminate` — Survey terminated early
- `quota_full` — Project quota reached
- `security_terminate` — Security block
- `duplicate_ip` — IP already in project
- `duplicate_string` — Duplicate UID

---

## Callback Flow

1. Supplier sends callback to `/api/callback`
2. HMAC signature verified
3. `CallbackTrustEngine.evaluate()` checks:
   - Valid project code (pid)
   - Valid user ID (uid)
   - User agent (no bots)
   - Referer header (no self-loops)
   - IP rate limit (≤5 hits/5min)
   - Duplicate UID check
4. Response recorded/updated
5. Audit log entry created
6. Redirect to status page
