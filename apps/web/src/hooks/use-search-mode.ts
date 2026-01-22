import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SearchMode = 'content' | 'tags'

interface SearchModeState {
  mode: SearchMode
  setMode: (mode: SearchMode) => void
}

export const useSearchMode = create<SearchModeState>()(
  persist(
    (set) => ({
      mode: 'content',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'search-mode',
    }
  )
)
