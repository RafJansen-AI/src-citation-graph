import { create } from 'zustand'
import type { Paper, Cluster } from '../lib/types'

interface AppState {
  selectedPaper: Paper | null
  selectedCluster: Cluster | null
  searchQuery: string
  highlightedPath: string[]

  setSelectedPaper: (p: Paper | null) => void
  setSelectedCluster: (c: Cluster | null) => void
  setSearchQuery: (q: string) => void
  setHighlightedPath: (path: string[]) => void
}

export const useAppStore = create<AppState>(set => ({
  selectedPaper: null,
  selectedCluster: null,
  searchQuery: '',
  highlightedPath: [],
  setSelectedPaper: p => set({ selectedPaper: p }),
  setSelectedCluster: c => set({ selectedCluster: c }),
  setSearchQuery: q => set({ searchQuery: q }),
  setHighlightedPath: path => set({ highlightedPath: path }),
}))
