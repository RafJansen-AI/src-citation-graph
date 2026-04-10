import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'

export function ClusterPanel({ graph }: { graph: GraphData }) {
  const { selectedPaper, selectedCluster, setSelectedPaper, setSelectedCluster } = useAppStore()

  if (selectedPaper) return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <button onClick={() => setSelectedPaper(null)} className="text-xs text-gray-400 hover:text-white mb-3">← Back</button>
      <h2 className="font-semibold text-white mb-1 text-sm leading-tight">{selectedPaper.title}</h2>
      <p className="text-gray-400 text-xs mb-2">{selectedPaper.year} · {selectedPaper.focusArea}</p>
      {selectedPaper.tldr && <p className="text-gray-300 text-sm mb-3">{selectedPaper.tldr}</p>}
      <p className="text-xs text-gray-400">Citations: {selectedPaper.citationCount ?? 0}</p>
      {selectedPaper.externalUrl && (
        <a href={selectedPaper.externalUrl} target="_blank" rel="noopener noreferrer"
           className="mt-3 block text-indigo-400 hover:text-indigo-300 text-xs">
          View on Semantic Scholar →
        </a>
      )}
    </aside>
  )

  if (selectedCluster) {
    const papers = graph.nodes.filter(n => selectedCluster.paperIds.includes(n.id))
    return (
      <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
        <button onClick={() => setSelectedCluster(null)} className="text-xs text-gray-400 hover:text-white mb-3">← All clusters</button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCluster.color }} />
          <h2 className="font-semibold text-white text-sm">{selectedCluster.label}</h2>
        </div>
        <p className="text-gray-300 text-sm mb-4">{selectedCluster.summary || 'No summary yet.'}</p>
        <p className="text-xs text-gray-500 mb-2">{papers.length} papers</p>
        <ul className="space-y-1">
          {papers.slice(0, 15).map(p => (
            <li key={p.id}
                onClick={() => setSelectedPaper(p)}
                className="cursor-pointer text-xs text-gray-300 hover:text-white p-2 rounded hover:bg-gray-700 leading-tight">
              {p.title} ({p.year})
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <h2 className="font-semibold text-white mb-3 text-sm">Research Clusters</h2>
      <ul className="space-y-2">
        {graph.clusters.sort((a, b) => b.paperIds.length - a.paperIds.length).map(c => (
          <li key={c.id}
              onClick={() => setSelectedCluster(c)}
              className="cursor-pointer p-3 rounded border border-gray-700 hover:bg-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-sm font-medium text-white">{c.label}</span>
              <span className="ml-auto text-xs text-gray-400">{c.paperIds.length}</span>
            </div>
            <p className="text-xs text-gray-400 line-clamp-2">{c.summary}</p>
          </li>
        ))}
      </ul>
    </aside>
  )
}
