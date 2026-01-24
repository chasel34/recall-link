# apps/api

Package: `@recall/api`.

See `AGENTS.md` for monorepo-level commands and conventions.

## Local Commands

```bash
pnpm dev              # tsx watch src/index.ts
WORKER_ENABLED=1 pnpm dev

pnpm test             # vitest run
pnpm test:watch

pnpm typecheck        # tsc --noEmit
pnpm build            # tsc -p tsconfig.json
```

## Code Map

Flow (request -> DB -> worker):
1. `apps/api/src/app.ts` creates Hono app, mounts `/api`.
2. `apps/api/src/routes/api.ts` mounts feature routers.
3. `apps/api/src/features/*/*.route.ts` validates input (Zod) and calls DB/service functions.
4. DB uses `apps/api/src/db/context.ts:getDb()` + `better-sqlite3`.
5. Side-effects enqueue jobs; `apps/api/src/queue/worker.ts` polls and runs `apps/api/src/queue/processors/*`.

Where to look:
- App wiring: `apps/api/src/app.ts`, `apps/api/src/routes/api.ts`
- Items (core): `apps/api/src/features/items/*` (hotspot: `items.db.ts`)
- Chat (RAG): `apps/api/src/features/chat/*`
- SSE events: `apps/api/src/features/events/*`
- Tags: `apps/api/src/features/tags/*`
- Jobs table: `apps/api/src/features/jobs/*`
- DB schema/migrations: `apps/api/src/db/schema.sql`, `apps/api/src/db/client.ts`
- Shared utils: `apps/api/src/lib/utils.ts` (IDs + URL normalization)

## Environment

- `PORT` (default 8787)
- `WORKER_ENABLED=1` to start the polling worker in dev
- `GEMINI_API_KEY` required for AI processing; optional `GEMINI_BASE_URL`, `GEMINI_MODEL`

## Local Conventions

- **ESM imports**: relative imports must end with `.js` (NodeNext)
- **DB files**: `apps/api/data/*` and `apps/api/.env` are gitignored
- **Testing pattern**: use in-memory SQLite + `setDb()` / `closeDb()` (see `apps/api/src/db/context.ts`)

## Testing

- Integration tests: `apps/api/src/test/*.test.ts` (use `app.request()`)
- Unit-ish tests: co-located `*.test.ts` under `apps/api/src/**`

## Anti-Patterns

- Bypass `normalizeUrl()` when writing/looking up items.
- Add imports to `apps/api/src/features/items/items.fts.ts` (kept SQL-only to avoid circular deps).
