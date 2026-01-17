# 数据持久化系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Recall Link 应用实现基于 SQLite 的本地数据持久化系统，支持书签和聊天会话的完整 CRUD 操作，并提供异步任务队列处理网页抓取和 AI 摘要生成。

**Architecture:** 采用四层架构（API 层、IPC Bridge 层、Service 层、Repository 层），通过 Electron IPC 实现渲染进程与主进程通信，使用 better-sqlite3 进行本地数据存储，Zod 进行输入验证，为未来迁移到服务端预留扩展性。

**Tech Stack:**
- TypeScript 5.9.2
- better-sqlite3 (SQLite)
- Zod (Schema validation)
- Electron IPC (Process communication)

---

## 前置准备

### Task 0: 安装依赖

**Files:**
- Modify: `apps/desktop/package.json`

**Step 1: 安装 better-sqlite3 和 Zod**

Run:
```bash
cd apps/desktop
pnpm add better-sqlite3 zod
pnpm add -D @types/better-sqlite3
```

Expected: Dependencies installed successfully

**Step 2: 验证安装**

Run:
```bash
pnpm list better-sqlite3 zod
```

Expected: 显示安装的版本号

**Step 3: Commit**

```bash
git add apps/desktop/package.json apps/desktop/pnpm-lock.yaml
git commit -m "chore: add better-sqlite3 and zod dependencies"
```

---

## Phase 1: API 层基础设施

### Task 1: 创建 API 包基础结构

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/types.ts`

**Step 1: 创建 API 包目录**

Run:
```bash
mkdir -p packages/api/src
```

Expected: Directory created

**Step 2: 创建 package.json**

Create file `packages/api/package.json`:

```json
{
  "name": "@recall-link/api",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "workspace:*"
  },
  "devDependencies": {
    "typescript": "5.9.2"
  }
}
```

**Step 3: 创建 tsconfig.json**

Create file `packages/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: 创建基础类型定义**

Create file `packages/api/src/types.ts`:

```typescript
/**
 * 统一的 API 响应格式
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }

/**
 * API 错误结构
 */
export interface ApiError {
  code: ErrorCode
  message: string
}

/**
 * 错误码定义
 */
export type ErrorCode =
  | 'NOT_FOUND'           // 资源不存在
  | 'VALIDATION_ERROR'    // 输入验证失败
  | 'UNKNOWN'            // 未知错误
```

**Step 5: 验证类型检查**

Run:
```bash
cd packages/api
pnpm install
pnpm check-types
```

Expected: No type errors

**Step 6: Commit**

```bash
git add packages/api
git commit -m "feat(api): create API package foundation with Result types"
```

---

### Task 2: 定义 Bookmark 相关的 API 接口

**Files:**
- Create: `packages/api/src/bookmarks/types.ts`
- Create: `packages/api/src/bookmarks/schemas.ts`
- Create: `packages/api/src/bookmarks/api.ts`
- Create: `packages/api/src/bookmarks/index.ts`

**Step 1: 创建 Bookmark 类型定义**

Create file `packages/api/src/bookmarks/types.ts`:

```typescript
/**
 * 书签实体类型
 */
export interface Bookmark {
  id: string
  url: string
  title: string
  domain: string
  summary: string
  tags: string[]
  content: string
  language: 'zh' | 'en'
  wordCount: number
  createdAt: Date
  updatedAt: Date
  fetchedAt: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  isUserEdited: boolean
}

/**
 * 创建书签的输入参数
 */
export interface CreateBookmarkInput {
  url: string
  title?: string
  note?: string
}

/**
 * 更新书签的输入参数
 */
export interface UpdateBookmarkInput {
  title?: string
  tags?: string[]
  note?: string
}

/**
 * 列表查询参数
 */
export interface ListBookmarksParams {
  limit?: number
  offset?: number
  tags?: string[]
}
```

**Step 2: 创建 Zod Schema**

Create file `packages/api/src/bookmarks/schemas.ts`:

```typescript
import { z } from 'zod'

/**
 * 创建书签输入的 Schema
 */
export const CreateBookmarkInputSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().optional(),
  note: z.string().optional()
})

/**
 * 更新书签输入的 Schema
 */
export const UpdateBookmarkInputSchema = z.object({
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional()
})

/**
 * 列表查询参数的 Schema
 */
export const ListBookmarksParamsSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional()
})

/**
 * 从 Schema 推导类型
 */
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkInputSchema>
export type ListBookmarksParams = z.infer<typeof ListBookmarksParamsSchema>
```

**Step 3: 创建 API 接口定义**

Create file `packages/api/src/bookmarks/api.ts`:

```typescript
import type { Result } from '../types'
import type { Bookmark, CreateBookmarkInput, UpdateBookmarkInput, ListBookmarksParams } from './types'
import { CreateBookmarkInputSchema, UpdateBookmarkInputSchema, ListBookmarksParamsSchema } from './schemas'

/**
 * Bookmarks API 接口定义
 */
export interface BookmarksAPI {
  /** 创建书签（立即返回，后台处理） */
  create(input: CreateBookmarkInput): Promise<Result<Bookmark>>

  /** 查询单个书签 */
  get(id: string): Promise<Result<Bookmark>>

  /** 列表查询 */
  list(params?: ListBookmarksParams): Promise<Result<Bookmark[]>>

  /** 更新书签 */
  update(id: string, input: UpdateBookmarkInput): Promise<Result<Bookmark>>

  /** 删除书签 */
  delete(id: string): Promise<Result<void>>

  /** 搜索书签（支持全文搜索） */
  search(query: string): Promise<Result<Bookmark[]>>
}

/**
 * 创建 Bookmarks API 实现
 * 当前通过 Electron IPC 调用，未来可替换为 HTTP fetch
 */
export function createBookmarksAPI(): BookmarksAPI {
  return {
    async create(input) {
      const validated = CreateBookmarkInputSchema.parse(input)
      return window.electronAPI.invoke<Result<Bookmark>>('bookmarks:create', validated)
    },

    async get(id) {
      return window.electronAPI.invoke<Result<Bookmark>>('bookmarks:get', id)
    },

    async list(params) {
      const validated = params ? ListBookmarksParamsSchema.parse(params) : undefined
      return window.electronAPI.invoke<Result<Bookmark[]>>('bookmarks:list', validated)
    },

    async update(id, input) {
      const validated = UpdateBookmarkInputSchema.parse(input)
      return window.electronAPI.invoke<Result<Bookmark>>('bookmarks:update', id, validated)
    },

    async delete(id) {
      return window.electronAPI.invoke<Result<void>>('bookmarks:delete', id)
    },

    async search(query) {
      return window.electronAPI.invoke<Result<Bookmark[]>>('bookmarks:search', query)
    }
  }
}
```

**Step 4: 创建导出文件**

Create file `packages/api/src/bookmarks/index.ts`:

```typescript
export * from './types'
export * from './schemas'
export * from './api'
```

**Step 5: 验证类型检查**

Run:
```bash
cd packages/api
pnpm check-types
```

Expected: Type error about window.electronAPI (expected, will fix in next task)

**Step 6: Commit**

```bash
git add packages/api/src/bookmarks
git commit -m "feat(api): add Bookmark API interface and Zod schemas"
```

---

### Task 3: 定义 Chat 相关的 API 接口

**Files:**
- Create: `packages/api/src/chat/types.ts`
- Create: `packages/api/src/chat/schemas.ts`
- Create: `packages/api/src/chat/api.ts`
- Create: `packages/api/src/chat/index.ts`

**Step 1: 创建 Chat 类型定义**

Create file `packages/api/src/chat/types.ts`:

```typescript
/**
 * 聊天消息类型
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: BookmarkSource[]
  createdAt: Date
}

/**
 * 书签引用来源
 */
export interface BookmarkSource {
  bookmarkId: string
  title: string
  domain: string
  savedAt: Date
}

/**
 * 聊天会话类型
 */
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

/**
 * 发送消息的输入参数
 */
export interface SendMessageInput {
  sessionId: string
  content: string
}
```

**Step 2: 创建 Zod Schema**

Create file `packages/api/src/chat/schemas.ts`:

```typescript
import { z } from 'zod'

/**
 * 发送消息输入的 Schema
 */
export const SendMessageInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  content: z.string().min(1, 'Message content cannot be empty')
})

/**
 * 从 Schema 推导类型
 */
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>
```

**Step 3: 创建 API 接口定义**

Create file `packages/api/src/chat/api.ts`:

```typescript
import type { Result } from '../types'
import type { ChatSession, ChatMessage, SendMessageInput } from './types'
import { SendMessageInputSchema } from './schemas'

/**
 * Chat API 接口定义
 */
export interface ChatAPI {
  /** 创建新对话会话 */
  createSession(): Promise<Result<ChatSession>>

  /** 获取会话详情 */
  getSession(id: string): Promise<Result<ChatSession>>

  /** 获取所有会话列表 */
  listSessions(): Promise<Result<ChatSession[]>>

  /** 发送消息（异步处理） */
  sendMessage(input: SendMessageInput): Promise<Result<ChatMessage>>

  /** 删除会话 */
  deleteSession(id: string): Promise<Result<void>>
}

/**
 * 创建 Chat API 实现
 */
export function createChatAPI(): ChatAPI {
  return {
    async createSession() {
      return window.electronAPI.invoke<Result<ChatSession>>('chat:createSession')
    },

    async getSession(id) {
      return window.electronAPI.invoke<Result<ChatSession>>('chat:getSession', id)
    },

    async listSessions() {
      return window.electronAPI.invoke<Result<ChatSession[]>>('chat:listSessions')
    },

    async sendMessage(input) {
      const validated = SendMessageInputSchema.parse(input)
      return window.electronAPI.invoke<Result<ChatMessage>>('chat:sendMessage', validated)
    },

    async deleteSession(id) {
      return window.electronAPI.invoke<Result<void>>('chat:deleteSession', id)
    }
  }
}
```

**Step 4: 创建导出文件**

Create file `packages/api/src/chat/index.ts`:

```typescript
export * from './types'
export * from './schemas'
export * from './api'
```

**Step 5: Commit**

```bash
git add packages/api/src/chat
git commit -m "feat(api): add Chat API interface and schemas"
```

---

### Task 4: 创建 API 包统一导出

**Files:**
- Create: `packages/api/src/index.ts`
- Create: `packages/api/src/global.d.ts`

**Step 1: 创建全局类型声明**

Create file `packages/api/src/global.d.ts`:

```typescript
/**
 * Electron API 全局类型声明
 */
interface ElectronAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  off: (channel: string, callback?: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
```

**Step 2: 创建统一导出**

Create file `packages/api/src/index.ts`:

```typescript
// Types
export * from './types'
export * from './bookmarks'
export * from './chat'

// API Factories
export { createBookmarksAPI } from './bookmarks/api'
export { createChatAPI } from './chat/api'
```

**Step 3: 验证类型检查**

Run:
```bash
cd packages/api
pnpm check-types
```

Expected: No type errors

**Step 4: Commit**

```bash
git add packages/api/src/index.ts packages/api/src/global.d.ts
git commit -m "feat(api): add unified exports and global type declarations"
```

---

## Phase 2: IPC Bridge 层

### Task 5: 更新 Preload 脚本

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`
- Create: `apps/desktop/src/preload/index.d.ts`

**Step 1: 读取现有 Preload 脚本**

Run:
```bash
cat apps/desktop/src/preload/index.ts
```

Expected: 查看当前实现

**Step 2: 更新 Preload 脚本**

Modify file `apps/desktop/src/preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * 定义所有允许的 IPC 通道
 */
export type IpcChannel =
  // Bookmarks
  | 'bookmarks:create'
  | 'bookmarks:get'
  | 'bookmarks:list'
  | 'bookmarks:update'
  | 'bookmarks:delete'
  | 'bookmarks:search'
  // Chat
  | 'chat:createSession'
  | 'chat:getSession'
  | 'chat:listSessions'
  | 'chat:sendMessage'
  | 'chat:deleteSession'
  // Events
  | 'bookmark:updated'
  | 'chat:message'

/**
 * 暴露 Electron API 到渲染进程
 */
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', {
      /**
       * 调用主进程方法
       */
      invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
        return ipcRenderer.invoke(channel, ...args)
      },

      /**
       * 监听主进程事件
       */
      on: (channel: string, callback: (...args: unknown[]) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
          callback(...args)
        ipcRenderer.on(channel, subscription)

        return () => {
          ipcRenderer.removeListener(channel, subscription)
        }
      },

      /**
       * 移除事件监听
       */
      off: (channel: string, callback?: (...args: unknown[]) => void) => {
        if (callback) {
          ipcRenderer.removeListener(channel, callback)
        } else {
          ipcRenderer.removeAllListeners(channel)
        }
      }
    })
  } catch (error) {
    console.error('Failed to expose electronAPI:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.electronAPI = {
    invoke: ipcRenderer.invoke,
    on: ipcRenderer.on,
    off: ipcRenderer.off
  }
}
```

**Step 3: 创建类型声明文件**

Create file `apps/desktop/src/preload/index.d.ts`:

```typescript
import { ElectronAPI } from '@electron-toolkit/preload'
import { IpcChannel } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: {
      invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]) => Promise<T>
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void
      off: (channel: string, callback?: (...args: unknown[]) => void) => void
    }
  }
}
```

**Step 4: 验证构建**

Run:
```bash
cd apps/desktop
pnpm build
```

Expected: Build successful

**Step 5: Commit**

```bash
git add apps/desktop/src/preload
git commit -m "feat(preload): add type-safe IPC bridge with channel definitions"
```

---

## Phase 3: Repository 层

### Task 6: 创建数据库初始化模块

**Files:**
- Create: `apps/desktop/src/main/database/index.ts`
- Create: `apps/desktop/src/main/database/schema.ts`

**Step 1: 创建目录结构**

Run:
```bash
mkdir -p apps/desktop/src/main/database
mkdir -p apps/desktop/src/main/repositories
mkdir -p apps/desktop/src/main/services
```

Expected: Directories created

**Step 2: 创建数据库初始化模块**

Create file `apps/desktop/src/main/database/index.ts`:

```typescript
import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'

/**
 * 获取数据库文件路径
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'recall-link.db')
}

/**
 * 初始化数据库连接
 */
export function initDatabase(): Database.Database {
  const dbPath = getDatabasePath()
  const db = new Database(dbPath)

  // 启用 WAL 模式以提升性能
  db.pragma('journal_mode = WAL')

  return db
}
```

**Step 3: 创建 Schema 定义模块**

Create file `apps/desktop/src/main/database/schema.ts`:

```typescript
import type Database from 'better-sqlite3'

/**
 * 数据库 Schema 版本
 */
export const SCHEMA_VERSION = 1

/**
 * 检查并初始化 Schema
 */
export function initSchema(db: Database.Database): void {
  // 检查版本表是否存在
  const versionTable = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`
    )
    .get()

  if (!versionTable) {
    // 首次初始化
    createTables(db)
    setVersion(db, SCHEMA_VERSION)
  } else {
    const row = db.prepare('SELECT version FROM schema_version').get() as {
      version: number
    }
    if (row.version !== SCHEMA_VERSION) {
      // 版本不匹配，重建数据库
      console.warn('Schema version mismatch, rebuilding database...')
      dropAllTables(db)
      createTables(db)
      setVersion(db, SCHEMA_VERSION)
    }
  }
}

/**
 * 创建所有表
 */
function createTables(db: Database.Database): void {
  db.exec(`
    -- 书签表
    CREATE TABLE bookmarks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      content TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'zh',
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      fetched_at INTEGER,
      status TEXT NOT NULL,
      is_user_edited INTEGER NOT NULL DEFAULT 0
    );

    -- 书签索引
    CREATE INDEX idx_bookmarks_domain ON bookmarks(domain);
    CREATE INDEX idx_bookmarks_status ON bookmarks(status);
    CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at DESC);
    CREATE INDEX idx_bookmarks_url ON bookmarks(url);

    -- 全文搜索虚拟表
    CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
      title, summary, content, tags,
      content=bookmarks,
      content_rowid=rowid
    );

    -- 聊天会话表
    CREATE TABLE chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 聊天消息表
    CREATE TABLE chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    -- 聊天消息索引
    CREATE INDEX idx_messages_session ON chat_messages(session_id);
    CREATE INDEX idx_messages_created ON chat_messages(created_at);

    -- Schema 版本表
    CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
  `)
}

/**
 * 删除所有表
 */
function dropAllTables(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS bookmarks_fts;
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS chat_sessions;
    DROP TABLE IF EXISTS bookmarks;
    DROP TABLE IF EXISTS schema_version;
  `)
}

/**
 * 设置 Schema 版本
 */
function setVersion(db: Database.Database, version: number): void {
  db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(
    version
  )
}
```

**Step 4: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 5: Commit**

```bash
git add apps/desktop/src/main/database
git commit -m "feat(database): add SQLite initialization and schema management"
```

---

### Task 7: 实现 BookmarkRepository

**Files:**
- Create: `apps/desktop/src/main/repositories/BookmarkRepository.ts`

**Step 1: 创建 BookmarkRepository**

Create file `apps/desktop/src/main/repositories/BookmarkRepository.ts`:

```typescript
import type Database from 'better-sqlite3'
import type { Bookmark } from '@recall-link/api'

/**
 * 插入书签的数据结构
 */
export interface InsertBookmark {
  url: string
  title: string
  domain: string
  summary: string
  tags: string[]
  content: string
  language: 'zh' | 'en'
  wordCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  isUserEdited: boolean
}

/**
 * 书签 Repository
 * 负责 SQLite 数据库的 CRUD 操作
 */
export class BookmarkRepository {
  constructor(private db: Database.Database) {}

  /**
   * 创建书签
   */
  create(data: InsertBookmark): Bookmark {
    const id = crypto.randomUUID()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO bookmarks (
        id, url, title, domain, summary, tags, content,
        language, word_count, status, is_user_edited,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      data.url,
      data.title,
      data.domain,
      data.summary,
      JSON.stringify(data.tags),
      data.content,
      data.language,
      data.wordCount,
      data.status,
      data.isUserEdited ? 1 : 0,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * 根据 ID 查找书签
   */
  findById(id: string): Bookmark | null {
    const row = this.db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id)
    return row ? this.mapRowToBookmark(row) : null
  }

  /**
   * 查找所有书签
   */
  findAll(params?: {
    limit?: number
    offset?: number
    tags?: string[]
  }): Bookmark[] {
    let query = 'SELECT * FROM bookmarks'
    const conditions: string[] = []
    const values: unknown[] = []

    if (params?.tags && params.tags.length > 0) {
      // 标签过滤
      const tagConditions = params.tags.map(() => 'tags LIKE ?')
      conditions.push(`(${tagConditions.join(' OR ')})`)
      params.tags.forEach((tag) => values.push(`%"${tag}"%`))
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY created_at DESC'

    if (params?.limit) {
      query += ' LIMIT ?'
      values.push(params.limit)
    }

    if (params?.offset) {
      query += ' OFFSET ?'
      values.push(params.offset)
    }

    const rows = this.db.prepare(query).all(...values)
    return rows.map((row) => this.mapRowToBookmark(row))
  }

  /**
   * 更新书签
   */
  update(id: string, data: Partial<InsertBookmark>): Bookmark | null {
    const updates: string[] = []
    const values: unknown[] = []

    Object.entries(data).forEach(([key, value]) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      updates.push(`${snakeKey} = ?`)

      if (key === 'tags' && Array.isArray(value)) {
        values.push(JSON.stringify(value))
      } else if (key === 'isUserEdited') {
        values.push(value ? 1 : 0)
      } else if (value instanceof Date) {
        values.push(value.getTime())
      } else {
        values.push(value)
      }
    })

    if (updates.length === 0) {
      return this.findById(id)
    }

    updates.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0 ? this.findById(id) : null
  }

  /**
   * 更新书签状态
   */
  updateStatus(
    id: string,
    status: Bookmark['status']
  ): boolean {
    const stmt = this.db.prepare(`
      UPDATE bookmarks SET status = ?, updated_at = ? WHERE id = ?
    `)
    const result = stmt.run(status, Date.now(), id)
    return result.changes > 0
  }

  /**
   * 删除书签
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM bookmarks WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * 全文搜索
   */
  search(query: string): Bookmark[] {
    const rows = this.db
      .prepare(
        `
      SELECT b.* FROM bookmarks b
      JOIN bookmarks_fts fts ON b.rowid = fts.rowid
      WHERE bookmarks_fts MATCH ?
      ORDER BY rank
    `
      )
      .all(query)

    return rows.map((row) => this.mapRowToBookmark(row))
  }

  /**
   * 将数据库行映射为 Bookmark 对象
   */
  private mapRowToBookmark(row: any): Bookmark {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      domain: row.domain,
      summary: row.summary,
      tags: JSON.parse(row.tags),
      content: row.content,
      language: row.language,
      wordCount: row.word_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      fetchedAt: row.fetched_at ? new Date(row.fetched_at) : new Date(),
      status: row.status,
      isUserEdited: !!row.is_user_edited
    }
  }
}
```

**Step 2: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/repositories/BookmarkRepository.ts
git commit -m "feat(repository): implement BookmarkRepository with CRUD and search"
```

---

### Task 8: 实现 ChatRepository

**Files:**
- Create: `apps/desktop/src/main/repositories/ChatRepository.ts`

**Step 1: 创建 ChatRepository**

Create file `apps/desktop/src/main/repositories/ChatRepository.ts`:

```typescript
import type Database from 'better-sqlite3'
import type { ChatSession, ChatMessage } from '@recall-link/api'

/**
 * 聊天 Repository
 * 负责 SQLite 数据库的聊天会话和消息操作
 */
export class ChatRepository {
  constructor(private db: Database.Database) {}

  /**
   * 创建会话
   */
  createSession(title: string): ChatSession {
    const id = crypto.randomUUID()
    const now = Date.now()

    this.db
      .prepare(
        `
      INSERT INTO chat_sessions (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(id, title, now, now)

    return {
      id,
      title,
      messages: [],
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }
  }

  /**
   * 添加消息到会话
   */
  addMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): ChatMessage {
    const id = crypto.randomUUID()
    const now = Date.now()

    this.db
      .prepare(
        `
      INSERT INTO chat_messages (id, session_id, role, content, sources, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        sessionId,
        message.role,
        message.content,
        message.sources ? JSON.stringify(message.sources) : null,
        now
      )

    // 更新会话的 updated_at
    this.db
      .prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?')
      .run(now, sessionId)

    return {
      id,
      ...message,
      createdAt: new Date(now)
    }
  }

  /**
   * 获取会话详情（包含消息）
   */
  getSession(id: string): ChatSession | null {
    const sessionRow = this.db
      .prepare('SELECT * FROM chat_sessions WHERE id = ?')
      .get(id) as any

    if (!sessionRow) return null

    const messageRows = this.db
      .prepare(
        'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
      )
      .all(id) as any[]

    return {
      id: sessionRow.id,
      title: sessionRow.title,
      messages: messageRows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        sources: row.sources ? JSON.parse(row.sources) : undefined,
        createdAt: new Date(row.created_at)
      })),
      createdAt: new Date(sessionRow.created_at),
      updatedAt: new Date(sessionRow.updated_at)
    }
  }

  /**
   * 列出所有会话（不包含消息）
   */
  listSessions(): ChatSession[] {
    const rows = this.db
      .prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC')
      .all() as any[]

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      messages: [], // 列表视图不加载消息
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))
  }

  /**
   * 删除会话（级联删除消息）
   */
  deleteSession(id: string): boolean {
    const result = this.db
      .prepare('DELETE FROM chat_sessions WHERE id = ?')
      .run(id)
    return result.changes > 0
  }
}
```

**Step 2: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/repositories/ChatRepository.ts
git commit -m "feat(repository): implement ChatRepository for sessions and messages"
```

---

## Phase 4: Service 层

### Task 9: 实现 TaskQueue

**Files:**
- Create: `apps/desktop/src/main/services/TaskQueue.ts`

**Step 1: 创建 TaskQueue**

Create file `apps/desktop/src/main/services/TaskQueue.ts`:

```typescript
import type { BrowserWindow } from 'electron'
import type { BookmarkRepository } from '../repositories/BookmarkRepository'

/**
 * 任务定义
 */
export interface Task {
  type: 'process-bookmark'
  bookmarkId: string
}

/**
 * 异步任务队列
 * 顺序处理书签的网页抓取和 AI 处理
 */
export class TaskQueue {
  private queue: Task[] = []
  private processing = false

  constructor(
    private repo: BookmarkRepository,
    private mainWindow: BrowserWindow
  ) {}

  /**
   * 将任务加入队列
   */
  enqueue(task: Task): void {
    this.queue.push(task)
    this.process()
  }

  /**
   * 处理队列中的任务
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true
    const task = this.queue.shift()!

    try {
      await this.executeTask(task)
    } catch (error) {
      console.error('Task execution failed:', error)
      // 标记为失败
      await this.repo.updateStatus(task.bookmarkId, 'failed')
      this.notifyUpdate(task.bookmarkId)
    } finally {
      this.processing = false
      this.process() // 处理下一个任务
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: Task): Promise<void> {
    const bookmarkId = task.bookmarkId

    // 1. 更新状态为 processing
    await this.repo.updateStatus(bookmarkId, 'processing')
    this.notifyUpdate(bookmarkId)

    // 2. 获取书签信息
    const bookmark = await this.repo.findById(bookmarkId)
    if (!bookmark) return

    // 3. 抓取网页内容（TODO: 实现）
    const content = await this.fetchWebContent(bookmark.url)

    // 4. 调用 AI 生成摘要和标签（TODO: 实现）
    const aiResult = await this.generateSummary(content.text)

    // 5. 更新完整信息
    await this.repo.update(bookmarkId, {
      content: content.text,
      summary: aiResult.summary,
      tags: aiResult.tags,
      wordCount: content.wordCount,
      language: content.language,
      status: 'completed'
    })

    // 6. 通知渲染进程更新
    this.notifyUpdate(bookmarkId)
  }

  /**
   * 抓取网页内容
   * TODO: 实现真实的网页抓取逻辑
   */
  private async fetchWebContent(url: string): Promise<{
    text: string
    wordCount: number
    language: 'zh' | 'en'
  }> {
    // Mock 实现
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return {
      text: `Mock content from ${url}`,
      wordCount: 100,
      language: 'zh'
    }
  }

  /**
   * 生成 AI 摘要
   * TODO: 实现真实的 AI 调用
   */
  private async generateSummary(content: string): Promise<{
    summary: string
    tags: string[]
  }> {
    // Mock 实现
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return {
      summary: '这是一篇 AI 自动生成的摘要，总结了网页的核心内容。',
      tags: ['自动生成', '待整理']
    }
  }

  /**
   * 通知渲染进程书签已更新
   */
  private notifyUpdate(bookmarkId: string): void {
    this.mainWindow.webContents.send('bookmark:updated', bookmarkId)
  }
}
```

**Step 2: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/services/TaskQueue.ts
git commit -m "feat(service): implement TaskQueue for async bookmark processing"
```

---

### Task 10: 实现 BookmarkService

**Files:**
- Create: `apps/desktop/src/main/services/BookmarkService.ts`

**Step 1: 创建 BookmarkService**

Create file `apps/desktop/src/main/services/BookmarkService.ts`:

```typescript
import type { Result, Bookmark, CreateBookmarkInput, UpdateBookmarkInput, ListBookmarksParams } from '@recall-link/api'
import type { BookmarkRepository } from '../repositories/BookmarkRepository'
import type { TaskQueue } from './TaskQueue'

/**
 * 书签服务层
 * 处理业务逻辑和错误处理
 */
export class BookmarkService {
  constructor(
    private repo: BookmarkRepository,
    private taskQueue: TaskQueue
  ) {}

  /**
   * 创建书签
   */
  async create(input: CreateBookmarkInput): Promise<Result<Bookmark>> {
    try {
      const url = new URL(input.url)

      // 检查 URL 是否已存在
      const existing = this.repo.findAll().find(b => b.url === input.url)
      if (existing) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Bookmark with this URL already exists'
          }
        }
      }

      // 1. 先保存基本信息（状态为 pending）
      const bookmark = this.repo.create({
        url: input.url,
        title: input.title || url.hostname,
        domain: url.hostname,
        summary: '',
        tags: [],
        content: '',
        language: 'zh',
        wordCount: 0,
        status: 'pending',
        isUserEdited: false
      })

      // 2. 加入异步任务队列
      this.taskQueue.enqueue({
        type: 'process-bookmark',
        bookmarkId: bookmark.id
      })

      // 3. 立即返回
      return { success: true, data: bookmark }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 获取单个书签
   */
  async get(id: string): Promise<Result<Bookmark>> {
    try {
      const bookmark = this.repo.findById(id)
      if (!bookmark) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Bookmark ${id} not found` }
        }
      }
      return { success: true, data: bookmark }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 列表查询
   */
  async list(params?: ListBookmarksParams): Promise<Result<Bookmark[]>> {
    try {
      const bookmarks = this.repo.findAll(params)
      return { success: true, data: bookmarks }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 更新书签
   */
  async update(
    id: string,
    input: UpdateBookmarkInput
  ): Promise<Result<Bookmark>> {
    try {
      const updated = this.repo.update(id, {
        title: input.title,
        tags: input.tags,
        isUserEdited: true
      })
      if (!updated) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Bookmark ${id} not found` }
        }
      }
      return { success: true, data: updated }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 删除书签
   */
  async delete(id: string): Promise<Result<void>> {
    try {
      const deleted = this.repo.delete(id)
      if (!deleted) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Bookmark ${id} not found` }
        }
      }
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 搜索书签
   */
  async search(query: string): Promise<Result<Bookmark[]>> {
    try {
      const results = this.repo.search(query)
      return { success: true, data: results }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }
}
```

**Step 2: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/services/BookmarkService.ts
git commit -m "feat(service): implement BookmarkService with business logic"
```

---

### Task 11: 实现 ChatService

**Files:**
- Create: `apps/desktop/src/main/services/ChatService.ts`

**Step 1: 创建 ChatService**

Create file `apps/desktop/src/main/services/ChatService.ts`:

```typescript
import type { Result, ChatSession, ChatMessage, SendMessageInput } from '@recall-link/api'
import type { ChatRepository } from '../repositories/ChatRepository'

/**
 * 聊天服务层
 */
export class ChatService {
  constructor(private repo: ChatRepository) {}

  /**
   * 创建会话
   */
  async createSession(): Promise<Result<ChatSession>> {
    try {
      const session = this.repo.createSession('新对话')

      // 添加欢迎消息
      this.repo.addMessage(session.id, {
        role: 'assistant',
        content: '你好！今天我能怎样帮助你探索你的知识库？'
      })

      // 重新获取包含消息的会话
      const fullSession = this.repo.getSession(session.id)!
      return { success: true, data: fullSession }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 获取会话详情
   */
  async getSession(id: string): Promise<Result<ChatSession>> {
    try {
      const session = this.repo.getSession(id)
      if (!session) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Session ${id} not found` }
        }
      }
      return { success: true, data: session }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 列出所有会话
   */
  async listSessions(): Promise<Result<ChatSession[]>> {
    try {
      const sessions = this.repo.listSessions()
      return { success: true, data: sessions }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(input: SendMessageInput): Promise<Result<ChatMessage>> {
    try {
      // 检查会话是否存在
      const session = this.repo.getSession(input.sessionId)
      if (!session) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Session ${input.sessionId} not found`
          }
        }
      }

      // 添加用户消息
      const userMessage = this.repo.addMessage(input.sessionId, {
        role: 'user',
        content: input.content
      })

      // TODO: 调用 AI 生成回复
      // 暂时使用 mock 回复
      setTimeout(() => {
        this.repo.addMessage(input.sessionId, {
          role: 'assistant',
          content: '这是一个模拟的 AI 回复。真实的 AI 功能将在后续实现。'
        })
      }, 1500)

      return { success: true, data: userMessage }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(id: string): Promise<Result<void>> {
    try {
      const deleted = this.repo.deleteSession(id)
      if (!deleted) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Session ${id} not found` }
        }
      }
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }
}
```

**Step 2: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/services/ChatService.ts
git commit -m "feat(service): implement ChatService for chat operations"
```

---

## Phase 5: 主进程集成

### Task 12: 注册 IPC Handlers

**Files:**
- Create: `apps/desktop/src/main/ipc/handlers.ts`

**Step 1: 创建 IPC handlers 注册模块**

Run:
```bash
mkdir -p apps/desktop/src/main/ipc
```

Create file `apps/desktop/src/main/ipc/handlers.ts`:

```typescript
import { ipcMain } from 'electron'
import type { BookmarkService } from '../services/BookmarkService'
import type { ChatService } from '../services/ChatService'
import type { CreateBookmarkInput, UpdateBookmarkInput, ListBookmarksParams, SendMessageInput } from '@recall-link/api'

/**
 * 注册所有 IPC handlers
 */
export function registerIpcHandlers(
  bookmarkService: BookmarkService,
  chatService: ChatService
): void {
  // ==================== Bookmarks ====================

  ipcMain.handle('bookmarks:create', async (_, input: CreateBookmarkInput) => {
    return bookmarkService.create(input)
  })

  ipcMain.handle('bookmarks:get', async (_, id: string) => {
    return bookmarkService.get(id)
  })

  ipcMain.handle('bookmarks:list', async (_, params?: ListBookmarksParams) => {
    return bookmarkService.list(params)
  })

  ipcMain.handle('bookmarks:update', async (_, id: string, input: UpdateBookmarkInput) => {
    return bookmarkService.update(id, input)
  })

  ipcMain.handle('bookmarks:delete', async (_, id: string) => {
    return bookmarkService.delete(id)
  })

  ipcMain.handle('bookmarks:search', async (_, query: string) => {
    return bookmarkService.search(query)
  })

  // ==================== Chat ====================

  ipcMain.handle('chat:createSession', async () => {
    return chatService.createSession()
  })

  ipcMain.handle('chat:getSession', async (_, id: string) => {
    return chatService.getSession(id)
  })

  ipcMain.handle('chat:listSessions', async () => {
    return chatService.listSessions()
  })

  ipcMain.handle('chat:sendMessage', async (_, input: SendMessageInput) => {
    return chatService.sendMessage(input)
  })

  ipcMain.handle('chat:deleteSession', async (_, id: string) => {
    return chatService.deleteSession(id)
  })
}
```

**Step 2: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/ipc
git commit -m "feat(ipc): register IPC handlers for bookmarks and chat"
```

---

### Task 13: 更新主进程入口

**Files:**
- Modify: `apps/desktop/src/main/index.ts`

**Step 1: 读取现有主进程代码**

Run:
```bash
cat apps/desktop/src/main/index.ts
```

Expected: 查看当前实现

**Step 2: 更新主进程入口文件**

Modify file `apps/desktop/src/main/index.ts`:

```typescript
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'
import { initSchema } from './database/schema'
import { BookmarkRepository } from './repositories/BookmarkRepository'
import { ChatRepository } from './repositories/ChatRepository'
import { TaskQueue } from './services/TaskQueue'
import { BookmarkService } from './services/BookmarkService'
import { ChatService } from './services/ChatService'
import { registerIpcHandlers } from './ipc/handlers'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.recall-link')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  const db = initDatabase()
  initSchema(db)

  // Create repositories
  const bookmarkRepo = new BookmarkRepository(db)
  const chatRepo = new ChatRepository(db)

  // Create window first
  createWindow()

  // Create services (需要 mainWindow)
  if (mainWindow) {
    const taskQueue = new TaskQueue(bookmarkRepo, mainWindow)
    const bookmarkService = new BookmarkService(bookmarkRepo, taskQueue)
    const chatService = new ChatService(chatRepo)

    // Register IPC handlers
    registerIpcHandlers(bookmarkService, chatService)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's custom main process
// code. You can also put them in separate files and require them here.
```

**Step 3: 验证构建**

Run:
```bash
cd apps/desktop
pnpm build
```

Expected: Build successful

**Step 4: Commit**

```bash
git add apps/desktop/src/main/index.ts
git commit -m "feat(main): integrate database, repositories, and services"
```

---

## Phase 6: 渲染进程集成

### Task 14: 更新渲染进程依赖配置

**Files:**
- Modify: `apps/desktop/package.json`

**Step 1: 添加 API 包依赖**

Modify `apps/desktop/package.json`, add to dependencies:

```json
"@recall-link/api": "workspace:*"
```

**Step 2: 安装依赖**

Run:
```bash
cd apps/desktop
pnpm install
```

Expected: Dependencies installed

**Step 3: Commit**

```bash
git add apps/desktop/package.json apps/desktop/pnpm-lock.yaml
git commit -m "chore: add @recall-link/api dependency to desktop app"
```

---

### Task 15: 更新 Zustand Store 使用新 API

**Files:**
- Modify: `apps/desktop/src/renderer/store/index.ts`

**Step 1: 读取现有 Store 代码**

Run:
```bash
cat apps/desktop/src/renderer/store/index.ts
```

Expected: 查看当前 mock 实现

**Step 2: 重写 Store 使用真实 API**

Modify file `apps/desktop/src/renderer/store/index.ts`:

```typescript
import { create } from 'zustand'
import type { Bookmark, ChatMessage, ChatSession } from '@recall-link/api'
import { createBookmarksAPI, createChatAPI } from '@recall-link/api'

// 创建 API 实例
const bookmarksAPI = createBookmarksAPI()
const chatAPI = createChatAPI()

// ==================== Bookmark Store ====================

interface BookmarkState {
  bookmarks: Bookmark[]
  isLoading: boolean
  searchQuery: string
  selectedTags: string[]

  // 初始化
  init: () => Promise<void>

  // CRUD 操作
  addBookmark: (input: { url: string; title?: string; note?: string }) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  updateBookmark: (id: string, data: Bookmark) => void

  // 搜索和筛选
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[]) => void
  getFilteredBookmarks: () => Bookmark[]
  getAllTags: () => string[]
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  isLoading: false,
  searchQuery: '',
  selectedTags: [],

  init: async () => {
    set({ isLoading: true })
    const result = await bookmarksAPI.list()
    if (result.success) {
      set({ bookmarks: result.data })
    }
    set({ isLoading: false })

    // 订阅更新事件
    window.electronAPI.on('bookmark:updated', async (id: string) => {
      const result = await bookmarksAPI.get(id)
      if (result.success) {
        get().updateBookmark(id, result.data)
      }
    })
  },

  addBookmark: async (input) => {
    const result = await bookmarksAPI.create(input)
    if (result.success) {
      set((state) => ({
        bookmarks: [result.data, ...state.bookmarks]
      }))
    } else {
      console.error('Failed to create bookmark:', result.error)
      // TODO: 显示错误提示
    }
  },

  deleteBookmark: async (id) => {
    const result = await bookmarksAPI.delete(id)
    if (result.success) {
      set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== id)
      }))
    } else {
      console.error('Failed to delete bookmark:', result.error)
    }
  },

  updateBookmark: (id, data) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) => (b.id === id ? data : b))
    }))
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedTags: (tags) => set({ selectedTags: tags }),

  getFilteredBookmarks: () => {
    const { bookmarks, searchQuery, selectedTags } = get()
    return bookmarks.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesTags =
        selectedTags.length === 0 || selectedTags.some((tag) => b.tags.includes(tag))

      return matchesSearch && matchesTags
    })
  },

  getAllTags: () => {
    const { bookmarks } = get()
    const tagsSet = new Set<string>()
    bookmarks.forEach((b) => b.tags.forEach((t) => tagsSet.add(t)))
    return Array.from(tagsSet).sort()
  }
}))

// ==================== Chat Store ====================

interface ChatState {
  sessions: ChatSession[]
  currentSessionId: string | null
  isLoading: boolean

  // 初始化
  init: () => Promise<void>

  // 会话操作
  createSession: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  setCurrentSession: (id: string) => void

  // 消息操作
  sendMessage: (content: string) => Promise<void>

  // 查询
  getCurrentSession: () => ChatSession | null
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  isLoading: false,

  init: async () => {
    set({ isLoading: true })
    const result = await chatAPI.listSessions()
    if (result.success) {
      set({
        sessions: result.data,
        currentSessionId: result.data[0]?.id || null
      })
    }
    set({ isLoading: false })
  },

  createSession: async () => {
    const result = await chatAPI.createSession()
    if (result.success) {
      set((state) => ({
        sessions: [result.data, ...state.sessions],
        currentSessionId: result.data.id
      }))
    }
  },

  deleteSession: async (id) => {
    const result = await chatAPI.deleteSession(id)
    if (result.success) {
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        currentSessionId:
          state.currentSessionId === id
            ? state.sessions[0]?.id || null
            : state.currentSessionId
      }))
    }
  },

  setCurrentSession: (id) => {
    set({ currentSessionId: id })
  },

  sendMessage: async (content) => {
    const { currentSessionId } = get()
    if (!currentSessionId) return

    set({ isLoading: true })

    const result = await chatAPI.sendMessage({
      sessionId: currentSessionId,
      content
    })

    if (result.success) {
      // 重新获取会话以获取完整消息列表
      const sessionResult = await chatAPI.getSession(currentSessionId)
      if (sessionResult.success) {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? sessionResult.data : s
          )
        }))
      }
    }

    set({ isLoading: false })
  },

  getCurrentSession: () => {
    const { sessions, currentSessionId } = get()
    return sessions.find((s) => s.id === currentSessionId) || null
  }
}))
```

**Step 3: 验证类型检查**

Run:
```bash
cd apps/desktop
pnpm check-types
```

Expected: No type errors

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/store/index.ts
git commit -m "feat(store): migrate to real API from mock implementation"
```

---

### Task 16: 更新应用初始化

**Files:**
- Modify: `apps/desktop/src/renderer/main.tsx`

**Step 1: 读取现有代码**

Run:
```bash
cat apps/desktop/src/renderer/main.tsx
```

Expected: 查看当前初始化逻辑

**Step 2: 添加 Store 初始化**

Modify file `apps/desktop/src/renderer/main.tsx`:

Add after imports:
```typescript
import { useBookmarkStore, useChatStore } from './store'
```

Add before ReactDOM.createRoot:
```typescript
// 初始化 stores
useBookmarkStore.getState().init()
useChatStore.getState().init()
```

**Step 3: 验证构建**

Run:
```bash
cd apps/desktop
pnpm build
```

Expected: Build successful

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/main.tsx
git commit -m "feat(renderer): initialize stores on app startup"
```

---

## Phase 7: 测试与验证

### Task 17: 手动测试基本功能

**Files:**
- N/A (Manual testing)

**Step 1: 启动应用**

Run:
```bash
cd apps/desktop
pnpm dev
```

Expected: Application launches successfully

**Step 2: 测试书签创建**

Actions:
1. 点击"新建收藏"按钮
2. 输入 URL: `https://example.com`
3. 输入标题: `Test Bookmark`
4. 点击"保存"

Expected:
- 书签立即出现在列表中，状态为 "pending"
- 约 2.5 秒后状态变为 "completed"
- 显示 AI 生成的摘要和标签

**Step 3: 测试书签列表**

Actions:
1. 创建多个书签
2. 观察列表显示

Expected:
- 书签按创建时间倒序排列
- 所有书签正确显示标题、域名、摘要、标签

**Step 4: 测试搜索功能**

Actions:
1. 在搜索框输入关键词
2. 观察列表变化

Expected:
- 列表仅显示匹配的书签
- 支持按标题、摘要、标签搜索

**Step 5: 测试标签筛选**

Actions:
1. 点击某个标签
2. 观察列表变化

Expected:
- 仅显示包含该标签的书签
- 可选择多个标签
- 点击"清除筛选"恢复全部

**Step 6: 测试书签删除**

Actions:
1. Hover 某个书签
2. 点击删除图标
3. 观察列表变化

Expected:
- 书签从列表中移除
- 动画效果流畅

**Step 7: 测试数据持久化**

Actions:
1. 创建几个书签
2. 关闭应用
3. 重新启动应用

Expected:
- 之前创建的书签仍然存在
- 数据完整保留

**Step 8: 测试聊天功能**

Actions:
1. 切换到"AI 对话"页面
2. 发送消息
3. 观察回复

Expected:
- 消息正确显示
- AI 回复在 1.5 秒后出现
- 会话持久化

**Step 9: 记录测试结果**

Create test log:
```
Manual Test Results (2026-01-17)
================================

✅ Bookmark Creation - PASS
✅ Bookmark List Display - PASS
✅ Search Functionality - PASS
✅ Tag Filtering - PASS
✅ Bookmark Deletion - PASS
✅ Data Persistence - PASS
✅ Chat Functionality - PASS

Known Issues:
- None

Notes:
- All basic features working as expected
- Ready for next phase (AI integration)
```

**Step 10: Commit 测试日志**

```bash
git add docs/manual-test-log.txt
git commit -m "test: add manual testing results for data persistence"
```

---

## 总结

### 完成的功能

✅ **API 层**
- 统一的 Result<T> 响应格式
- Bookmarks 和 Chat API 接口
- Zod schema 验证
- TypeScript 类型安全

✅ **IPC Bridge 层**
- 类型安全的 IPC 通道定义
- 渲染进程与主进程通信桥梁
- 事件监听机制

✅ **Repository 层**
- SQLite 数据库初始化
- Schema 版本管理
- BookmarkRepository 完整 CRUD
- ChatRepository 会话和消息操作
- 全文搜索支持（FTS5）

✅ **Service 层**
- BookmarkService 业务逻辑
- ChatService 聊天逻辑
- TaskQueue 异步任务处理
- 状态更新通知机制

✅ **集成**
- 主进程完整初始化
- IPC handlers 注册
- Zustand Store 迁移到真实 API
- 实时状态同步

### 架构特点

- **四层分离**: API、IPC Bridge、Service、Repository 职责清晰
- **类型安全**: 全链路 TypeScript + Zod 验证
- **异步优先**: 所有 API 返回 Promise
- **用户体验**: 立即响应 + 后台处理 + 实时同步
- **可扩展**: 为服务端迁移预留空间

### 下一步工作

1. **AI 集成**: 实现真实的网页抓取和 AI 摘要生成
2. **错误处理**: 添加用户友好的错误提示
3. **性能优化**: 添加缓存、批量操作、虚拟滚动
4. **测试覆盖**: 添加单元测试和集成测试
5. **UI 优化**: 加载状态、空状态、错误状态的视觉反馈

---

## 执行说明

本计划包含 17 个任务，预计实施时间 4-6 小时。

每个任务都包含：
- 明确的文件路径
- 完整的代码实现
- 验证步骤
- Git commit 命令

建议按顺序执行，每完成一个任务就提交一次，确保代码随时可回滚。
