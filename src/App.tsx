import { useState } from 'react'
import { useGraphData } from './hooks/useGraphData'
import { CitationGraph } from './components/CitationGraph'
import { ClusterPanel } from './components/ClusterPanel'
import { CitationFinderPanel } from './components/CitationFinderPanel'
import { ResearcherSearch } from './components/ResearcherSearch'
import { SearchBar } from './components/SearchBar'
import { SRC_THEME_COLORS, SRC_THEMES } from './lib/srcThemes'
import { useAppStore } from './store/appStore'

export default function App() {
  const { data, loading, error } = useGraphData()
  const { theme, toggleTheme, visibleNodeCount, visibleEdgeCount, visibleTotalCitations } = useAppStore()
  const [showCitationFinder, setShowCitationFinder] = useState(false)

  if (loading) return (
    <div data-theme={theme} className="flex items-center justify-center h-screen text-sm"
         style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      Loading citation network…
    </div>
  )

  if (error || !data) return (
    <div data-theme={theme} className="flex items-center justify-center h-screen text-sm"
         style={{ background: 'var(--bg-base)', color: '#F87171' }}>
      <span>
        Error loading graph. Run <code className="mx-1 px-1 rounded" style={{ background: 'var(--bg-elevated)' }}>npm run pipeline</code> first.
        {error && <span className="ml-2" style={{ color: 'var(--text-muted)' }}>({error.message})</span>}
      </span>
    </div>
  )

  const focusAreaColors = SRC_THEME_COLORS
  const legendAreas = [...SRC_THEMES, 'Other']

  return (
    <div data-theme={theme} className="h-screen flex flex-col"
         style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="px-4 py-2 flex items-center gap-4 border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <h1 className="font-bold text-lg">SRC Research Nexus</h1>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {visibleNodeCount ?? data.nodes.length} papers · {visibleEdgeCount ?? data.edges.length} in-house citations · {(visibleTotalCitations ?? data.nodes.reduce((s, n) => s + (n.citationCount ?? 0), 0)).toLocaleString()} total citations
        </span>
        <button
          onClick={() => setShowCitationFinder(v => !v)}
          className="text-xs px-2 py-1 rounded border cursor-pointer"
          style={{
            borderColor: showCitationFinder ? 'var(--text-secondary)' : 'var(--border)',
            color: showCitationFinder ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: showCitationFinder ? 'var(--bg-elevated)' : 'transparent',
          }}
        >
          Who should I cite?
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="ml-auto text-xs px-2 py-1 rounded border cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
        >
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
      </header>
      <ResearcherSearch graph={data} />
      <SearchBar focusAreas={legendAreas} focusAreaColors={focusAreaColors} graph={data} />
      <main className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <CitationGraph graph={data} focusAreaColors={focusAreaColors} />
        </div>
        {showCitationFinder
          ? <CitationFinderPanel graph={data} onClose={() => setShowCitationFinder(false)} />
          : <ClusterPanel graph={data} />
        }
      </main>
    </div>
  )
}
