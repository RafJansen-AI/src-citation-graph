import { create } from 'zustand'
import type { Paper, Cluster } from '../lib/types'

interface AppState {
  selectedPaper: Paper | null
  selectedCluster: Cluster | null
  searchQuery: string
  highlightedPath: string[]
  hiddenClusterIds: number[]
  selectedAuthorId: string | null
  sizeByCitations: boolean
  theme: 'dark' | 'light'
  minCitations: number
  yearRange: [number, number]
  coauthorPath: string[]
  coauthorNoPath: boolean
  selectedFocusAreas: string[]

  setSelectedPaper: (p: Paper | null) => void
  setSelectedCluster: (c: Cluster | null) => void
  setSearchQuery: (q: string) => void
  setHighlightedPath: (path: string[]) => void
  toggleClusterVisibility: (id: number) => void
  // Selecting an author clears any stale highlighted path (path highlight takes priority in nodeColor)
  setSelectedAuthorId: (id: string | null) => void
  toggleSizeByCitations: () => void
  toggleTheme: () => void
  setMinCitations: (n: number) => void
  setYearRange: (range: [number, number]) => void
  setCoauthorPath: (path: string[]) => void
  setCoauthorNoPath: (v: boolean) => void
  toggleFocusArea: (area: string) => void
  clearFocusAreas: () => void
  visibleNodeCount: number | null  // null until CitationGraph computes first filtered result
  visibleEdgeCount: number | null
  visibleTotalCitations: number | null  // sum of citationCount across visible papers
  setVisibleCounts: (nodes: number, edges: number, totalCitations: number) => void
}

export const useAppStore = create<AppState>(set => ({
  selectedPaper: null,
  selectedCluster: null,
  searchQuery: '',
  highlightedPath: [],
  hiddenClusterIds: [],
  selectedAuthorId: null,
  sizeByCitations: false,
  theme: 'dark',
  minCitations: 0,
  yearRange: [2007, 2026],
  coauthorPath: [],
  coauthorNoPath: false,
  selectedFocusAreas: [],
  visibleNodeCount: null,
  visibleEdgeCount: null,
  visibleTotalCitations: null,

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
  setSelectedAuthorId: id => set({ selectedAuthorId: id, highlightedPath: [], coauthorPath: [], coauthorNoPath: false }),
  toggleSizeByCitations: () => set(s => ({ sizeByCitations: !s.sizeByCitations })),
  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setMinCitations: n => set({ minCitations: n }),
  setYearRange: range => set({ yearRange: range }),
  setCoauthorPath: path => set({ coauthorPath: path }),
  setCoauthorNoPath: v => set({ coauthorNoPath: v }),
  toggleFocusArea: area =>
    set(s => ({
      selectedFocusAreas: s.selectedFocusAreas.includes(area)
        ? s.selectedFocusAreas.filter(a => a !== area)
        : [...s.selectedFocusAreas, area],
    })),
  clearFocusAreas: () => set({ selectedFocusAreas: [] }),
  setVisibleCounts: (nodes, edges, totalCitations) => set({ visibleNodeCount: nodes, visibleEdgeCount: edges, visibleTotalCitations: totalCitations }),
}))
