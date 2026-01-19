# Recall API

Backend API for Recall link management system.

## Getting Started

```bash
pnpm install
pnpm run dev
```

API runs on `http://localhost:8787`

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
