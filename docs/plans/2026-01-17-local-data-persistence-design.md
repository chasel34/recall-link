# 本地数据持久化系统设计

**日期**: 2026-01-17
**状态**: 已验证
**目标**: 构建支持本地 SQLite 存储，且为未来服务端迁移预留扩展的数据访问层

## 设计目标

1. **本地优先**: 使用 SQLite 提供快速可靠的本地存储
2. **服务端就绪**: API 设计可无缝迁移到 HTTP 服务端
3. **异步优先**: 所有 API 返回 Promise，统一异步模型
4. **类型安全**: 使用 Zod 进行运行时验证 + TypeScript 类型推导
5. **用户体验**: 后台任务队列处理耗时操作，立即响应用户

## 整体架构

### 四层架构设计

```
┌─────────────────────────────────────────────┐
│  渲染进程 (Renderer Process)                 │
│  ┌───────────────────────────────────────┐  │
│  │ API 层 (packages/api)                 │  │
│  │ - 类 REST API 风格                    │  │
│  │ - 统一 Result<T> 格式                 │  │
│  │ - Zod 验证输入输出                    │  │
│  └───────────────────────────────────────┘  │
│              ↕ window.electronAPI.invoke    │
└─────────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────┐
│  Preload 脚本                                │
│  ┌───────────────────────────────────────┐  │
│  │ IPC Bridge 层                         │  │
│  │ - 暴露类型安全的 invoke 方法          │  │
│  │ - 定义 IPC 通道类型                   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────┐
│  主进程 (Main Process)                       │
│  ┌───────────────────────────────────────┐  │
│  │ Service 层                            │  │
│  │ - 业务逻辑处理                        │  │
│  │ - 异步任务队列管理                    │  │
│  │ - 状态更新通知                        │  │
│  └───────────────────────────────────────┘  │
│              ↕                              │
│  ┌───────────────────────────────────────┐  │
│  │ Repository 层                         │  │
│  │ - SQLite 数据访问                     │  │
│  │ - Schema 版本管理                     │  │
│  │ - 基础 CRUD 操作                      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 分层职责

**API 层** (渲染进程)
- 提供类 REST 风格的接口给应用使用
- 当前通过 Electron IPC 调用主进程
- 未来可替换为 HTTP fetch 调用服务端

**IPC Bridge 层** (Preload)
- 仅负责消息传递，不含业务逻辑
- 提供类型安全的通道定义
- 渲染进程与主进程的唯一通信桥梁

**Service 层** (主进程)
- 处理业务逻辑（如书签添加后触发 AI 处理）
- 管理异步任务队列
- 调用 Repository 进行数据持久化

**Repository 层** (主进程)
- 封装 SQLite 数据库操作
- Schema 初始化与版本管理
- 提供基础 CRUD 方法

## API 设计

### 统一响应格式

所有 API 返回统一的 `Result<T>` 类型：

```typescript
// packages/api/src/types.ts
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }

export interface ApiError {
  code: ErrorCode
  message: string
}

export type ErrorCode =
  | 'NOT_FOUND'           // 资源不存在
  | 'VALIDATION_ERROR'    // 输入验证失败
  | 'UNKNOWN'            // 未知错误
```

### Bookmarks API

```typescript
// packages/api/src/bookmarks.ts
import { z } from 'zod'

// Zod Schema 定义
export const CreateBookmarkInputSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  note: z.string().optional()
})

export const UpdateBookmarkInputSchema = z.object({
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional()
})

export const ListBookmarksParamsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  tags: z.array(z.string()).optional()
})

// TypeScript 类型推导
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkInputSchema>
export type ListBookmarksParams = z.infer<typeof ListBookmarksParamsSchema>

// API 接口定义
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

// API 实现
export const bookmarksAPI: BookmarksAPI = {
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
```

### Chat API

```typescript
// packages/api/src/chat.ts
export interface ChatAPI {
  /** 创建新对话会话 */
  createSession(): Promise<Result<ChatSession>>

  /** 获取会话详情 */
  getSession(id: string): Promise<Result<ChatSession>>

  /** 获取所有会话列表 */
  listSessions(): Promise<Result<ChatSession[]>>

  /** 发送消息（异步处理） */
  sendMessage(sessionId: string, content: string): Promise<Result<ChatMessage>>

  /** 删除会话 */
  deleteSession(id: string): Promise<Result<void>>
}
```

## IPC Bridge 层

### Preload 脚本

```typescript
// apps/desktop/src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// 定义所有允许的 IPC 通道
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

// 暴露类型安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 调用主进程方法
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
    return ipcRenderer.invoke(channel, ...args)
  },

  // 监听主进程事件
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },

  // 移除监听
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
})

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: {
      invoke: <T>(channel: IpcChannel, ...args: unknown[]) => Promise<T>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
```

## Service 层

### BookmarkService

```typescript
// apps/desktop/src/main/services/BookmarkService.ts
import type { BookmarkRepository } from '../repositories/BookmarkRepository'
import type { TaskQueue } from './TaskQueue'
import type { Result, CreateBookmarkInput, UpdateBookmarkInput } from '@recall-link/api'

export class BookmarkService {
  constructor(
    private repo: BookmarkRepository,
    private taskQueue: TaskQueue
  ) {}

  async create(input: CreateBookmarkInput): Promise<Result<Bookmark>> {
    try {
      const url = new URL(input.url)

      // 1. 先保存基本信息（状态为 pending）
      const bookmark = await this.repo.create({
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

  async get(id: string): Promise<Result<Bookmark>> {
    try {
      const bookmark = await this.repo.findById(id)
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
        error: { code: 'UNKNOWN', message: error.message }
      }
    }
  }

  async list(params?: ListBookmarksParams): Promise<Result<Bookmark[]>> {
    try {
      const bookmarks = await this.repo.findAll(params)
      return { success: true, data: bookmarks }
    } catch (error) {
      return {
        success: false,
        error: { code: 'UNKNOWN', message: error.message }
      }
    }
  }

  async update(id: string, input: UpdateBookmarkInput): Promise<Result<Bookmark>> {
    try {
      const updated = await this.repo.update(id, input)
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
        error: { code: 'UNKNOWN', message: error.message }
      }
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const deleted = await this.repo.delete(id)
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
        error: { code: 'UNKNOWN', message: error.message }
      }
    }
  }

  async search(query: string): Promise<Result<Bookmark[]>> {
    try {
      const results = await this.repo.search(query)
      return { success: true, data: results }
    } catch (error) {
      return {
        success: false,
        error: { code: 'UNKNOWN', message: error.message }
      }
    }
  }
}
```

### 异步任务队列

```typescript
// apps/desktop/src/main/services/TaskQueue.ts
import type { BrowserWindow } from 'electron'
import type { BookmarkRepository } from '../repositories/BookmarkRepository'

export interface Task {
  type: 'process-bookmark'
  bookmarkId: string
}

export class TaskQueue {
  private queue: Task[] = []
  private processing = false

  constructor(
    private repo: BookmarkRepository,
    private mainWindow: BrowserWindow
  ) {}

  enqueue(task: Task) {
    this.queue.push(task)
    this.process()
  }

  private async process() {
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

  private async executeTask(task: Task) {
    const bookmarkId = task.bookmarkId

    // 1. 更新状态为 processing
    await this.repo.updateStatus(bookmarkId, 'processing')
    this.notifyUpdate(bookmarkId)

    // 2. 获取书签信息
    const bookmark = await this.repo.findById(bookmarkId)
    if (!bookmark) return

    // 3. 抓取网页内容
    const content = await this.fetchWebContent(bookmark.url)

    // 4. 调用 AI 生成摘要和标签（未来实现）
    const aiResult = await this.generateSummary(content)

    // 5. 更新完整信息
    await this.repo.update(bookmarkId, {
      content: content.text,
      summary: aiResult.summary,
      tags: aiResult.tags,
      wordCount: content.wordCount,
      language: content.language,
      fetchedAt: new Date(),
      status: 'completed'
    })

    // 6. 通知渲染进程更新
    this.notifyUpdate(bookmarkId)
  }

  private async fetchWebContent(url: string): Promise<{
    text: string
    wordCount: number
    language: 'zh' | 'en'
  }> {
    // TODO: 实现网页内容抓取
    // 可以使用 puppeteer 或 readability
    return {
      text: 'Mock content',
      wordCount: 100,
      language: 'zh'
    }
  }

  private async generateSummary(content: string): Promise<{
    summary: string
    tags: string[]
  }> {
    // TODO: 实现 AI 摘要生成
    // 调用 OpenAI/Claude API
    return {
      summary: 'AI 生成的摘要',
      tags: ['自动标签']
    }
  }

  private notifyUpdate(bookmarkId: string) {
    // 发送事件到渲染进程
    this.mainWindow.webContents.send('bookmark:updated', bookmarkId)
  }
}
```

## Repository 层

### BookmarkRepository

```typescript
// apps/desktop/src/main/repositories/BookmarkRepository.ts
import Database from 'better-sqlite3'
import type { Bookmark } from '@recall-link/api'

interface InsertBookmark {
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

export class BookmarkRepository {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL') // 性能优化
    this.initSchema()
  }

  private initSchema() {
    // 检查版本表是否存在
    const versionTable = this.db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='schema_version'
    `).get()

    if (!versionTable) {
      // 首次初始化
      this.createTables()
      this.setVersion(1)
    } else {
      const row = this.db.prepare('SELECT version FROM schema_version').get() as { version: number }
      if (row.version !== 1) {
        // 版本不匹配，重建数据库
        console.warn('Schema version mismatch, rebuilding database...')
        this.dropAllTables()
        this.createTables()
        this.setVersion(1)
      }
    }
  }

  private createTables() {
    this.db.exec(`
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

      CREATE INDEX idx_bookmarks_domain ON bookmarks(domain);
      CREATE INDEX idx_bookmarks_status ON bookmarks(status);
      CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at DESC);
      CREATE INDEX idx_bookmarks_url ON bookmarks(url);

      CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
        title, summary, content, tags,
        content=bookmarks,
        content_rowid=rowid
      );

      CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
    `)
  }

  private dropAllTables() {
    this.db.exec(`
      DROP TABLE IF EXISTS bookmarks_fts;
      DROP TABLE IF EXISTS bookmarks;
      DROP TABLE IF EXISTS schema_version;
    `)
  }

  private setVersion(version: number) {
    this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(version)
  }

  // CRUD 操作
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
      id, data.url, data.title, data.domain,
      data.summary, JSON.stringify(data.tags), data.content,
      data.language, data.wordCount, data.status, data.isUserEdited ? 1 : 0,
      now, now
    )

    return this.findById(id)!
  }

  findById(id: string): Bookmark | null {
    const row = this.db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id)
    return row ? this.mapRowToBookmark(row) : null
  }

  findAll(params?: { limit?: number; offset?: number; tags?: string[] }): Bookmark[] {
    let query = 'SELECT * FROM bookmarks'
    const conditions: string[] = []
    const values: unknown[] = []

    if (params?.tags && params.tags.length > 0) {
      // 简单的标签过滤（实际应该用 JSON 函数）
      conditions.push(
        params.tags.map(() => 'tags LIKE ?').join(' OR ')
      )
      params.tags.forEach(tag => values.push(`%"${tag}"%`))
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
    return rows.map(row => this.mapRowToBookmark(row))
  }

  update(id: string, data: Partial<InsertBookmark>): Bookmark | null {
    const updates: string[] = []
    const values: unknown[] = []

    Object.entries(data).forEach(([key, value]) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
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

    updates.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0 ? this.findById(id) : null
  }

  updateStatus(id: string, status: Bookmark['status']): boolean {
    const stmt = this.db.prepare(`
      UPDATE bookmarks SET status = ?, updated_at = ? WHERE id = ?
    `)
    const result = stmt.run(status, Date.now(), id)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM bookmarks WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  search(query: string): Bookmark[] {
    const rows = this.db.prepare(`
      SELECT b.* FROM bookmarks b
      JOIN bookmarks_fts fts ON b.rowid = fts.rowid
      WHERE bookmarks_fts MATCH ?
      ORDER BY rank
    `).all(query)

    return rows.map(row => this.mapRowToBookmark(row))
  }

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

### ChatRepository

```typescript
// apps/desktop/src/main/repositories/ChatRepository.ts
import Database from 'better-sqlite3'
import type { ChatSession, ChatMessage } from '@recall-link/api'

export class ChatRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sources TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at);
    `)
  }

  createSession(title: string): ChatSession {
    const id = crypto.randomUUID()
    const now = Date.now()

    this.db.prepare(`
      INSERT INTO chat_sessions (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(id, title, now, now)

    return {
      id,
      title,
      messages: [],
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }
  }

  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const id = crypto.randomUUID()
    const now = Date.now()

    this.db.prepare(`
      INSERT INTO chat_messages (id, session_id, role, content, sources, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sessionId,
      message.role,
      message.content,
      message.sources ? JSON.stringify(message.sources) : null,
      now
    )

    // 更新会话的 updated_at
    this.db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?').run(now, sessionId)

    return {
      id,
      ...message,
      createdAt: new Date(now)
    }
  }

  getSession(id: string): ChatSession | null {
    const sessionRow = this.db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id)
    if (!sessionRow) return null

    const messageRows = this.db.prepare(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
    ).all(id)

    return {
      id: sessionRow.id,
      title: sessionRow.title,
      messages: messageRows.map(row => ({
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

  listSessions(): ChatSession[] {
    const rows = this.db.prepare(
      'SELECT * FROM chat_sessions ORDER BY updated_at DESC'
    ).all()

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      messages: [], // 列表视图不加载消息
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))
  }

  deleteSession(id: string): boolean {
    const result = this.db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id)
    return result.changes > 0
  }
}
```

### 数据库初始化

```typescript
// apps/desktop/src/main/database.ts
import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { BookmarkRepository } from './repositories/BookmarkRepository'
import { ChatRepository } from './repositories/ChatRepository'

export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'recall-link.db')
}

export function initDatabase() {
  const dbPath = getDatabasePath()
  const db = new Database(dbPath)

  // 初始化 Repositories
  const bookmarkRepo = new BookmarkRepository(dbPath)
  const chatRepo = new ChatRepository(db)
  chatRepo.createTables()

  return {
    db,
    bookmarkRepo,
    chatRepo
  }
}
```

## 状态同步机制

### 主进程发送更新事件

```typescript
// apps/desktop/src/main/services/TaskQueue.ts
private notifyUpdate(bookmarkId: string) {
  this.mainWindow.webContents.send('bookmark:updated', bookmarkId)
}
```

### 渲染进程监听更新

```typescript
// packages/api/src/events.ts
export function subscribeToBookmarkUpdates(callback: (id: string) => void) {
  window.electronAPI.on('bookmark:updated', (id: string) => {
    callback(id)
  })
}

export function unsubscribeFromBookmarkUpdates() {
  window.electronAPI.off('bookmark:updated')
}
```

### Zustand Store 集成

```typescript
// apps/desktop/src/renderer/store/index.ts
import { create } from 'zustand'
import { bookmarksAPI } from '@recall-link/api'
import { subscribeToBookmarkUpdates } from '@recall-link/api/events'

interface BookmarkState {
  bookmarks: Bookmark[]
  isLoading: boolean

  // 初始化数据
  init: () => Promise<void>

  // 添加书签
  addBookmark: (input: CreateBookmarkInput) => Promise<void>

  // 更新单个书签（用于实时同步）
  updateBookmark: (id: string, data: Bookmark) => void
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  isLoading: false,

  init: async () => {
    set({ isLoading: true })
    const result = await bookmarksAPI.list()
    if (result.success) {
      set({ bookmarks: result.data })
    }
    set({ isLoading: false })

    // 订阅更新事件
    subscribeToBookmarkUpdates(async (id) => {
      const result = await bookmarksAPI.get(id)
      if (result.success) {
        get().updateBookmark(id, result.data)
      }
    })
  },

  addBookmark: async (input) => {
    const result = await bookmarksAPI.create(input)
    if (result.success) {
      set(state => ({
        bookmarks: [result.data, ...state.bookmarks]
      }))
    }
  },

  updateBookmark: (id, data) => {
    set(state => ({
      bookmarks: state.bookmarks.map(b => b.id === id ? data : b)
    }))
  }
}))
```

## 主进程 IPC 处理器注册

```typescript
// apps/desktop/src/main/ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import type { BookmarkService } from './services/BookmarkService'
import type { ChatService } from './services/ChatService'

export function registerIpcHandlers(
  bookmarkService: BookmarkService,
  chatService: ChatService
) {
  // Bookmarks
  ipcMain.handle('bookmarks:create', async (_, input) => {
    return bookmarkService.create(input)
  })

  ipcMain.handle('bookmarks:get', async (_, id) => {
    return bookmarkService.get(id)
  })

  ipcMain.handle('bookmarks:list', async (_, params) => {
    return bookmarkService.list(params)
  })

  ipcMain.handle('bookmarks:update', async (_, id, input) => {
    return bookmarkService.update(id, input)
  })

  ipcMain.handle('bookmarks:delete', async (_, id) => {
    return bookmarkService.delete(id)
  })

  ipcMain.handle('bookmarks:search', async (_, query) => {
    return bookmarkService.search(query)
  })

  // Chat
  ipcMain.handle('chat:createSession', async () => {
    return chatService.createSession()
  })

  ipcMain.handle('chat:getSession', async (_, id) => {
    return chatService.getSession(id)
  })

  ipcMain.handle('chat:listSessions', async () => {
    return chatService.listSessions()
  })

  ipcMain.handle('chat:sendMessage', async (_, sessionId, content) => {
    return chatService.sendMessage(sessionId, content)
  })

  ipcMain.handle('chat:deleteSession', async (_, id) => {
    return chatService.deleteSession(id)
  })
}
```

## 数据流示例

### 用户添加书签的完整流程

```
1. 用户在 UI 填写表单，点击"添加"
   ↓
2. 调用 bookmarksAPI.create(input)
   ↓
3. API 层用 Zod 验证输入
   ↓
4. 通过 IPC 调用主进程: window.electronAPI.invoke('bookmarks:create', validated)
   ↓
5. 主进程 IPC Handler 接收，调用 BookmarkService.create()
   ↓
6. Service 层:
   - 调用 Repository 保存基本信息（status: 'pending'）
   - 将任务加入队列
   - 立即返回 Result<Bookmark> 给渲染进程
   ↓
7. 渲染进程收到响应，更新 Zustand store，UI 显示新书签（pending 状态）
   ↓
8. 后台任务队列开始处理:
   - 更新状态为 'processing'
   - 发送 'bookmark:updated' 事件 → UI 更新
   - 抓取网页内容
   - 调用 AI 生成摘要
   - 更新数据库（status: 'completed'）
   - 再次发送 'bookmark:updated' 事件 → UI 最终更新
```

## 技术栈

- **SQLite**: better-sqlite3 (同步 API，性能优异)
- **验证**: Zod (运行时验证 + TypeScript 类型推导)
- **全文搜索**: SQLite FTS5 (全文索引)
- **IPC**: Electron contextBridge + ipcRenderer/ipcMain

## 未来扩展路径

### 迁移到服务端的步骤

1. **创建 HTTP API 服务**
   - 使用 Express/Fastify 等框架
   - 复用相同的 Service 层和 Repository 层代码
   - 将 SQLite 替换为 PostgreSQL（Schema 几乎不需要改动）

2. **修改客户端 API 层**
   ```typescript
   // 从这个
   return window.electronAPI.invoke('bookmarks:create', validated)

   // 改成这个
   const response = await fetch('https://api.recall-link.com/bookmarks', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(validated)
   })
   return response.json()
   ```

3. **添加认证和同步**
   - JWT 认证
   - 本地与服务端数据同步机制
   - 冲突解决策略

### 性能优化方向

- **批量操作**: 添加批量插入、更新接口
- **分页加载**: 大数据量时使用虚拟滚动
- **索引优化**: 根据查询模式添加复合索引
- **缓存层**: 添加 LRU 缓存减少数据库查询

## 总结

本设计方案提供了：

✅ **本地优先** - SQLite 提供快速可靠的本地存储
✅ **服务端就绪** - API 设计可无缝迁移到 HTTP 服务
✅ **异步优先** - 所有 API 返回 Promise，统一异步模型
✅ **类型安全** - Zod 运行时验证 + TypeScript 类型推导
✅ **用户体验** - 后台任务队列，立即响应，实时状态同步
✅ **可维护性** - 清晰的分层架构，职责明确
✅ **可扩展性** - 为未来功能和服务端迁移预留空间

初期实现保持简单（Schema 版本不匹配直接重建），待有真实用户后再考虑数据迁移机制。
