import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { retrieveChatSources } from './chat.retrieval.js'
import { UserEmbeddingConfigMissingError } from '../../config/ai.resolver.js'

type SeedItemInput = {
  id: string
  userId: string
  title: string
  summary?: string
  text: string
  updatedAt: string
}

function seedItem(db: Database.Database, input: SeedItemInput): void {
  db.prepare(
    `
      INSERT INTO items (
        id, user_id, url, url_normalized, domain, title, summary, clean_text, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    `
  ).run(
    input.id,
    input.userId,
    `https://example.com/${input.id}`,
    `https://example.com/${input.id}`,
    'example.com',
    input.title,
    input.summary ?? '',
    input.text,
    input.updatedAt,
    input.updatedAt
  )
}

function seedItemFts(db: Database.Database, input: { itemId: string; title: string; summary?: string; tags?: string; text: string }): void {
  db.prepare(
    `
      INSERT INTO items_fts (item_id, title, summary, tags, clean_text)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(input.itemId, input.title, input.summary ?? '', input.tags ?? '', input.text)
}

describe('retrieveChatSources (semantic)', () => {
  let db: Database.Database
  const userId = 'user_test'

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, password_salt, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
    ).run(userId, 'user@test.local', 'hash', 'salt', '2024-01-01T00:00:00.000Z')
  })

  afterEach(() => {
    db.close()
  })

  it('retrieves sources via vector similarity', async () => {
    seedItem(db, {
      id: 'item_ts',
      userId,
      title: 'TypeScript Utility Types',
      text: 'A guide to TypeScript utility types and advanced typing patterns.',
      updatedAt: '2024-01-20T10:00:00.000Z',
    })
    seedItem(db, {
      id: 'item_embed',
      userId,
      title: 'Embedding Notes',
      text: 'An article that explains text embedding concepts and retrieval.',
      updatedAt: '2024-01-19T10:00:00.000Z',
    })

    const sources = await retrieveChatSources(db, userId, '查找 typescript 相关文章', {
      deps: {
        resolveEmbeddingConfig: () => ({
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          apiKey: 'ark-key',
          model: 'doubao-embedding-vision-251215',
        }),
        embedQuery: async () => [1, 0],
        embedDocuments: async (values) =>
          values.map((v) => (v.includes('TypeScript') ? [1, 0] : [0, 1])),
      },
    })

    expect(sources).toHaveLength(2)
    expect(sources[0]?.item_id).toBe('item_ts')
  })

  it('lazily generates and stores missing embeddings', async () => {
    seedItem(db, {
      id: 'item_router',
      userId,
      title: 'Browser URL State Library',
      text: 'This article compares libraries for URL state management in browsers.',
      updatedAt: '2024-01-22T10:00:00.000Z',
    })

    const before = db.prepare('SELECT COUNT(*) as c FROM item_embeddings').get() as { c: number }
    expect(before.c).toBe(0)

    await retrieveChatSources(db, userId, '一个浏览器url状态管理的库', {
      deps: {
        resolveEmbeddingConfig: () => ({
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          apiKey: 'ark-key',
          model: 'doubao-embedding-vision-251215',
        }),
        embedQuery: async () => [0.3, 0.7],
        embedDocuments: async () => [[0.3, 0.7]],
      },
    })

    const row = db.prepare('SELECT model, dimensions, vector_json FROM item_embeddings WHERE item_id = ?').get(
      'item_router'
    ) as { model: string; dimensions: number; vector_json: string } | undefined
    expect(row).toBeTruthy()
    expect(row?.model).toBe('doubao-embedding-vision-251215')
    expect(row?.dimensions).toBe(2)
    expect(row?.vector_json).toBe('[0.3,0.7]')
  })

  it('keeps order stable for equal similarity by updated_at desc', async () => {
    seedItem(db, {
      id: 'item_newer',
      userId,
      title: 'Embedding recap newer',
      text: 'Embedding recap.',
      updatedAt: '2024-01-23T10:00:00.000Z',
    })
    seedItem(db, {
      id: 'item_older',
      userId,
      title: 'Embedding recap older',
      text: 'Embedding recap.',
      updatedAt: '2024-01-22T10:00:00.000Z',
    })

    const sources = await retrieveChatSources(db, userId, 'embedding', {
      deps: {
        resolveEmbeddingConfig: () => ({
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          apiKey: 'ark-key',
          model: 'doubao-embedding-vision-251215',
        }),
        embedQuery: async () => [1, 0],
        embedDocuments: async () => [
          [1, 0],
          [1, 0],
        ],
      },
    })

    expect(sources.map((s) => s.item_id)).toEqual(['item_newer', 'item_older'])
  })

  it('throws identifiable error when embedding config is missing', async () => {
    seedItem(db, {
      id: 'item_ts',
      userId,
      title: 'TypeScript Utility Types',
      text: 'A guide to TypeScript utility types.',
      updatedAt: '2024-01-20T10:00:00.000Z',
    })

    await expect(
      retrieveChatSources(db, userId, 'typescript', {
        deps: {
          resolveEmbeddingConfig: () => {
            throw new UserEmbeddingConfigMissingError('missing embedding config')
          },
          embedQuery: async () => [1, 0],
          embedDocuments: async () => [[1, 0]],
        },
      })
    ).rejects.toBeInstanceOf(UserEmbeddingConfigMissingError)
  })

  it('uses hybrid candidates so FTS hit outside recency window can be recalled', async () => {
    seedItem(db, {
      id: 'item_new',
      userId,
      title: 'Recent note',
      text: 'Recent content not related to target query.',
      updatedAt: '2024-01-30T10:00:00.000Z',
    })
    seedItem(db, {
      id: 'item_old_target',
      userId,
      title: 'Old URL state library note',
      text: 'A deep dive into URL state management libraries for browser apps.',
      updatedAt: '2024-01-01T10:00:00.000Z',
    })

    seedItemFts(db, {
      itemId: 'item_old_target',
      title: 'Old URL state library note',
      text: 'A deep dive into URL state management libraries for browser apps.',
      tags: 'url state browser',
    })

    const sources = await retrieveChatSources(db, userId, 'url 状态管理 库', {
      candidateLimit: 1,
      deps: {
        resolveEmbeddingConfig: () => ({
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          apiKey: 'ark-key',
          model: 'doubao-embedding-vision-251215',
        }),
        embedQuery: async () => [1, 0],
        embedDocuments: async (values) =>
          values.map((v) => (v.includes('URL state') ? [1, 0] : [0, 1])),
      },
    })

    expect(sources[0]?.item_id).toBe('item_old_target')
  })

  it('continues retrieval when lazy embedding batch fails', async () => {
    seedItem(db, {
      id: 'item_existing_embedding',
      userId,
      title: 'TypeScript utility note',
      text: 'TypeScript utility types and patterns.',
      updatedAt: '2024-01-25T10:00:00.000Z',
    })

    db.prepare(
      `
        INSERT INTO item_embeddings (
          item_id, user_id, provider, model, dimensions, vector_json, source_text_hash, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      'item_existing_embedding',
      userId,
      'ark',
      'doubao-embedding-vision-251215',
      2,
      '[1,0]',
      'stale-hash',
      '2024-01-25T10:00:00.000Z',
      '2024-01-25T10:00:00.000Z'
    )

    const sources = await retrieveChatSources(db, userId, 'typescript', {
      deps: {
        resolveEmbeddingConfig: () => ({
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          apiKey: 'ark-key',
          model: 'doubao-embedding-vision-251215',
        }),
        embedQuery: async () => [1, 0],
        embedDocuments: async () => {
          throw new Error('ark temporary failure')
        },
      },
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]?.item_id).toBe('item_existing_embedding')
  })
})
