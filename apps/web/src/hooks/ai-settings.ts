import { create } from 'zustand'
import { useMe } from '@/hooks/use-me'

export type AiMode = 'remote' | 'local'
export type AiProvider = 'gemini'

export interface GeminiConfig {
  apiKey: string
  baseURL?: string
  model: string
}

export interface AiSettingsState {
  mode: AiMode
  provider: AiProvider
  gemini: GeminiConfig
  setMode: (mode: AiMode) => void
  setGeminiConfig: (config: Partial<GeminiConfig>) => void
  reset: () => void
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview'

const DEFAULT_STATE: Pick<AiSettingsState, 'mode' | 'provider' | 'gemini'> = {
  mode: 'remote',
  provider: 'gemini',
  gemini: {
    apiKey: '',
    baseURL: undefined,
    model: DEFAULT_GEMINI_MODEL,
  },
}

type AiSettingsStore = ReturnType<ReturnType<typeof create<AiSettingsState>>>

const readPersistedState = (key: string): Pick<AiSettingsState, 'mode' | 'provider' | 'gemini'> => {
  if (typeof localStorage === 'undefined') return DEFAULT_STATE
  const raw = localStorage.getItem(key)
  if (!raw) return DEFAULT_STATE

  try {
    const parsed = JSON.parse(raw) as Partial<Pick<AiSettingsState, 'mode' | 'provider' | 'gemini'>>
    return {
      mode: parsed.mode ?? DEFAULT_STATE.mode,
      provider: parsed.provider ?? DEFAULT_STATE.provider,
      gemini: {
        apiKey: parsed.gemini?.apiKey ?? DEFAULT_STATE.gemini.apiKey,
        baseURL: parsed.gemini?.baseURL ?? DEFAULT_STATE.gemini.baseURL,
        model: parsed.gemini?.model ?? DEFAULT_STATE.gemini.model,
      },
    }
  } catch {
    return DEFAULT_STATE
  }
}

const writePersistedState = (key: string, state: AiSettingsState) => {
  if (typeof localStorage === 'undefined') return
  const payload = {
    mode: state.mode,
    provider: state.provider,
    gemini: state.gemini,
  }
  localStorage.setItem(key, JSON.stringify(payload))
}

const createAiSettingsStore: (key: string) => AiSettingsStore = (key) =>
  create<AiSettingsState>()((set, get) => {
    const initial = readPersistedState(key)

    return {
      ...initial,
      setMode: (mode) => {
        set({ mode })
        writePersistedState(key, get())
      },
      setGeminiConfig: (config) => {
        set((state) => ({
          gemini: {
            ...state.gemini,
            ...config,
          },
        }))
        writePersistedState(key, get())
      },
      reset: () => {
        set({ ...DEFAULT_STATE })
        writePersistedState(key, get())
      },
    }
  })

const stores = new Map<string, AiSettingsStore>()

const getStorageKey = (userId: string) => `ai-settings:${userId}`

export function getAiSettingsStore(userId: string): AiSettingsStore {
  const key = getStorageKey(userId)
  const existing = stores.get(key)
  if (existing) return existing

  const store = createAiSettingsStore(key)

  stores.set(key, store)
  return store
}

export function resetAiSettingsStoreCache() {
  stores.clear()
}

export function clearAllAiSettingsStorage() {
  if (typeof localStorage === 'undefined') return
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('ai-settings:')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => {
    localStorage.removeItem(key)
  })
}

export function clearAiSettingsOnLogout() {
  resetAiSettingsStoreCache()
  clearAllAiSettingsStorage()
}

export function useAiSettings(userId?: string): AiSettingsState {
  const me = useMe({ enabled: userId === undefined })
  const resolvedUserId = userId ?? me.user?.id ?? 'anonymous'
  const store = getAiSettingsStore(resolvedUserId)
  return store((state) => state)
}
