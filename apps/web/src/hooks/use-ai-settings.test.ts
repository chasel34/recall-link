import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_GEMINI_MODEL,
  getAiSettingsStore,
  resetAiSettingsStoreCache,
  clearAiSettingsOnLogout,
} from './ai-settings'

const USER_A = 'user_a'
const USER_B = 'user_b'

beforeEach(() => {
  localStorage.clear()
  resetAiSettingsStoreCache()
})

describe('useAiSettings store', () => {
  it('defaults to remote mode', () => {
    const store = getAiSettingsStore(USER_A)
    const state = store.getState()

    expect(state.mode).toBe('remote')
    expect(state.provider).toBe('gemini')
    expect(state.gemini.model).toBe(DEFAULT_GEMINI_MODEL)
  })

  it('persists mode updates', () => {
    const store = getAiSettingsStore(USER_A)
    store.getState().setMode('local')

    resetAiSettingsStoreCache()
    const nextStore = getAiSettingsStore(USER_A)

    expect(nextStore.getState().mode).toBe('local')
  })

  it('namespaces settings by user id', () => {
    const storeA = getAiSettingsStore(USER_A)
    storeA.getState().setMode('local')

    resetAiSettingsStoreCache()
    const storeB = getAiSettingsStore(USER_B)

    expect(storeB.getState().mode).toBe('remote')

    resetAiSettingsStoreCache()
    const storeA2 = getAiSettingsStore(USER_A)

    expect(storeA2.getState().mode).toBe('local')
  })
  
  it('clears all settings on logout', () => {
    const storeA = getAiSettingsStore(USER_A)
    storeA.getState().setMode('local')
    
    const storeB = getAiSettingsStore(USER_B)
    storeB.getState().setMode('local')
    
    clearAiSettingsOnLogout()
    
    const nextStoreA = getAiSettingsStore(USER_A)
    const nextStoreB = getAiSettingsStore(USER_B)
    
    expect(nextStoreA.getState().mode).toBe('remote')
    expect(nextStoreB.getState().mode).toBe('remote')
    
    expect(localStorage.getItem(`ai-settings:${USER_A}`)).toBeNull()
    expect(localStorage.getItem(`ai-settings:${USER_B}`)).toBeNull()
  })
})
