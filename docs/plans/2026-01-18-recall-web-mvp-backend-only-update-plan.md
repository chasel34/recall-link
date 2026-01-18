# Recall Web MVP Backend Skeleton (Monorepo apps/api) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在本仓库生成一个可运行的后端骨架(不实现完整抓取/抽取/AI 功能), 包含 Hono API 服务、Feature-first 路由组织、SQLite schema(jobs/items/fts 占位)、SSE/Chat/Items 的 endpoint 骨架, 并配套最小测试与开发脚本。

**Architecture:** pnpm workspace monorepo, 后端服务位于 `apps/api`。Hono 作为 HTTP 框架, 以 `app.route()` 方式按 feature 挂载子应用。SQLite(+FTS5) 作为唯一数据源, 先落 schema 与 DB client, worker/job pipeline 仅提供可扩展的骨架(可启动但不做真实处理)。

**Tech Stack:** Node.js, TypeScript, pnpm workspace, Hono, @hono/node-server, hono/streaming, zod, @hono/zod-validator, better-sqlite3, vitest

---

### Task 1: 创建隔离工作区(Worktree)

**Files:**
- No code changes

**Step 1: 创建 worktree**
- **REQUIRED SUB-SKILL:** Use `superpowers:using-git-worktrees`

**Step 2: 确认 worktree 目录**
Run: `pwd`
Expected: 路径包含 `.worktrees/` 或明确的隔离目录

---

### Task 2: 初始化 Monorepo + apps/api 基础工程

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/routes/api.ts`

**Step 1: 写根目录 `pnpm-workspace.yaml`**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 2: 写根目录 `package.json` (仅脚本聚合, 不放业务依赖)**
```json
{
  "name": "recall-link",
  "private": true,
  "packageManager": "pnpm@9",
  "scripts": {
    "dev": "pnpm -C apps/api dev",
    "build": "pnpm -C apps/api build",
    "typecheck": "pnpm -C apps/api typecheck",
    "test": "pnpm -C apps/api test"
  }
}
```

**Step 3: 写 `apps/api/package.json`**
```json
{
  "name": "@recall/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch --enable-source-maps ./dist/index.js",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "@hono/zod-validator": "^0.4.1",
    "better-sqlite3": "^11.0.0",
    "hono": "^4.6.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

**Step 4: 写 `apps/api/tsconfig.json` (最小可编译配置)**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "test"]
}
```

**Step 5: 写 `apps/api/vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node'
  }
})
```

**Step 6: 写 Hono 入口 `apps/api/src/index.ts`**
```ts
import { serve } from '@hono/node-server'
import { app } from './app'

const port = Number(process.env.PORT ?? 8787)

serve({ fetch: app.fetch, port })
// eslint-disable-next-line no-console
console.log(`[api] listening on http://localhost:${port}`)
```

**Step 7: 写 `apps/api/src/app.ts`**
```ts
import { Hono } from 'hono'
import { apiRoutes } from './routes/api'

export const app = new Hono()

app.get('/', (c) => c.json({ ok: true, service: 'recall-api' }))

app.route('/api', apiRoutes)
```

**Step 8: 写 `apps/api/src/routes/api.ts` (先留一个 health endpoint)**
```ts
import { Hono } from 'hono'

export const apiRoutes = new Hono()

apiRoutes.get('/health', (c) => c.json({ ok: true }))
```

**Step 9: 安装依赖并构建**
Run: `pnpm install`
Expected: 无 error

Run: `pnpm -C apps/api build`
Expected: exit code 0, 生成 `apps/api/dist/index.js`

**Step 10: Commit**
```bash
git add pnpm-workspace.yaml package.json apps/api

git commit -m "chore(api): init pnpm workspace and api package"
```
Expected: 1 个 commit

---

### Task 3: 增加 Feature-first 路由骨架(items/chat/events)

**Files:**
- Modify: `apps/api/src/routes/api.ts`
- Create: `apps/api/src/features/items/items.route.ts`
- Create: `apps/api/src/features/items/items.schema.ts`
- Create: `apps/api/src/features/chat/chat.route.ts`
- Create: `apps/api/src/features/chat/chat.schema.ts`
- Create: `apps/api/src/features/events/events.route.ts`
- Test: `apps/api/test/routes.test.ts`

**Step 1: 写 items schema `apps/api/src/features/items/items.schema.ts`**
```ts
import { z } from 'zod'

export const createItemSchema = z.object({
  url: z.string().url()
})

export const patchItemSchema = z.object({
  summary: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  note: z.string().max(10000).optional()
})
```

**Step 2: 写 items route `apps/api/src/features/items/items.route.ts` (先返回 501 stub)**
```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createItemSchema, patchItemSchema } from './items.schema'

export const itemsApp = new Hono()

itemsApp.post('/', zValidator('json', createItemSchema), (c) => {
  const body = c.req.valid('json')
  return c.json({
    error: 'NOT_IMPLEMENTED',
    message: 'items ingestion not implemented yet',
    received: body
  }, 501)
})

itemsApp.get('/', (c) => c.json({ items: [] }))
itemsApp.get('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.patch('/:id', zValidator('json', patchItemSchema), (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.delete('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.post('/:id/retry', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
```

**Step 3: 写 chat schema `apps/api/src/features/chat/chat.schema.ts`**
```ts
import { z } from 'zod'

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(5000)
})
```

**Step 4: 写 chat route `apps/api/src/features/chat/chat.route.ts`**
```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { chatRequestSchema } from './chat.schema'

export const chatApp = new Hono()

chatApp.post('/', zValidator('json', chatRequestSchema), (c) => {
  const body = c.req.valid('json')
  return c.json({
    error: 'NOT_IMPLEMENTED',
    message: 'chat not implemented yet',
    received: body
  }, 501)
})
```

**Step 5: 写 events route `apps/api/src/features/events/events.route.ts`**
```ts
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

export const eventsApp = new Hono()

eventsApp.get('/', (c) => {
  return streamSSE(c, async (stream) => {
    // v1 skeleton: send a heartbeat then close
    await stream.writeSSE({ event: 'ping', data: JSON.stringify({ ok: true }) })
  })
})
```

**Step 6: 挂载到 `apps/api/src/routes/api.ts`**
```ts
import { Hono } from 'hono'
import { itemsApp } from '../features/items/items.route'
import { chatApp } from '../features/chat/chat.route'
import { eventsApp } from '../features/events/events.route'

export const apiRoutes = new Hono()

apiRoutes.get('/health', (c) => c.json({ ok: true }))

apiRoutes.route('/items', itemsApp)
apiRoutes.route('/chat', chatApp)
apiRoutes.route('/items/events', eventsApp)
```

**Step 7: 写测试 `apps/api/test/routes.test.ts`**
```ts
import { describe, expect, it } from 'vitest'
import { app } from '../src/app'

describe('routes', () => {
  it('GET /api/health', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
  })

  it('POST /api/items validates body', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' })
    })
    expect(res.status).toBe(400)
  })

  it('GET /api/items/events is SSE', async () => {
    const res = await app.request('/api/items/events')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')?.includes('text/event-stream')).toBe(true)
  })
})
```

**Step 8: 运行测试**
Run: `pnpm -C apps/api test`
Expected: PASS

**Step 9: Commit**
```bash
git add apps/api/src apps/api/test

git commit -m "feat(api): add feature-first route skeletons"
```

---

### Task 4: 增加 SQLite schema 与 DB client(占位)

**Files:**
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/schema.sql`
- Test: `apps/api/test/db.test.ts`

**Step 1: 写 `apps/api/src/db/schema.sql` (v1 skeleton, 字段可后续补齐)**
```sql
-- items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  url_normalized TEXT NOT NULL UNIQUE,
  title TEXT,
  domain TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  clean_text TEXT,
  summary TEXT,
  summary_source TEXT,
  tags_json TEXT,
  tags_source TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  processed_at TEXT
);

-- jobs (lease/backoff)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  state TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  run_after TEXT NOT NULL,
  locked_by TEXT,
  lock_expires_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);

-- FTS skeleton (real FTS5 implementation can replace later)
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  item_id UNINDEXED,
  title,
  summary,
  tags,
  clean_text
);
```

**Step 2: 写 `apps/api/src/db/client.ts`**
```ts
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export type Db = Database.Database

export function openDb(dbPath: string): Db {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  return db
}

export function applySchema(db: Db, schemaFilePath: string) {
  const sql = fs.readFileSync(schemaFilePath, 'utf8')
  db.exec(sql)
}

export function defaultSchemaPath() {
  return path.join(process.cwd(), 'src', 'db', 'schema.sql')
}
```

**Step 3: 写测试 `apps/api/test/db.test.ts`**
```ts
import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { applySchema, openDb, defaultSchemaPath } from '../src/db/client'

describe('db schema', () => {
  it('applies schema', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-db-'))
    const dbPath = path.join(dir, 'test.sqlite')

    const db = openDb(dbPath)
    applySchema(db, defaultSchemaPath())

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    expect(tables.length).toBeGreaterThan(0)
    db.close()
  })
})
```

**Step 4: 运行测试**
Run: `pnpm -C apps/api test`
Expected: PASS

**Step 5: Commit**
```bash
git add apps/api/src/db apps/api/test/db.test.ts

git commit -m "feat(db): add sqlite schema and client skeleton"
```

---

### Task 5: 增加 worker/queue 骨架(可启动但不做真实处理)

**Files:**
- Create: `apps/api/src/queue/worker.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/test/worker.test.ts`

**Step 1: 写 `apps/api/src/queue/worker.ts` (仅打印, 预留 claim 接口)**
```ts
export type WorkerOptions = {
  enabled: boolean
}

export function startWorker(opts: WorkerOptions) {
  if (!opts.enabled) return
  // skeleton: later this becomes a claim loop against jobs table
  // eslint-disable-next-line no-console
  console.log('[worker] started (skeleton)')
}
```

**Step 2: 在 `apps/api/src/index.ts` 启动 worker (可用 env 开关)**
```ts
import { startWorker } from './queue/worker'

startWorker({ enabled: process.env.WORKER_ENABLED === '1' })
```

**Step 3: 写测试 `apps/api/test/worker.test.ts`**
```ts
import { describe, expect, it } from 'vitest'
import { startWorker } from '../src/queue/worker'

describe('worker', () => {
  it('does not throw when disabled', () => {
    expect(() => startWorker({ enabled: false })).not.toThrow()
  })
})
```

**Step 4: 运行测试**
Run: `pnpm -C apps/api test`
Expected: PASS

**Step 5: Commit**
```bash
git add apps/api/src/queue apps/api/src/index.ts apps/api/test/worker.test.ts

git commit -m "feat(worker): add worker skeleton entrypoint"
```

---

### Task 6: 本地验证清单

**Files:**
- No code changes

**Step 1: Typecheck**
Run: `pnpm typecheck`
Expected: exit code 0

**Step 2: Build**
Run: `pnpm build`
Expected: exit code 0

**Step 3: Run API**
Run: `pnpm dev`
Expected: 控制台输出 listening 日志

**Step 4: 手动冒烟**
Run: `curl -s http://localhost:8787/api/health`
Expected: `{"ok":true}`

---

### Task 7: 收尾与集成选择

**Step 1: 结束前自检**
- **REQUIRED SUB-SKILL:** Use `superpowers:verification-before-completion` (运行本计划的验证命令并记录输出)

**Step 2: 合并/PR/清理决策**
- **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`
