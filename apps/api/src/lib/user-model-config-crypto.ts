import crypto from 'node:crypto'

const VERSION_PREFIX = 'v1:'
const KEY_LENGTH_BYTES = 32
const IV_LENGTH_BYTES = 12
const AUTH_TAG_LENGTH_BYTES = 16

function getMasterKey(): Buffer {
  const raw = process.env.USER_MODEL_CONFIG_MASTER_KEY
  if (!raw) {
    throw new Error(
      'USER_MODEL_CONFIG_MASTER_KEY is required and must be a 32-byte key encoded as base64, base64url, or hex.'
    )
  }

  const trimmed = raw.trim()
  const hexKey = maybeDecodeHex(trimmed)
  if (hexKey) return hexKey

  const base64UrlKey = maybeDecodeBase64(trimmed, true)
  if (base64UrlKey) return base64UrlKey

  const base64Key = maybeDecodeBase64(trimmed, false)
  if (base64Key) return base64Key

  throw new Error(
    'USER_MODEL_CONFIG_MASTER_KEY is invalid. Expected a 32-byte key encoded as base64, base64url, or hex.'
  )
}

function maybeDecodeHex(value: string): Buffer | null {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) return null
  const key = Buffer.from(value, 'hex')
  return key.length === KEY_LENGTH_BYTES ? key : null
}

function maybeDecodeBase64(value: string, urlSafe: boolean): Buffer | null {
  const pattern = urlSafe ? /^[A-Za-z0-9_-]+$/ : /^[A-Za-z0-9+/=]+$/
  if (!pattern.test(value)) return null
  const key = Buffer.from(value, urlSafe ? 'base64url' : 'base64')
  return key.length === KEY_LENGTH_BYTES ? key : null
}

function decodePayload(payload: string): Buffer {
  const trimmed = payload.trim()
  if (!trimmed) {
    throw new Error('Encrypted user model config API key payload is empty.')
  }

  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return Buffer.from(trimmed, 'base64url')
  }

  if (/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return Buffer.from(trimmed, 'base64')
  }

  throw new Error('Encrypted user model config API key payload is not valid base64.')
}

export function encryptUserModelConfigApiKey(plaintext: string): string {
  const key = getMasterKey()
  const iv = crypto.randomBytes(IV_LENGTH_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, ciphertext, authTag]).toString('base64url')
  return `${VERSION_PREFIX}${payload}`
}

export function decryptUserModelConfigApiKey(ciphertext: string): string {
  if (!ciphertext.startsWith(VERSION_PREFIX)) {
    throw new Error('Encrypted user model config API key must start with v1:.')
  }

  const payload = ciphertext.slice(VERSION_PREFIX.length)
  const data = decodePayload(payload)

  if (data.length <= IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES) {
    throw new Error('Encrypted user model config API key payload is too short.')
  }

  const key = getMasterKey()
  const iv = data.subarray(0, IV_LENGTH_BYTES)
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH_BYTES)
  const encrypted = data.subarray(IV_LENGTH_BYTES, data.length - AUTH_TAG_LENGTH_BYTES)

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8')
  } catch (err) {
    throw new Error('Failed to decrypt user model config API key.', { cause: err })
  }
}
