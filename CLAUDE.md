# Recall Link - Technical Guide

## Tech Stack

- **Monorepo:** pnpm + Turborepo
- **Language:** TypeScript (ES Modules)
- **Backend:** Hono + SQLite (better-sqlite3) + Zod
- **Testing:** Vitest
- **ID Generation:** nanoid (prefixed: `item_xxx`, `job_xxx`)

## Project Structure

```
apps/
├── api/                 # Backend API
│   ├── src/
│   │   ├── db/         # Database client, context, schema.sql
│   │   ├── features/   # items, chat, events
│   │   ├── lib/        # utils (ID gen, URL normalization)
│   │   └── test/       # Integration tests
│   └── data/           # SQLite files (gitignored)
└── test-client/        # Test client

docs/
├── prd.md              # Product requirements
└── plans/              # Implementation plans
```

## Core Flow

### Save Webpage (POST /api/items)
1. Validate URL
2. Normalize URL (remove tracking params)
3. Check duplicate via `url_normalized`
4. Generate IDs: `item_xxx`, `job_xxx`
5. Create item (status: `pending`) + job (type: `fetch`) in transaction
6. Return 201 or 409 (duplicate)

### Database Tables
- **items:** Saved URLs, metadata, AI-generated summary/tags
- **jobs:** Background task queue (fetch, ai_process)
- **items_fts:** Full-text search index

## Development

```bash
# Install (run locally; user-managed)
pnpm install

# Dev
pnpm dev                    # All apps
cd apps/api && pnpm dev     # API only (port 8787)

# Test
pnpm test                   # All (25 tests)
cd apps/api && pnpm test    # API only

# Typecheck & Build
pnpm typecheck
pnpm build
```

## Important Notes

- **ES Modules:** Always use `.js` in imports (`import { x } from './file.js'`)
- **Package Manager:** Use `pnpm`, not `npm`
- **Dependencies:** User performs dependency installs locally
- **Database:** File-based with WAL mode, in-memory for tests
- **Transactions:** Use `db.transaction(() => { ... })()`
- **URL Normalization:** Removes utm_*, fbclid, etc., preserves meaningful params
