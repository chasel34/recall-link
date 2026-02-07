export const DEFAULT_ARK_EMBEDDING_MODEL = 'doubao-embedding-vision-251215'

const DEFAULT_ENCODING_FORMAT = 'float'

export type ArkEmbeddingConfig = {
  baseURL: string
  apiKey: string
  model?: string
  instructions?: string
  dimensions?: number
  multiEmbedding?: boolean
  sparseEmbedding?: boolean
  encodingFormat?: string
}

type ArkEmbeddingInput = { type: 'text'; text: string }

type ArkSuccessResponse = {
  data?: unknown
}

export class EmbeddingProviderError extends Error {
  code = 'EMBEDDING_PROVIDER_ERROR' as const
}

function toEmbeddingError(error: unknown): EmbeddingProviderError {
  if (error instanceof EmbeddingProviderError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new EmbeddingProviderError(`Embedding provider request failed: ${message}`)
}

function normalizeBaseURL(baseURL: string): string {
  return baseURL.replace(/\/+$/, '')
}

function extractEmbedding(data: unknown): number[] {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { embedding?: unknown }
    return parseEmbedding(first?.embedding)
  }

  if (data && typeof data === 'object') {
    const objectData = data as { embedding?: unknown }
    return parseEmbedding(objectData.embedding)
  }

  throw new EmbeddingProviderError('Embedding provider returned invalid data payload')
}

function parseEmbedding(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new EmbeddingProviderError('Embedding provider returned empty embedding')
  }

  if (!value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    throw new EmbeddingProviderError('Embedding provider returned non-numeric embedding values')
  }

  return value as number[]
}

function buildRequestBody(input: ArkEmbeddingInput, config: ArkEmbeddingConfig): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    model: config.model ?? DEFAULT_ARK_EMBEDDING_MODEL,
    input: [input],
    encoding_format: config.encodingFormat ?? DEFAULT_ENCODING_FORMAT,
  }

  if (config.instructions) payload.instructions = config.instructions
  if (typeof config.dimensions === 'number') payload.dimensions = config.dimensions
  if (config.multiEmbedding) payload.multi_embedding = { type: 'enabled' }
  if (config.sparseEmbedding) payload.sparse_embedding = { type: 'enabled' }

  return payload
}

async function requestEmbedding(input: ArkEmbeddingInput, config: ArkEmbeddingConfig): Promise<number[]> {
  const url = `${normalizeBaseURL(config.baseURL)}/embeddings/multimodal`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildRequestBody(input, config)),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new EmbeddingProviderError(`Ark embedding request failed (${response.status}): ${details}`)
  }

  const json = (await response.json()) as ArkSuccessResponse
  return extractEmbedding(json.data)
}

export async function embedQuery(value: string, config: ArkEmbeddingConfig): Promise<number[]> {
  try {
    return await requestEmbedding(
      {
        type: 'text',
        text: value,
      },
      config
    )
  } catch (error) {
    throw toEmbeddingError(error)
  }
}

export async function embedDocuments(values: string[], config: ArkEmbeddingConfig): Promise<number[][]> {
  try {
    return await Promise.all(
      values.map((value) =>
        requestEmbedding(
          {
            type: 'text',
            text: value,
          },
          config
        )
      )
    )
  } catch (error) {
    throw toEmbeddingError(error)
  }
}
