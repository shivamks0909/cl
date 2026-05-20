# Installed Agents & Skills Inventory

**Last Updated:** 2026-05-19T04:37:00+05:30

---

## AI Agents (30 Installed)

| #  | Agent                                | Path              | Purpose                                            |
| -- | ------------------------------------ | ----------------- | -------------------------------------------------- |
| 1  | **Claude Code (.agents)**      | `.agents/`      | Main agent framework with Supabase/InsForge skills |
| 2  | **Continue (.continue)**       | `.continue/`    | VS Code AI assistant integration                   |
| 3  | **Cortex (.cortex)**           | `.cortex/`      | Cortex AI coding agent                             |
| 4  | **Goose (.goose)**             | `.goose/`       | Goose CLI agent                                    |
| 5  | **Factory (.factory)**         | `.factory/`     | Factory AI agent                                   |
| 6  | **iFlow (.iflow)**             | `.iflow/`       | Flow-based AI agent                                |
| 7  | **Junie (.junie)**             | `.junie/`       | Junie coding agent                                 |
| 8  | **KiloCode (.kilocode)**       | `.kilocode/`    | KiloCode agent                                     |
| 9  | **MCPJam (.mcpjam)**           | `.mcpjam/`      | MCP Jam agent                                      |
| 10 | **Neovate (.neovate)**         | `.neovate/`     | Neovate AI agent                                   |
| 11 | **OpenHands (.openhands)**     | `.openhands/`   | OpenHands autonomous agent                         |
| 12 | **Pochi (.pochi)**             | `.pochi/`       | Pochi agent                                        |
| 13 | **Qwen (.qwen)**               | `.qwen/`        | Qwen AI agent                                      |
| 14 | **Roo (.roo)**                 | `.roo/`         | Roo AI assistant                                   |
| 15 | **Trae (.trae)**               | `.trae/`        | Trae coding agent                                  |
| 16 | **Vibe (.vibe)**               | `.vibe/`        | Vibe coding agent                                  |
| 17 | **Windsurf (.windsurf)**       | `.windsurf/`    | Windsurf AI IDE                                    |
| 18 | **Zencoder (.zencoder)**       | `.zencoder/`    | Zencoder AI                                        |
| 19 | **Adal (.adal)**               | `.adal/`        | Adal agent                                         |
| 20 | **Augment (.augment)**         | `.augment/`     | Augment AI coding                                  |
| 21 | **CodeBuddy (.codebuddy)**     | `.codebuddy/`   | CodeBuddy agent                                    |
| 22 | **Codex (.codex)**             | `.codex/`       | OpenAI Codex agent                                 |
| 23 | **CommandCode (.commandcode)** | `.commandcode/` | Command Code agent                                 |
| 24 | **Kode (.kode)**               | `.kode/`        | Kode agent                                         |
| 25 | **Kiro (.kiro)**               | `.kiro/`        | Kiro AI                                            |
| 26 | **Mux (.mux)**                 | `.mux/`         | Mux agent                                          |
| 27 | **Pi (.pi)**                   | `.pi/`          | Pi AI agent                                        |
| 28 | **Planning (.planning)**       | `.planning/`    | Planning agent                                     |
| 29 | **Qoder (.qoder)**             | `.qoder/`       | Qoder agent                                        |
| 30 | **Crush (.crush)**             | `.crush/`       | Crush agent                                        |

---

## Active Skills (Project-Specific)

### `.agents/skills/` (Primary)

| Skill                                      | Path                                                 | Description                                                                        |
| ------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **supabase**                         | `.agents/skills/supabase/`                         | Full Supabase integration guide — Database, Auth, Edge Functions, RLS, migrations |
| **insforge**                         | `.agents/skills/insforge/`                         | InsForge database documentation                                                    |
| **insforge-cli**                     | `.agents/skills/insforge-cli/`                     | InsForge CLI commands & patterns                                                   |
| **find-skills**                      | `.agents/skills/find-skills/`                      | Skill discovery utility                                                            |
| **supabase-postgres-best-practices** | `.agents/skills/supabase-postgres-best-practices/` | PostgreSQL optimization patterns                                                   |

### `.claude/skills/` (Global Antigravity)

See: `C:\Users\office space\.gemini\antigravity\skills\` — 1000+ skills including:

- **database** — DB development workflow
- **database-admin** — DBA patterns
- **neon-postgres** — Serverless Postgres
- **nextjs-best-practices** — Next.js App Router
- **nextjs-supabase-auth** — Supabase + Next.js auth
- **playwright-skill** — E2E testing
- **security-auditor** — Security review
- **debugger** — Bug fixing
- And 1000+ more...

---

## How to Activate Skills

Skills are auto-loaded based on context. For manual activation:

```markdown
Skills can be invoked by:
1. Task context matching (automatic)
2. Explicit skill reference in conversation
3. Agent-specific activation commands
```

---

## Best Practices for Multi-Agent Workflow

1. **Use Antigravity (me)** as the orchestrator for complex tasks
2. **Consult Supabase skill** for any DB-related work
3. **Use security-auditor** before deploying
4. **Use debugger** when encountering bugs
5. **Save context** to `.conversation-context.md` after each session

---

## Skill Recommendations for This Project

| Task                     | Recommended Skill           |
| ------------------------ | --------------------------- |
| Database changes         | `supabase` + `database` |
| Auth implementation      | `nextjs-supabase-auth`    |
| Security review          | `security-auditor`        |
| Performance optimization | `performance-engineer`    |
| Testing                  | `playwright-skill`        |
| API design               | `api-patterns`            |
| Code review              | `code-reviewer`           |
