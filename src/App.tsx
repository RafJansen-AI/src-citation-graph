import { useGraphData } from './hooks/useGraphData'
import { CitationGraph } from './components/CitationGraph'
import { ClusterPanel } from './components/ClusterPanel'
import { PathFinder } from './components/PathFinder'
import { SearchBar } from './components/SearchBar'

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

  const focusAreaColors: Record<string, string> = {}
  data.nodes.forEach(n => { if (!focusAreaColors[n.focusArea]) focusAreaColors[n.focusArea] = '#6B7280' })
  data.clusters.forEach(c => {
    data.nodes.filter(n => c.paperIds.includes(n.id)).forEach(n => {
      focusAreaColors[n.focusArea] = c.color
    })
  })

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <header className="px-4 py-2 border-b border-gray-700 flex items-center gap-4">
        <h1 className="font-bold text-lg">SRC Citation Graph</h1>
        <span className="text-sm text-gray-400">
          {data.nodes.length} papers · {data.edges.length} citations
        </span>
      </header>
      <PathFinder graph={data} />
      <SearchBar focusAreas={Object.keys(focusAreaColors)} focusAreaColors={focusAreaColors} />
      <main className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <CitationGraph graph={data} focusAreaColors={focusAreaColors} />
        </div>
        <ClusterPanel graph={data} />
      </main>
    </div>
  )
}
