import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ARK_EMBEDDING_MODEL,
  EmbeddingProviderError,
  embedDocuments,
  embedQuery,
} from './embedding.js'

type FetchLikeResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}

function createResponse(body: unknown, status = 200): FetchLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

describe('embedding multimodal api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('embeds text query through /embeddings/multimodal', async () => {
    const fetchMock = vi.fn(async () => createResponse({ data: { embedding: [0.1, 0.2, 0.3] } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await embedQuery('typescript article', {
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      apiKey: 'ark-key',
      model: 'doubao-embedding-vision-251215',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ark-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'doubao-embedding-vision-251215',
        input: [{ type: 'text', text: 'typescript article' }],
        encoding_format: 'float',
      }),
    })
    expect(result).toEqual([0.1, 0.2, 0.3])
  })

  it('uses default embedding model when model is omitted', async () => {
    const fetchMock = vi.fn(async () => createResponse({ data: { embedding: [0.4, 0.5] } }))
    vi.stubGlobal('fetch', fetchMock)

    await embedQuery('embedding note', {
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3/',
      apiKey: 'ark-key',
    })

    const secondArg = fetchMock.mock.calls[0]?.[1] as { body: string }
    expect(secondArg.body).toContain(`"model":"${DEFAULT_ARK_EMBEDDING_MODEL}"`)
  })

  it('embeds multiple text documents', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => createResponse({ data: { embedding: [1, 0] } }))
      .mockImplementationOnce(async () => createResponse({ data: { embedding: [0, 1] } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await embedDocuments(
      ['A TypeScript utility article', 'A browser URL state library'],
      {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: 'ark-key',
        model: 'doubao-embedding-vision-251215',
      }
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual([
      [1, 0],
      [0, 1],
    ])
  })

  it('maps provider failure to EmbeddingProviderError', async () => {
    const fetchMock = vi.fn(async () => createResponse({ error: { message: 'bad request' } }, 400))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      embedQuery('test', {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: 'ark-key',
      })
    ).rejects.toBeInstanceOf(EmbeddingProviderError)
  })
})
