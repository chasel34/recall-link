# AI Processing End-to-End Testing

## Setup

1. Set your Gemini API key:

```bash
export GEMINI_API_KEY=your_actual_api_key
```

2. Start the server with worker:

```bash
cd apps/api
WORKER_ENABLED=1 pnpm dev
```

## Test Cases

### Test 1: Chinese Tech Article

**URL:** https://baoyu.io/translations/context-engineering-part-of-ml

**Expected:**
- Tags: 机器学习, 上下文工程, AI, 教程 (or similar)
- Summary: 关于机器学习中上下文工程的文章 (150字内)

**Steps:**

```bash
# Create item
ITEM1=$(curl -s -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://baoyu.io/translations/context-engineering-part-of-ml"}' | jq -r '.id')

echo "Created item: $ITEM1"

# Wait for fetch + AI processing (check logs)
sleep 30

# Get item with tags and summary
curl -s "http://localhost:8787/api/items/$ITEM1" | jq '{url, summary, tags}'
```

### Test 2: English Tech Article

**URL:** https://prateeksurana.me/blog/guide-to-go-for-javascript-developers

**Expected:**
- Tags: Go, JavaScript, 编程, 教程 (简体中文)
- Summary: 关于 JavaScript 开发者学习 Go 的指南 (简体中文, 150字内)

**Steps:**

```bash
ITEM2=$(curl -s -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://prateeksurana.me/blog/guide-to-go-for-javascript-developers"}' | jq -r '.id')

echo "Created item: $ITEM2"
sleep 30

curl -s "http://localhost:8787/api/items/$ITEM2" | jq '{url, summary, tags}'
```

**Verify:** Tags and summary are in 简体中文, even though article is English.

### Test 3: Chinese Personal Blog

**URL:** https://tw93.fun/2025-07-17/money.html

**Expected:**
- Tags: 财务, 理财, 个人成长 (or similar)
- Summary: 关于理财和财务管理的文章 (150字内)

**Steps:**

```bash
ITEM3=$(curl -s -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tw93.fun/2025-07-17/money.html"}' | jq -r '.id')

echo "Created item: $ITEM3"
sleep 30

curl -s "http://localhost:8787/api/items/$ITEM3" | jq '{url, summary, tags}'
```

### Test 4: Tag Merging

After processing all three articles, check tag merging:

```bash
# Get all tags
curl -s http://localhost:8787/api/tags | jq '.tags[] | {name, item_count}'
```

**Verify:**
- No duplicate tags with slight variations (e.g., "JavaScript" vs "javascript")
- Tags are semantically merged

### Test 5: Manual Re-analyze

Manually trigger re-analysis:

```bash
# Re-analyze item 1
curl -s -X POST "http://localhost:8787/api/items/$ITEM1/analyze" | jq '.'

# Wait for processing
sleep 15

# Check updated tags/summary
curl -s "http://localhost:8787/api/items/$ITEM1" | jq '{summary, tags}'
```

### Test 6: Tag Filtering

Filter items by tags:

```bash
# Get all items with "教程" tag
curl -s "http://localhost:8787/api/items?tags=教程" | jq '.items[] | {url, tags}'

# Get items with multiple tags
curl -s "http://localhost:8787/api/items?tags=JavaScript,Go" | jq '.items[] | {url, tags}'
```

## Success Criteria

- ✅ All 3 articles processed successfully
- ✅ Tags and summaries are in 简体中文
- ✅ Summaries are concise (≤150 字)
- ✅ Tags are semantically merged (no fragmentation)
- ✅ Tag counts are accurate
- ✅ Tag filtering works correctly
- ✅ Manual re-analyze works
