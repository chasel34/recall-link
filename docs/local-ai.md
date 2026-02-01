# Local AI (Browser-side Gemini)

This repo supports two AI execution modes:

- `remote` (default): server-side AI execution
- `local`: browser-side AI execution using a user-provided Google Gemini API key

## Product Constraints (Aligned)

Local mode MUST match the same output constraints as server-side AI:

- Tags: 3-5, simplified Chinese, 2-6 characters each
- Summary: <= 150 Chinese characters

These constraints are enforced by reusing `packages/ai` from the web app.

## Where It Lives

### Settings UI

- Route: `apps/web/src/routes/settings.tsx`
- Store: `apps/web/src/hooks/ai-settings.ts`
- Storage:
  - Namespaced by user: `ai-settings:${userId}` in `localStorage`
  - Cleared on logout

### Local item processing

- SSE subscription + runner: `apps/web/src/routes/__root.tsx`
- Trigger: on `item.updated` SSE with `source='fetch'`
- Conditions: `item.ai_mode === 'local'`, `status==='completed'`, `clean_text` present, `summary` empty
- Writes back to server:
  - `POST /api/items/:id/apply-ai`

### Local chat

- UI: `apps/web/src/components/chat/chat-container.tsx`
- API split for local mode:
  - `POST /api/chat/sessions/:id/messages/local` (persist user message + return history/sources + ids)
  - `POST /api/chat/sessions/:id/messages/local/assistant` (persist assistant message)

## Backend Support

### Per-item mode

- DB column: `items.ai_mode TEXT` (`remote|local`)
- Create item can set it via `POST /api/items` body `{ ai_mode }`

### Worker behavior

- Fetch processor skips enqueueing `ai_process` for `ai_mode='local'` items.

### DB migrations

Existing on-disk databases are migrated via `apps/api/src/db/client.ts`:

- Adds `items.ai_mode` if missing: `ALTER TABLE items ADD COLUMN ai_mode TEXT`

## Notes / Risks

- Local mode stores API keys in browser localStorage; treat as insecure.
- `apps/web` reuses `packages/ai` via a direct source alias to avoid requiring `packages/ai/dist` in dev.
  - See `apps/web/tsconfig.json` and `apps/web/vite.config.ts`.
