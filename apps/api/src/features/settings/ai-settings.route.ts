import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { testGeminiConfig } from '@recall-link/ai'
import { getDb } from '../../db/context.js'
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js'
import { encryptUserModelConfigApiKey } from '../../lib/user-model-config-crypto.js'
import { DEFAULT_ARK_BASE_URL, DEFAULT_ARK_EMBEDDING_MODEL } from '../../config/ai.config.js'
import {
  deleteUserModelConfig,
  getUserModelConfig,
  type UserModelConfig,
  upsertUserModelConfig,
} from './ai-settings.db.js'
import { aiSettingsSchema } from './ai-settings.schema.js'

export const settingsApp = new Hono()

settingsApp.use('*', requireAuth)

function toAiSettingsResponse(config: UserModelConfig | null) {
  return {
    mode: config?.mode ?? 'server',
    provider: 'gemini' as const,
    gemini: {
      model: config?.model ?? '',
      baseUrl: config?.base_url ?? '',
      hasApiKey: Boolean(config?.api_key_enc),
    },
    ark: {
      embeddingModel: config?.ark_embedding_model ?? DEFAULT_ARK_EMBEDDING_MODEL,
      baseUrl: config?.ark_base_url ?? DEFAULT_ARK_BASE_URL,
      hasApiKey: Boolean(config?.ark_api_key_enc),
    },
  }
}

settingsApp.get('/ai', (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const config = getUserModelConfig(db, userId)

    return c.json(toAiSettingsResponse(config))
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
        ark_base_url: null,
        ark_embedding_model: null,
        ark_api_key_enc: null,
      })

      return c.json(toAiSettingsResponse(record))
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

    const ark = body.ark ?? {}
    const arkBaseUrl = ark.baseUrl?.trim()
    const arkEmbeddingModel = ark.embeddingModel?.trim()
    const arkApiKey = ark.apiKey?.trim()

    let ark_api_key_enc: string | null
    if (arkApiKey) {
      ark_api_key_enc = encryptUserModelConfigApiKey(arkApiKey)
    } else if (existing?.ark_api_key_enc) {
      ark_api_key_enc = existing.ark_api_key_enc
    } else {
      ark_api_key_enc = null
    }

    const record = upsertUserModelConfig(db, {
      user_id: userId,
      mode: body.mode,
      provider: body.provider,
      base_url:
        baseUrl === undefined ? (existing?.base_url ?? null) : baseUrl.length > 0 ? baseUrl : null,
      model: model ?? existing?.model ?? null,
      api_key_enc,
      ark_base_url:
        arkBaseUrl === undefined ? (existing?.ark_base_url ?? null) : arkBaseUrl.length > 0 ? arkBaseUrl : null,
      ark_embedding_model: arkEmbeddingModel ?? existing?.ark_embedding_model ?? DEFAULT_ARK_EMBEDDING_MODEL,
      ark_api_key_enc,
    })

    return c.json(toAiSettingsResponse(record))
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
  const baseURL = gemini.baseUrl?.trim() ?? ''
  const model = gemini.model ?? ''

  try {
    await testGeminiConfig({
      apiKey,
      baseURL,
      model,
    })
    return c.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return c.json({ ok: false, error: 'USER_MODEL_CONFIG_TEST_FAILED', message })
  }
})
