import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { decryptUserModelConfigApiKey, encryptUserModelConfigApiKey } from './user-model-config-crypto.js'

const KEY_ENV = 'USER_MODEL_CONFIG_MASTER_KEY'

function setMasterKey(value: string) {
  process.env[KEY_ENV] = value
}

function generateKey(): string {
  return crypto.randomBytes(32).toString('base64url')
}

describe('user model config crypto', () => {
  let originalKey: string | undefined

  beforeEach(() => {
    originalKey = process.env[KEY_ENV]
  })

  afterEach(() => {
    if (typeof originalKey === 'undefined') {
      delete process.env[KEY_ENV]
    } else {
      process.env[KEY_ENV] = originalKey
    }
  })

  it('roundtrips encrypted API keys', () => {
    setMasterKey(generateKey())
    const plaintext = 'api-key-123'
    const encrypted = encryptUserModelConfigApiKey(plaintext)
    const decrypted = decryptUserModelConfigApiKey(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('fails to decrypt with the wrong master key', () => {
    setMasterKey(generateKey())
    const encrypted = encryptUserModelConfigApiKey('api-key-abc')

    setMasterKey(generateKey())
    expect(() => decryptUserModelConfigApiKey(encrypted)).toThrow('Failed to decrypt user model config API key')
  })

  it('rejects malformed ciphertext', () => {
    setMasterKey(generateKey())
    expect(() => decryptUserModelConfigApiKey('v1:')).toThrow('payload is empty')
    expect(() => decryptUserModelConfigApiKey('v1:***')).toThrow('payload is not valid base64')
    expect(() => decryptUserModelConfigApiKey('nope')).toThrow('must start with v1:')
  })
})
