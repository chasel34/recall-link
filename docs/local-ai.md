# AI Processing Modes (`server` vs `user`)

This repository supports two AI execution modes for summarizing content and answering chat questions. Both modes run **entirely on the server** for security and consistency, but they differ in whose credentials and models are used.

Chat retrieval uses Ark embeddings (OpenAI-compatible API) while generation (summary/chat answer) continues to use Gemini.

## Terminology

- **`server` mode (Default)**: Uses the server's environment-based configuration (e.g., `GEMINI_API_KEY` in `apps/api/.env`).
- **`user` mode**: Uses a user-provided Google Gemini API key and optional custom Base URL/Model. (Formerly referred to as `local` mode).

## Why not "Local"?

Previously, the architecture supported browser-side inference (Gemini in the browser). This has been **deprecated and removed** to:
1. Ensure consistent output constraints (tags/summaries) between modes.
2. Provide a unified streaming chat experience via Server-Sent Events (SSE).
3. Avoid storing sensitive API keys in insecure browser `localStorage`.

## Configuration & Storage

### Server Mode
Configuration is loaded via `apps/api/src/config/ai.config.ts`.
- **API Key**: `GEMINI_API_KEY` env var.
- **Base URL**: `GEMINI_BASE_URL` env var or `apps/api/config/ai.json`.
- **Model**: `GEMINI_MODEL` env var or `apps/api/config/ai.json`.

Embedding configuration for semantic retrieval:
- **API Key**: `ARK_API_KEY` env var.
- **Base URL**: `ARK_BASE_URL` env var or `apps/api/config/ai.json` (default: `https://ark.cn-beijing.volces.com/api/v3`).
- **Embedding Model**: `ARK_EMBEDDING_MODEL` env var or `apps/api/config/ai.json` (default: `doubao-embedding-vision-251215`).
- **Input Mode**: current implementation uses text input only (via Ark `/embeddings/multimodal`).

### User Mode
Users can configure their own credentials in the Web UI:
- **Settings Path**: `apps/web/src/routes/settings/ai.tsx`
- **Data Management**: Handled by `apps/web/src/hooks/ai-settings.ts` (React Query).
- **Security**: 
  - API keys are **never** stored in `localStorage`.
  - Keys are transmitted once to the server via `PUT /api/settings/ai`.
  - Keys are stored **encrypted at rest** in the `user_model_configs` table (`api_key_enc`).
  - The UI only shows if a key is present (`hasApiKey: true`), never the key itself.
  - Separate encrypted keys are stored for Gemini and Ark embedding.

## Workflow

### 1. Item Processing
When a new item is saved:
1. The background worker runs the `fetch` job.
2. Upon completion, the `fetch` processor checks the item's `ai_mode`.
3. **Gating**: If `ai_mode === 'user'`, it verifies the user has a valid encrypted API key in the database.
4. If valid (or if in `server` mode), it enqueues an `ai_process` job.
5. The `ai_process` job uses the appropriate credentials to generate tags and summary.

### 2. Chat
All chat sessions use the server-side SSE endpoint:
- `POST /api/chat/sessions/:id/messages` (SSE stream)
- `GET /api/chat/sessions/:id/messages` (list messages)
- The server automatically selects the `server` or `user` configuration based on the user's settings.
- Retrieval pipeline:
  1. Generate query embedding via Ark.
  2. Lazily generate missing item embeddings on query.
  3. Rank sources by cosine similarity.
- Legacy local chat endpoints (`/messages/local*`) have been removed.

## Backend Support

### Per-item Mode
- DB column: `items.ai_mode TEXT` (`server|user`).
- Default is `server`.

### Worker Behavior
- The `ai_process` processor (`apps/api/src/queue/processors/ai.processor.ts`) retrieves the correct config (either from env or decrypted from `user_model_configs`) before calling the AI provider.

## Summary of Removed Features
- Browser-side Gemini inference.
- `localStorage` storage for API keys.
- `POST /api/items/:id/apply-ai` (Local processing write-back).
- `POST /api/chat/sessions/:id/messages/local*` (Local chat persistence).
