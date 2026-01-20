# Recall API

Backend API for Recall link management system.

## Getting Started

```bash
pnpm install
pnpm run dev
```

API runs on `http://localhost:8787`

## Running with Worker

To enable background job processing:

```bash
WORKER_ENABLED=1 pnpm dev
```

## API Endpoints

### POST /api/items

Save a new webpage URL.

**Request:**
```json
{
  "url": "https://example.com/article"
}
```

**Response (201 Created):**
```json
{
  "id": "item_V1StGXR8_Z5jdHi6",
  "url": "https://example.com/article",
  "domain": "example.com",
  "status": "pending",
  "created_at": "2026-01-19T10:30:00.000Z"
}
```

**Response (409 Conflict - Duplicate URL):**
```json
{
  "error": "DUPLICATE_URL",
  "message": "This URL has already been saved",
  "existing_item_id": "item_abc123"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid URL format"
}
```

---

### GET /api/items

List saved items with pagination, filtering, and sorting.

**Query Parameters:**
- `limit` (number, default: 20, max: 100) - Items per page
- `offset` (number, default: 0) - Skip items
- `status` (string) - Filter by status: `pending`, `completed`, `failed`
- `domain` (string) - Filter by exact domain
- `created_after` (ISO datetime) - Filter items created after
- `created_before` (ISO datetime) - Filter items created before
- `sort_by` (string) - `created_at`, `updated_at`, `domain`
- `sort_order` (string) - `asc`, `desc`

**Response:**
```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/items/:id

Retrieve a single item by ID.

**Response (200 OK):**
```json
{
  "id": "item_abc123",
  "url": "https://example.com/article",
  "domain": "example.com",
  "status": "completed",
  "created_at": "2026-01-19T10:30:00.000Z"
}
```

**Response (404 Not Found):**
```json
{
  "error": "NOT_FOUND",
  "message": "Item not found"
}
```

---

### PATCH /api/items/:id

Update user-editable fields on an item.

**Request:**
```json
{
  "summary": "Custom summary",
  "tags": ["react", "typescript"],
  "note": "Read later"
}
```

**Response (200 OK):**
```json
{
  "id": "item_abc123",
  "summary": "Custom summary",
  "summary_source": "user",
  "tags_json": "[\"react\",\"typescript\"]",
  "tags_source": "user",
  "note": "Read later"
}
```

---

### DELETE /api/items/:id

Delete an item and its related jobs.

**Response (200 OK):**
```json
{
  "message": "Item deleted",
  "deleted_jobs": 1
}
```

**Response (404 Not Found):**
```json
{
  "error": "NOT_FOUND",
  "message": "Item not found"
}
```

## URL Normalization

URLs are normalized before duplicate detection:
- HTTP upgraded to HTTPS
- Hostname lowercased
- Trailing slashes removed
- Tracking parameters removed (utm_*, fbclid, gclid, etc.)
- Meaningful parameters preserved (id, q, page, v, etc.)

Examples:
- `http://Example.com/` → `https://example.com`
- `https://example.com/article?utm_source=twitter&id=123` → `https://example.com/article?id=123`

## Testing

```bash
pnpm test
```
