# Migration: Remove tags_json and tags_source columns

## Background

Previously, tags were stored in two places:
1. **tags_json** column in items table (JSON array as string)
2. **item_tags** junction table (normalized many-to-many relationship)

This redundancy caused:
- Data inconsistency when tags were updated via different code paths
- Maintenance overhead keeping both in sync
- Potential for stale data in tags_json

## Changes

### Database Schema
**File:** `src/db/schema.sql`

Removed columns from items table:
- `tags_json TEXT`
- `tags_source TEXT`

The authoritative source is now the `item_tags` junction table.

### Type Definitions
**File:** `src/features/items/items.db.ts`

Removed fields from Item type:
```typescript
// Removed:
tags_json: string | null
tags_source: string | null
```

### Update Logic
**File:** `src/features/items/items.db.ts` - `updateItem()`

Before:
```typescript
if (updates.tags !== undefined) {
  sets.push('tags_json = ?', 'tags_source = ?')
  params.push(JSON.stringify(updates.tags), 'user')
}
// Later: setItemTags(db, id, updates.tags)
```

After:
```typescript
if (updates.tags !== undefined) {
  setItemTags(db, id, updates.tags)
}
// No SQL field updates for tags
```

**Note:** When only tags are updated, `updateItem()` returns `{ changes: 0 }` since no SQL columns are modified (only the item_tags table is updated via setItemTags).

### API Response
**File:** `src/features/items/items.route.ts` - `PATCH /:id`

Changed validation logic:
```typescript
// Before: Check result.changes === 0
// Problem: returns 400 when only tags are updated

// After: Check if any update fields are provided
const hasUpdates = updates.summary !== undefined ||
                   updates.tags !== undefined ||
                   updates.note !== undefined
if (!hasUpdates) {
  return c.json({ error: 'NO_CHANGES' }, 400)
}
```

Always include tags in response:
```typescript
const updated = getItemById(db, id)
const tags = getItemTags(db, id)

return c.json({
  ...updated,
  tags,
})
```

### Tests Updated

**Files:**
- `src/features/items/items.db.test.ts`
- `src/test/items-crud.test.ts`

Changed assertions from:
```typescript
expect(item?.tags_json).toBe('["react","typescript"]')
expect(item?.tags_source).toBe('user')
```

To:
```typescript
const tags = getItemTags(db, 'item_test')
expect(tags).toEqual(['react', 'typescript'])
```

## Migration Path

For existing databases with data:

```sql
-- No data migration needed
-- The tags_json column can be dropped directly
-- All data is already in item_tags table (populated by AI processor and updateItem)

ALTER TABLE items DROP COLUMN tags_json;
ALTER TABLE items DROP COLUMN tags_source;
```

**Note:** SQLite doesn't support DROP COLUMN directly. To apply this migration:

1. **Recommended:** Delete existing database and let schema recreate (for dev/test)
2. **For production:** Create new table without columns, copy data, rename

## Benefits

1. **Single source of truth** - No more data inconsistency
2. **Cleaner code** - Removed redundant JSON serialization logic
3. **Better queries** - Can join/filter by tags efficiently
4. **Reduced bugs** - No risk of forgetting to update both places

## Breaking Changes

None for API consumers - the API still returns `tags` array in responses.

Internal code that directly accessed `item.tags_json` will need to use `getItemTags(db, item.id)` instead.
