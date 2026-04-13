import { useGraphData } from './hooks/useGraphData'
import { CitationGraph } from './components/CitationGraph'
import { ClusterPanel } from './components/ClusterPanel'
import { ResearcherSearch } from './components/ResearcherSearch'
import { SearchBar } from './components/SearchBar'
import { resolveConceptColor, SRC_CONCEPTS } from './lib/conceptColors'

export default function App() {
  const { data, loading, error } = useGraphData()

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-sm">
      Loading citation network…
    </div>
  )

  if (error || !data) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400 text-sm">
      <span>
        Error loading graph. Run <code className="mx-1 px-1 bg-gray-800 rounded">npm run pipeline</code> first.
        {error && <span className="ml-2 text-gray-500">({error.message})</span>}
      </span>
    </div>
  )

  const configColors: Record<string, string> = { 'Other': '#6B7280' }
  data.clusters.forEach(c => {
    const base = c.label.replace(/ \(\d+\)$/, '')
    if (!configColors[base]) configColors[base] = c.color
  })

  const focusAreaColors: Record<string, string> = {}
  const allAreas = new Set(data.nodes.map(n => n.focusArea))
  allAreas.forEach(area => {
    focusAreaColors[area] = resolveConceptColor(area, configColors)
  })
  focusAreaColors['Other'] = '#6B7280'

  const legendAreas = [...allAreas].filter(a => SRC_CONCEPTS.has(a)).sort()
  if ([...allAreas].some(a => !SRC_CONCEPTS.has(a))) legendAreas.push('Other')

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <header className="px-4 py-2 border-b border-gray-700 flex items-center gap-4">
        <h1 className="font-bold text-lg">SRC Citation Graph</h1>
        <span className="text-sm text-gray-400">
          {data.nodes.length} papers · {data.edges.length} citations
        </span>
      </header>
      <ResearcherSearch graph={data} />
      <SearchBar focusAreas={legendAreas} focusAreaColors={focusAreaColors} />
      <main className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <CitationGraph graph={data} focusAreaColors={focusAreaColors} />
        </div>
        <ClusterPanel graph={data} />
      </main>
    </div>
  )
}
