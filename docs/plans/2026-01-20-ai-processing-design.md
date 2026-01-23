# AI Processing 功能设计

## 概述

自动为保存的网页生成标签和摘要，使用 Google Gemini API 通过 ai-sdk (v6) 实现。

## 核心目标

1. **自动生成**：fetch 成功后自动触发 AI 分析
2. **标签管理**：独立 tags 表，支持语义合并避免碎片化
3. **手动重试**：支持手动触发重新生成
4. **智能重试**：根据错误类型决定是否重试
5. **统一输出**：标签和摘要统一使用简体中文

---

## 架构设计

### 核心流程

```
1. fetch job 完成
   ↓
2. 创建 ai_process job
   ↓
3. Worker 处理 ai_process
   ↓
4. 调用 Gemini 生成原始 tags + summary
   ↓
5. Tag 语义合并（与已有 tags 对比）
   ↓
6. 更新数据库（summary + tags 关联）
```

### 主要组件

1. **配置管理** (`src/config/ai.config.ts`)
   - 读取环境变量和配置文件
   - 提供 `getAIConfig()` 获取当前配置
   - 支持运行时验证

2. **AI 服务** (`src/services/ai.service.ts`)
   - 使用 ai-sdk 创建 Gemini 客户端
   - `generateTagsAndSummary(text)` - 生成原始 tags 和 summary
   - `mergeTagsWithExisting(newTags, existingTags)` - 语义合并 tags

3. **AI Processor** (`src/queue/processors/ai.processor.ts`)
   - 获取 item 的 clean_text
   - 调用 AI 服务生成内容
   - 更新数据库
   - 智能错误处理

4. **Tags 数据访问** (`src/features/tags/tags.db.ts`)
   - 查找或创建 tag
   - 关联 item 和 tags
   - 更新 tag 计数

5. **API 端点**
   - `POST /api/items/:id/analyze` - 手动触发 AI 分析
   - `GET /api/tags` - 获取所有 tags

---

## 数据库设计

### 新增表

```sql
-- tags 表（独立管理）
CREATE TABLE tags (
  id TEXT PRIMARY KEY,           -- tag_xxx
  name TEXT NOT NULL UNIQUE,     -- "React", "前端性能"
  created_at TEXT NOT NULL,
  item_count INTEGER DEFAULT 0   -- 使用此 tag 的 item 数量
);

-- item_tags 关联表
CREATE TABLE item_tags (
  item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);
```

### Items 表修改

```sql
-- 移除字段
ALTER TABLE items DROP COLUMN tags_json;
ALTER TABLE items DROP COLUMN tags_source;

-- 保留字段
-- summary TEXT
-- summary_source TEXT ('ai' | 'user')
```

---

## 配置管理

### 环境变量（优先级高）

```bash
GEMINI_BASE_URL=http://127.0.0.1:8317/v1beta
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3-flash-preview
```

### 配置文件（默认值）

`config/ai.json`:

```json
{
  "provider": "gemini",
  "gemini": {
    "baseURL": "http://127.0.0.1:8317/v1beta",
    "model": "gemini-3-flash-preview"
  }
}
```

### 配置加载逻辑

```typescript
function getAIConfig(): AIConfig {
  // 1. 尝试从环境变量读取
  const baseURL = process.env.GEMINI_BASE_URL
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL

  if (baseURL && apiKey && model) {
    return { baseURL, apiKey, model }
  }

  // 2. 从配置文件读取
  const config = readConfigFile('config/ai.json')

  // 3. 合并：环境变量覆盖配置文件
  return {
    baseURL: process.env.GEMINI_BASE_URL || config.gemini.baseURL,
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || config.gemini.model
  }
}
```

---

## AI 服务实现

### 生成 Tags 和 Summary

使用 ai-sdk 的 `generateObject` 确保结构化输出：

```typescript
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

async function generateTagsAndSummary(text: string): Promise<{
  tags: string[]
  summary: string
}> {
  const config = getAIConfig()
  const google = createGoogleGenerativeAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey
  })

  const result = await generateObject({
    model: google(config.model),
    schema: z.object({
      tags: z.array(z.string()).min(3).max(5),
      summary: z.string().max(500)
    }),
    prompt: `
请分析以下文章内容，生成标签和摘要。

要求：
1. 标签：3-5个，每个2-6字，使用简体中文
   - 包含主题类（如：React、经济学）
   - 包含类型类（如：教程、长文、工具页）
   - 包含领域类（如：前端、投资、历史）

2. 摘要：150字内，简体中文
   - 清晰说明文章主要内容
   - 面向未来的自己，帮助回忆
   - 包含2-3个关键信息点

文章内容：
${text}
`
  })

  return result.object
}
```

### Tag 语义合并

```typescript
async function mergeTagsWithExisting(
  newTags: string[],
  existingTags: string[]
): Promise<string[]> {
  if (existingTags.length === 0) {
    return newTags
  }

  const config = getAIConfig()
  const google = createGoogleGenerativeAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey
  })

  const result = await generateObject({
    model: google(config.model),
    schema: z.object({
      tags: z.array(z.string()).min(3).max(5)
    }),
    prompt: `
你是一个标签合并助手。用户生成了新标签，需要与已有标签进行语义对比和合并。

规则：
1. 如果新标签与已有标签语义相近，使用已有标签
2. 如果新标签是全新的，保留新标签
3. 优先保持已有标签的一致性

已有标签：
${existingTags.join(', ')}

新生成标签：
${newTags.join(', ')}

请返回合并后的标签列表（3-5个）。
`
  })

  return result.object.tags
}
```

---

## Job 处理流程

### 自动触发

在 `fetch.processor.ts` 完成后：

```typescript
// 更新 item 内容
updateItemContent(db, item.id, {
  title: article.title || (item.title ?? undefined),
  clean_text: article.textContent ?? undefined,
  status: 'completed',
})

// 标记 fetch job 完成
completeJob(db, job.id)

// 创建 ai_process job
const aiJobId = generateId('job')
db.prepare(`
  INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
  VALUES (?, ?, 'ai_process', 'pending', 0, ?, ?, ?)
`).run(aiJobId, item.id, now, now, now)
```

### AI Processor

```typescript
async function processAIJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item || !item.clean_text) {
    throw new Error('Item not found or no content')
  }

  console.log(`[ai] Processing ${item.url}`)

  // 1. 生成原始 tags 和 summary
  const { tags: newTags, summary } = await generateTagsAndSummary(item.clean_text)

  // 2. 获取所有已有 tags
  const existingTags = getAllTagNames(db)

  // 3. Tag 语义合并
  const mergedTags = await mergeTagsWithExisting(newTags, existingTags)

  // 4. 更新数据库（事务）
  db.transaction(() => {
    // 更新 summary
    db.prepare(`
      UPDATE items
      SET summary = ?, summary_source = 'ai', updated_at = ?
      WHERE id = ?
    `).run(summary, new Date().toISOString(), item.id)

    // 设置 tags
    setItemTags(db, item.id, mergedTags)
  })()

  console.log(`[ai] Completed ${item.url}`)
}
```

### 智能错误处理

```typescript
function shouldRetryAIError(error: any): boolean {
  // 429 限流 → 重试（长退避）
  if (error.status === 429) return true

  // 5xx 服务器错误 → 重试
  if (error.status >= 500) return true

  // 网络超时 → 重试
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') return true

  // 401/403 认证错误 → 不重试（配置问题）
  if (error.status === 401 || error.status === 403) return false

  // 400 客户端错误 → 不重试
  if (error.status >= 400 && error.status < 500) return false

  return false // 默认不重试
}

async function handleAIJobFailure(db: Database, job: Job, error: Error): Promise<void> {
  const nextAttempt = job.attempt + 1
  const maxAttempts = 3

  if (shouldRetryAIError(error)) {
    if (nextAttempt >= maxAttempts) {
      // 达到最大重试
      failJob(db, job.id, error.message)
    } else {
      // 重试，限流使用更长退避
      const isRateLimit = (error as any).status === 429
      const baseDelay = isRateLimit ? 5 : 2 // 限流 5 分钟，其他 2 分钟
      const delayMinutes = baseDelay * Math.pow(2, nextAttempt)
      const runAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

      retryJob(db, job.id, {
        attempt: nextAttempt,
        run_after: runAfter,
        error_message: error.message,
      })
    }
  } else {
    // 不可重试错误，直接失败
    failJob(db, job.id, error.message)
  }
}
```

---

## Tags 数据访问层

### 查找或创建 Tag

```typescript
function findOrCreateTag(db: Database, name: string): string {
  // 查找已存在的 tag (精确匹配)
  const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: string } | undefined

  if (tag) {
    return tag.id
  }

  // 创建新 tag
  const id = generateId('tag')
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO tags (id, name, created_at, item_count)
    VALUES (?, ?, ?, 0)
  `).run(id, name, now)

  return id
}
```

### 设置 Item 的 Tags

```typescript
function setItemTags(db: Database, itemId: string, tagNames: string[]): void {
  db.transaction(() => {
    // 1. 删除旧关联
    db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(itemId)

    // 2. 创建新关联
    const now = new Date().toISOString()
    for (const name of tagNames) {
      const tagId = findOrCreateTag(db, name)
      db.prepare(`
        INSERT INTO item_tags (item_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `).run(itemId, tagId, now)
    }

    // 3. 更新所有 tag 的计数
    db.prepare(`
      UPDATE tags
      SET item_count = (
        SELECT COUNT(*) FROM item_tags WHERE tag_id = tags.id
      )
    `).run()
  })()
}
```

### 获取所有 Tag 名称

```typescript
function getAllTagNames(db: Database): string[] {
  const tags = db.prepare('SELECT name FROM tags ORDER BY name').all() as { name: string }[]
  return tags.map(t => t.name)
}
```

### 获取 Item 的 Tags

```typescript
function getItemTags(db: Database, itemId: string): string[] {
  const tags = db.prepare(`
    SELECT t.name
    FROM tags t
    JOIN item_tags it ON t.id = it.tag_id
    WHERE it.item_id = ?
    ORDER BY t.name
  `).all(itemId) as { name: string }[]

  return tags.map(t => t.name)
}
```

---

## API 设计

### POST /api/items/:id/analyze

手动触发 AI 分析：

```typescript
itemsApp.post('/:id/analyze', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    // 检查 item 是否存在且有内容
    const item = getItemById(db, id)
    if (!item) {
      return c.json({ error: 'NOT_FOUND', message: 'Item not found' }, 404)
    }

    if (!item.clean_text) {
      return c.json({
        error: 'NO_CONTENT',
        message: 'Item has no content to analyze'
      }, 400)
    }

    // 创建 ai_process job
    const jobId = generateId('job')
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'ai_process', 'pending', 0, ?, ?, ?)
    `).run(jobId, id, now, now, now)

    return c.json({ job_id: jobId }, 201)
  } catch (error) {
    console.error('[POST /items/:id/analyze] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create analysis job'
    }, 500)
  }
})
```

### GET /api/tags

获取所有 tags：

```typescript
tagsApp.get('/', (c) => {
  try {
    const db = getDb()

    const tags = db.prepare(`
      SELECT id, name, item_count, created_at
      FROM tags
      ORDER BY item_count DESC, name ASC
    `).all() as Tag[]

    return c.json({ tags })
  } catch (error) {
    console.error('[GET /tags] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get tags'
    }, 500)
  }
})
```

### 修改 GET /api/items/:id

返回 tags 数组：

```typescript
itemsApp.get('/:id', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    const item = getItemById(db, id)
    if (!item) {
      return c.json({ error: 'NOT_FOUND', message: 'Item not found' }, 404)
    }

    // 获取 tags
    const tags = getItemTags(db, id)

    return c.json({
      ...item,
      tags  // 替代原来的 tags_json
    })
  } catch (error) {
    console.error('[GET /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get item'
    }, 500)
  }
})
```

### 修改 GET /api/items

支持按 tags 筛选：

```typescript
// Schema 添加
export const listItemsQuerySchema = z.object({
  // ... 其他字段
  tags: z.string().optional(),  // 逗号分隔的 tag 名称
})

// 实现
itemsApp.get('/', zValidator('query', listItemsQuerySchema), (c) => {
  try {
    const db = getDb()
    const filters = c.req.valid('query')

    // 如果有 tags 筛选，需要 JOIN
    let result
    if (filters.tags) {
      const tagNames = filters.tags.split(',').map(t => t.trim())
      result = listItemsByTags(db, tagNames, filters)
    } else {
      result = listItems(db, filters)
    }

    // 为每个 item 附加 tags
    const itemsWithTags = result.items.map(item => ({
      ...item,
      tags: getItemTags(db, item.id)
    }))

    return c.json({
      items: itemsWithTags,
      total: result.total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    })
  } catch (error) {
    // ...
  }
})
```

---

## 测试策略

### 单元测试

1. **配置管理** (`config/ai.config.test.ts`)
   - 环境变量优先级
   - 配置文件读取
   - 缺失配置验证

2. **AI 服务** (`services/ai.service.test.ts`)
   - Mock ai-sdk 的 generateObject
   - 成功生成 tags 和 summary
   - Tag 语义合并逻辑
   - 各种错误场景

3. **Tags 数据访问** (`features/tags/tags.db.test.ts`)
   - findOrCreateTag 精确匹配
   - setItemTags 事务处理
   - getItemTags 查询
   - item_count 更新

4. **AI Processor** (`queue/processors/ai.processor.test.ts`)
   - Mock AI 服务
   - 完整处理流程
   - 智能重试判断（各种错误码）

### 集成测试

1. **完整流程测试** (`test/ai-flow.test.ts`)
   - 创建 item → fetch → ai_process → 验证结果
   - 验证 tags 表和 item_tags 表

2. **API 测试** (`test/ai-api.test.ts`)
   - POST /items/:id/analyze
   - GET /api/tags
   - GET /api/items 带 tags 筛选

### 端到端测试用例

使用真实文章测试（手动测试）：

1. **中文技术文章**
   - URL: https://baoyu.io/translations/context-engineering-part-of-ml
   - 验证：生成机器学习/上下文工程相关标签

2. **英文技术文章**
   - URL: https://prateeksurana.me/blog/guide-to-go-for-javascript-developers
   - 验证：生成简体中文标签（Go、JavaScript、编程）

3. **中文个人博客**
   - URL: https://tw93.fun/2025-07-17/money.html
   - 验证：生成财务/理财相关标签

**验证点：**
- 英文文章生成的标签和摘要是否为简体中文
- Tag 合并是否正确（语义相近的标签使用已有的）
- 摘要是否准确（150字内）
- tags 数量是否为 3-5 个

---

## 数据库迁移

需要更新 schema.sql：

```sql
-- 1. 创建 tags 表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  item_count INTEGER DEFAULT 0
);

-- 2. 创建 item_tags 关联表
CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);

-- 3. 从 items 表移除旧字段（需要数据迁移脚本）
-- 如果有现有数据，需要先迁移 tags_json 到新表
```

---

## 实现顺序建议

1. **数据库层** - 更新 schema，添加 tags 表和关联
2. **配置管理** - AI 配置读取和验证
3. **AI 服务** - 集成 ai-sdk，实现生成和合并
4. **Tags 数据访问** - CRUD 操作
5. **AI Processor** - Job 处理器
6. **Worker 集成** - 支持 ai_process 类型
7. **Fetch 集成** - 自动创建 ai_process job
8. **API 端点** - analyze、tags、items 更新
9. **测试** - 单元测试和集成测试
10. **端到端测试** - 使用真实文章验证

---

## 配置示例

`.env`:

```bash
# Database
DATABASE_PATH=./data/recall.db

# Worker
WORKER_ENABLED=1

# AI Configuration
GEMINI_BASE_URL=http://127.0.0.1:8317/v1beta
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3-flash-preview
```

---

## 成功标准

- ✅ 自动生成标签和摘要（简体中文）
- ✅ Tag 语义合并避免碎片化
- ✅ 智能错误处理和重试
- ✅ 支持手动重新生成
- ✅ 所有测试通过
- ✅ 三篇测试文章验证成功
