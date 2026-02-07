# Bookmark Import Feature

Recall Link supports importing standard Netscape Bookmark HTML files (the de-facto standard for browser bookmark exports). This feature allows you to bulk-save your existing bookmarks into your personal knowledge base, where they will be automatically processed by the AI pipeline.

## Feature Overview

- **Format**: Supports Netscape Bookmark HTML files (`.html` or `.htm`).
- **Processing**: Bookmarks are parsed, deduplicated, and enqueued for content extraction, AI tagging/summarization, and semantic embedding.
- **Deduplication**: 
  - **Intra-file**: Prevents duplicate URLs within the same upload.
  - **Cross-user**: Prevents saving the same URL multiple times for the same user.
- **Rollout Control**: This feature is governed by the `IMPORT_BOOKMARKS_ENABLED` environment variable (rollout guidance below).

---

## User Workflow

1. **Navigation**: Go to the **Imports** section in the sidebar.
2. **Upload**: Select a `.html` bookmark file (max 10MB) and click "Upload".
3. **Processing**: The system immediately parses the file and creates import entries.
4. **Monitoring**: You can monitor the progress on the Import Detail page. The system polls for updates every 2-3 seconds.
5. **Stages**: Each valid bookmark goes through the following stages:
   - `queued` → `fetching` → `ai_processing` → `embedding` → `done`.
6. **Results**: Review the final statistics (Total, Created, Duplicates, Invalid, Failed) and inspect specific entry errors if any.

---

## Background Job Pipeline

The import process leverages the existing asynchronous worker pipeline with a new final stage for embeddings.

1. **`bookmark_import`**: Triggered by the API upon upload. Parses HTML and creates `item` rows.
2. **`fetch`**: Extracts the main content from the URL.
3. **`ai_process`**: Generates a summary and 3-5 tags using the configured LLM.
4. **`embed_process`** (New): Generates a semantic vector embedding for the item's content to support vector search. This stage is currently exclusive to imported items.

---

## Operational Notes

### Requirements
- **Worker**: Background processing requires the worker to be running (`WORKER_ENABLED=1`).
- **AI Configuration**: Ensure a valid `GEMINI_API_KEY` is set (or user-provided keys are configured).
- **Embeddings**: Requires an embedding-capable model configuration. If missing, the `embed_process` stage will fail with `EMBEDDING_CONFIG_MISSING`.

### Troubleshooting
- **`INVALID_BOOKMARK_FILE`**: The file provided does not conform to the expected Netscape HTML format or is not an HTML file.
- **`FILE_TOO_LARGE`**: The upload exceeds the 10MB limit.
- **`EMBEDDING_FAILED`**: The embedding service returned an error. This does not invalidate the successfully fetched content or AI summary.

---

## API Reference

### `POST /api/imports/bookmarks`
Upload a bookmark file.
- **Content-Type**: `multipart/form-data`
- **Fields**: `file` (File)
- **Response**: `201 Created` with `import_id` and initial stats.

### `GET /api/imports`
List recent import sessions for the current user.

### `GET /api/imports/:id`
Get detailed status, aggregate statistics, and progress percentage for a specific import.

### `GET /api/imports/:id/entries`
List individual bookmark entries within an import. Supports filtering by `status` (e.g., `failed`, `duplicate_existing`).

---

## Rollout & Feature Flag

To control the visibility and availability of this feature in production:

1. **Feature Flag**: `IMPORT_BOOKMARKS_ENABLED` (Boolean).
2. **Local Development**: Enabled by default in most dev environments where the API is fully mounted.
3. **Production Rollout**:
   - Keep `IMPORT_BOOKMARKS_ENABLED=false` initially.
   - Enable for internal/testing accounts first.
   - Monitor job failure rates and database performance during bulk imports.
   - Set `IMPORT_BOOKMARKS_ENABLED=true` once stabilized.

---

## Maintainer Reference (Implementation Map)

### Backend
- **Schema**: `apps/api/src/db/schema.sql` (Tables: `bookmark_imports`, `bookmark_import_entries`)
- **Parser**: `apps/api/src/features/imports/bookmarks.parser.ts`
- **Logic/DB**: `apps/api/src/features/imports/imports.db.ts`
- **Routes**: `apps/api/src/features/imports/imports.route.ts`
- **Embed Processor**: `apps/api/src/queue/processors/embed.processor.ts`

### Frontend
- **Pages**: `apps/web/src/routes/imports/index.tsx`, `apps/web/src/routes/imports/$id.tsx`
- **Hooks**: `apps/web/src/hooks/use-imports.ts`
- **API Client**: `apps/web/src/lib/api-client.ts`

---

## Developer Verification

### Automated Tests
Run the following to ensure the feature is functionally sound:
- **API/Parser**: `pnpm --filter @recall/api test`
- **Frontend/UI**: `pnpm --filter @recall-link/web test`
- **E2E Smoke**: `pnpm --filter @recall-link/web exec playwright test e2e/imports-smoke.spec.ts`

### Manual Smoke Test
1. Start the app with worker: `WORKER_ENABLED=1 pnpm dev`
2. Log in and navigate to `/imports`.
3. Upload a sample bookmarks file (e.g., exported from Chrome).
4. Verify the session appears in the list and shows "Processing".
5. Click the session to view details; verify progress bar increases as worker processes items.
6. Verify items appear in the main "Items" list once their status reaches `done`.
