import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiMode = 'document' | 'reminder'

interface UiModeStore {
  mode: UiMode
  setMode: (mode: UiMode) => void
}

export const useUiModeStore = create<UiModeStore>()(
  persist(
    (set) => ({
      mode: 'document',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'notebook-ui-mode',
    },
  ),
)
