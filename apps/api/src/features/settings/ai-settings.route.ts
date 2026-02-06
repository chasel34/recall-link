import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { getDb } from '../../db/context.js'
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js'
import { encryptUserModelConfigApiKey } from '../../lib/user-model-config-crypto.js'
import {
  deleteUserModelConfig,
  getUserModelConfig,
  upsertUserModelConfig,
} from './ai-settings.db.js'
import { aiSettingsSchema } from './ai-settings.schema.js'

export const settingsApp = new Hono()

settingsApp.use('*', requireAuth)

settingsApp.get('/ai', (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const config = getUserModelConfig(db, userId)

    return c.json({
      mode: config?.mode ?? 'server',
      provider: 'gemini',
      gemini: {
        model: config?.model ?? '',
        baseUrl: config?.base_url ?? '',
        hasApiKey: Boolean(config?.api_key_enc),
      },
    })
  } catch (error) {
    console.error('[GET /settings/ai] Error:', error)
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to get AI settings' }, 500)
  }
})

settingsApp.put('/ai', zValidator('json', aiSettingsSchema), (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const body = c.req.valid('json')
    const existing = getUserModelConfig(db, userId)

    if (body.mode === 'server') {
      const record = upsertUserModelConfig(db, {
        user_id: userId,
        mode: body.mode,
        provider: body.provider,
        base_url: null,
        model: null,
        api_key_enc: null,
      })

      return c.json({
        mode: record.mode,
        provider: record.provider,
        gemini: {
          model: record.model ?? '',
          baseUrl: record.base_url ?? '',
          hasApiKey: Boolean(record.api_key_enc),
        },
      })
    }

    const gemini = body.gemini ?? {}
    const baseUrl = gemini.baseUrl?.trim()
    const model = gemini.model?.trim()
    const apiKey = gemini.apiKey?.trim()

    // Preserve existing encrypted key when apiKey is omitted.
    // This lets users update model/baseUrl without re-entering their API key.
    let api_key_enc: string | null
    if (apiKey) {
      api_key_enc = encryptUserModelConfigApiKey(apiKey)
    } else if (existing?.api_key_enc) {
      api_key_enc = existing.api_key_enc
    } else {
      return c.json(
        { error: 'USER_MODEL_CONFIG_MISSING', message: 'User AI configuration is missing or invalid.' },
        409
      )
    }

    const record = upsertUserModelConfig(db, {
      user_id: userId,
      mode: body.mode,
      provider: body.provider,
      base_url:
        baseUrl === undefined ? (existing?.base_url ?? null) : baseUrl.length > 0 ? baseUrl : null,
      model: model ?? existing?.model ?? null,
      api_key_enc,
    })

    return c.json({
      mode: record.mode,
      provider: record.provider,
      gemini: {
        model: record.model ?? '',
        baseUrl: record.base_url ?? '',
        hasApiKey: Boolean(record.api_key_enc),
      },
    })
  } catch (error) {
    console.error('[PUT /settings/ai] Error:', error)
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to update AI settings' }, 500)
  }
})

settingsApp.delete('/ai', (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    deleteUserModelConfig(db, userId)
    return c.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /settings/ai] Error:', error)
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to delete AI settings' }, 500)
  }
})

settingsApp.post('/ai/test', zValidator('json', aiSettingsSchema), async (c) => {
  const body = c.req.valid('json')
  const gemini = body.gemini ?? {}
  const apiKey = gemini.apiKey ?? ''
  const baseUrl = gemini.baseUrl?.trim() ?? ''
  const baseURL = baseUrl.length > 0 ? baseUrl : undefined
  const modelName = gemini.model ?? ''

  try {
    const google = createGoogleGenerativeAI({ apiKey, baseURL })
    await generateText({ model: google(modelName), prompt: 'Test', maxTokens: 1 })
    return c.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return c.json({ ok: false, error: 'USER_MODEL_CONFIG_TEST_FAILED', message })
  }
})
