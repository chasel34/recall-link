# Recall Link

Monorepo for saving webpages, processing them via background jobs, and browsing/asking chat questions.

See per-area guides:
- `apps/api/AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/AGENTS.md`

## Overview

- **Monorepo:** pnpm + Turborepo (`pnpm-workspace.yaml`, `turbo.json`)
- **Backend:** `apps/api` (Hono + SQLite/better-sqlite3 + Zod) + optional worker loop (`WORKER_ENABLED=1`)
- **Frontend:** `apps/web` (Vite + React + TanStack Router/Query + HeroUI + Tailwind)
- **Testing:** Vitest (primarily in `apps/api`)

## Structure

```
./
├── apps/
│   ├── api/           # API + worker (port 8787)
│   ├── web/           # Web UI (port 3000)
│   └── test-client/   # Minimal Vite client (port 5173)
├── docs/              # PRD + implementation plans
├── turbo.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

Note: `pnpm-workspace.yaml` includes `packages/*`, but `packages/` is currently absent.

## Where To Look

| Task | Location | Notes |
|------|----------|-------|
| API entry / server start | `apps/api/src/index.ts` | Loads `.env`, starts worker (optional), calls `serve()` |
| API routing + middleware | `apps/api/src/app.ts`, `apps/api/src/routes/api.ts` | Hono app, `app.route('/api', ...)` |
| Save item flow | `apps/api/src/features/items/items.route.ts`, `apps/api/src/features/items/items.db.ts` | URL normalization + duplicate check + job enqueue |
| DB schema + migrations | `apps/api/src/db/schema.sql`, `apps/api/src/db/client.ts` | `applySchema()` runs in phases + backfills FTS |
| Worker + processors | `apps/api/src/queue/worker.ts`, `apps/api/src/queue/processors/*` | Job polling + `fetch` / `ai_process` |
| Web app entry | `apps/web/src/main.tsx` | Router + Query + HeroUI providers |
| Web routes | `apps/web/src/routes/*` | TanStack Router file routes (`createFileRoute`) |
| Web data hooks | `apps/web/src/hooks/*` | React Query + (some) Zustand |
| Web API client | `apps/web/src/lib/api-client.ts` | HTTP calls + mirrored response types |
| Product requirements | `docs/prd.md` | Source-of-truth feature intent |

## Conventions (This Repo)

- **pnpm only**: root scripts assume pnpm + turbo (`package.json`)
- **API uses ESM/NodeNext**: always include `.js` in relative imports in `apps/api/src/*` (e.g. `./app.js`)
- **SQLite safety**: multi-step writes use `db.transaction(() => { ... })()`
- **IDs**: prefixed nanoids (e.g. `item_...`, `job_...`, `tag_...`) via `apps/api/src/lib/utils.ts:generateId()`
- **URL normalization**: run `apps/api/src/lib/utils.ts:normalizeUrl()` before storing/deduping
- **No CI in repo**: no `.github/workflows/*`; verification is manual (`pnpm test`, `pnpm typecheck`, `pnpm build`)

## Commands

```bash
pnpm install

# dev
pnpm dev
pnpm dev:web

# verify
pnpm test
pnpm typecheck
pnpm build
```

## Notes / Gotchas

- `apps/api/data/*` and `apps/*/.env` are gitignored; don't rely on checked-in DB state.
- `.npmrc` includes `public-hoist-pattern[]=*@heroui/*` (HeroUI ecosystem wants hoisted deps).
