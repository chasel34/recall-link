import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ItemsViewMode = 'grid' | 'list'

interface ItemsViewModeState {
  mode: ItemsViewMode
  setMode: (mode: ItemsViewMode) => void
}

export const useItemsViewMode = create<ItemsViewModeState>()(
  persist(
    (set) => ({
      mode: 'grid',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'items-view-mode',
    }
  )
)
