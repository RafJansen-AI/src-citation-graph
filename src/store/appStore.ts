import { create } from 'zustand'
import type { Paper, Cluster } from '../lib/types'

interface AppState {
  selectedPaper: Paper | null
  selectedCluster: Cluster | null
  searchQuery: string
  highlightedPath: string[]
  hiddenClusterIds: number[]
  selectedAuthorId: string | null

  setSelectedPaper: (p: Paper | null) => void
  setSelectedCluster: (c: Cluster | null) => void
  setSearchQuery: (q: string) => void
  setHighlightedPath: (path: string[]) => void
  toggleClusterVisibility: (id: number) => void
  // Selecting an author clears any stale highlighted path (path highlight takes priority in nodeColor)
  setSelectedAuthorId: (id: string | null) => void
}

export const useAppStore = create<AppState>(set => ({
  selectedPaper: null,
  selectedCluster: null,
  searchQuery: '',
  highlightedPath: [],
  hiddenClusterIds: [],
  selectedAuthorId: null,

  setSelectedPaper: p => set({ selectedPaper: p }),
  setSelectedCluster: c => set({ selectedCluster: c }),
  setSearchQuery: q => set({ searchQuery: q }),
  setHighlightedPath: path => set({ highlightedPath: path }),
  toggleClusterVisibility: id =>
    set(s => ({
      hiddenClusterIds: s.hiddenClusterIds.includes(id)
        ? s.hiddenClusterIds.filter(x => x !== id)
        : [...s.hiddenClusterIds, id],
    })),
  setSelectedAuthorId: id => set({ selectedAuthorId: id, highlightedPath: [] }),
}))
