# Performance Optimization: setItemTags

## Problem
Previous implementation updated item_count for ALL tags on every setItemTags call:

```sql
UPDATE tags
SET item_count = (
  SELECT COUNT(*) FROM item_tags WHERE tag_id = tags.id
)
```

If there are 1000 tags in the database, this executes 1000 COUNT queries even when only modifying tags for a single item (affecting 3-5 tags).

## Solution
Optimized to only update affected tags:

1. Record old tag IDs before deletion
2. Record new tag IDs after insertion
3. Update only affected tags (old ∪ new)

```sql
-- Only update affected tags
UPDATE tags
SET item_count = (
  SELECT COUNT(*) FROM item_tags WHERE tag_id = ?
)
WHERE id = ?
```

## Performance Impact

| Scenario | Total Tags | Affected Tags | Old (queries) | New (queries) | Speedup |
|----------|-----------|---------------|---------------|---------------|---------|
| Update item tags | 1000 | 6 | 1000 | 6 | ~166x |
| Create new item | 1000 | 5 | 1000 | 5 | ~200x |
| Replace all tags | 1000 | 8 | 1000 | 8 | ~125x |

## Example
```typescript
// Database has 1000 existing tags
// Item originally has: ['React', 'TypeScript', 'Frontend']
// Update to: ['React', 'Vue', 'Backend']

// Affected tags:
// - Old: React, TypeScript, Frontend
// - New: React, Vue, Backend
// - Union: React, TypeScript, Frontend, Vue, Backend (5 tags)

// Old implementation: 1000 COUNT queries
// New implementation: 5 COUNT queries
// Speedup: 200x
```

## Trade-offs
- **Pro**: Massive performance improvement (O(N) → O(M) where M << N)
- **Pro**: Still uses COUNT for accuracy, no cumulative errors
- **Pro**: Clear code, easy to maintain
- **Con**: Requires one extra SELECT to get old tag IDs
- **Con**: Slightly more complex logic

## Testing
See `tags.db.test.ts` → "should only update item_count for affected tags"
- Verifies counts are accurate for affected tags
- Verifies unaffected tags remain unchanged
