
```
description: "Use when doing ANY task involving Supabase. Triggers: Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues); client libraries and SSR integrations (supabase-js, @supabase/ssr) in Next.js, React, SvelteKit, Astro, Remix; auth issues (login, logout, sessions, JWT, cookies, getSession, getUser, getClaims, RLS); Supabase CLI or MCP server; schema changes, migrations, security audits, Postgres extensions (pg_graphql, pg_cron, pg_vector)."
globs: *
alwaysApply: true
```


# PanelFlow - Supabase Integration Guide

## Overview

This project uses **Supabase** as its backend-as-a-service platform. All database operations, authentication, and storage are handled through Supabase.

## Database Connection

The application connects to Supabase using the `@supabase/supabase-js` client. Environment variables required:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only
```

## Key Files

| File                          | Purpose                      |
| ----------------------------- | ---------------------------- |
| `lib/unified-db.ts`         | Main database client wrapper |
| `lib/supabase-server.ts`    | Server-side Supabase client  |
| `app/login/actions.ts`      | Authentication actions       |
| `app/api/callback/route.ts` | Survey callback handling     |

## Supabase CLI

Always discover commands via `--help`:

```bash
supabase --help                    # All top-level commands
supabase <group> --help           # Subcommands
supabase <group> <command> --help # Flags
```

## Database Schema

Tables are managed through migrations in `scripts/` directory. Key tables:

- `projects` - Survey project configuration
- `suppliers` - Supplier/vendor data
- `supplier_project_links` - Project-supplier associations
- `responses` - Survey response tracking
- `admins` - Admin user accounts
- `audit_logs` - Security audit trail

## Security

- RLS (Row Level Security) enabled on all tables
- Service role key is server-side only (never exposed to client)
- bcrypt password hashing for admin accounts
- HMAC signature verification for S2S callbacks

## Documentation

Before implementing Supabase features, consult:

1. MCP `search_docs` tool for relevant snippets
2. https://supabase.com/docs - Official documentation
3. `.agents/skills/supabase/SKILL.md` - Local skill guide
