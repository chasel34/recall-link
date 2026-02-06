import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'
import { registerTestUser } from './test-auth.js'

vi.mock('ai', () => ({ generateText: vi.fn() }))
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: vi.fn() }))

import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { app } from '../app.js'

const MASTER_KEY_HEX = '0000000000000000000000000000000000000000000000000000000000000000'

describe('ai settings routes', () => {
  let db: Database.Database
  let cookie: string
  let priorMasterKey: string | undefined

  beforeEach(async () => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)

    const auth = await registerTestUser(app)
    cookie = auth.cookie

    priorMasterKey = process.env.USER_MODEL_CONFIG_MASTER_KEY
    process.env.USER_MODEL_CONFIG_MASTER_KEY = MASTER_KEY_HEX

    vi.clearAllMocks()
    vi.mocked(createGoogleGenerativeAI).mockReturnValue(((modelName: string) => ({ modelName })) as any)
  })

  afterEach(() => {
    closeDb()
    if (priorMasterKey === undefined) {
      delete process.env.USER_MODEL_CONFIG_MASTER_KEY
    } else {
      process.env.USER_MODEL_CONFIG_MASTER_KEY = priorMasterKey
    }
  })

  it('returns defaults when no config exists', async () => {
    const res = await app.request('/api/settings/ai', { headers: { Cookie: cookie } })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({
      mode: 'server',
      provider: 'gemini',
      gemini: { model: '', baseUrl: '', hasApiKey: false },
    })
  })

  it('saves config and never returns apiKey', async () => {
    const putRes = await app.request('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'user',
        provider: 'gemini',
        gemini: { model: 'gemini-1.5-flash', baseUrl: '', apiKey: 'secret' },
      }),
    })

    expect(putRes.status).toBe(200)

    const getRes = await app.request('/api/settings/ai', { headers: { Cookie: cookie } })
    expect(getRes.status).toBe(200)
    const data = await getRes.json()
    expect(data.mode).toBe('user')
    expect(data.provider).toBe('gemini')
    expect(data.gemini).toMatchObject({
      model: 'gemini-1.5-flash',
      baseUrl: '',
      hasApiKey: true,
    })
    expect(data.gemini).not.toHaveProperty('apiKey')
  })

  it('preserves apiKey when updating user config without apiKey', async () => {
    // Save a config with a key.
    const firstPut = await app.request('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'user',
        provider: 'gemini',
        gemini: { model: 'gemini-1.5-flash', baseUrl: '', apiKey: 'secret' },
      }),
    })
    expect(firstPut.status).toBe(200)

    // Update model/baseUrl without sending apiKey.
    const secondPut = await app.request('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'user',
        provider: 'gemini',
        gemini: { model: 'gemini-1.5-pro', baseUrl: 'https://example.com' },
      }),
    })
    expect(secondPut.status).toBe(200)

    const data = await (await app.request('/api/settings/ai', { headers: { Cookie: cookie } })).json()
    expect(data.mode).toBe('user')
    expect(data.gemini).toMatchObject({
      model: 'gemini-1.5-pro',
      baseUrl: 'https://example.com',
      hasApiKey: true,
    })
  })

  it('rejects user mode update without apiKey when no key exists', async () => {
    const res = await app.request('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'user',
        provider: 'gemini',
        gemini: { model: 'gemini-1.5-flash', baseUrl: '' },
      }),
    })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('USER_MODEL_CONFIG_MISSING')
  })

  it('accepts server mode without gemini fields and clears api key', async () => {
    const putRes = await app.request('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'server',
        provider: 'gemini',
        gemini: {},
      }),
    })

    expect(putRes.status).toBe(200)
    const putBody = await putRes.json()
    expect(putBody).toEqual({
      mode: 'server',
      provider: 'gemini',
      gemini: { model: '', baseUrl: '', hasApiKey: false },
    })

    const getRes = await app.request('/api/settings/ai', { headers: { Cookie: cookie } })
    const data = await getRes.json()
    expect(data.mode).toBe('server')
    expect(data.gemini.hasApiKey).toBe(false)
  })

  it('deletes config and clears hasApiKey', async () => {
    await app.request('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'user',
        provider: 'gemini',
        gemini: { model: 'gemini-1.5-flash', baseUrl: 'https://example.com', apiKey: 'secret' },
      }),
    })

    const deleteRes = await app.request('/api/settings/ai', {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })

    expect(deleteRes.status).toBe(200)

    const getRes = await app.request('/api/settings/ai', { headers: { Cookie: cookie } })
    const data = await getRes.json()
    expect(data.gemini.hasApiKey).toBe(false)
  })

  it('tests config successfully', async () => {
    vi.mocked(generateText).mockResolvedValue({ text: 'ok' } as any)

    const res = await app.request('/api/settings/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'user',
        provider: 'gemini',
        gemini: { model: 'gemini-1.5-flash', baseUrl: '', apiKey: 'secret' },
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ ok: true })
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: 'secret', baseURL: undefined })
  })

  it('returns failure payload when test call fails', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('nope'))

    const res = await app.request('/api/settings/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'user',
        provider: 'gemini',
        gemini: { model: 'gemini-1.5-flash', baseUrl: 'https://example.com', apiKey: 'secret' },
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject({ ok: false, error: 'USER_MODEL_CONFIG_TEST_FAILED' })
    expect(data.message).toContain('nope')
  })
})
