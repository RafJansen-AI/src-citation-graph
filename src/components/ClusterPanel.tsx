import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'

export function ClusterPanel({ graph }: { graph: GraphData }) {
  const {
    selectedPaper, selectedCluster, selectedAuthorId,
    setSelectedPaper, setSelectedCluster, setSelectedAuthorId,
    hiddenClusterIds, toggleClusterVisibility,
  } = useAppStore()

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
          View on OpenAlex →
        </a>
      )}
    </aside>
  )

  // Author view: show cluster breakdown for the selected author
  if (selectedAuthorId) {
    const authorPapers = graph.nodes.filter(n =>
      n.authors.some(a => a.authorId === selectedAuthorId)
    )
    const authorName = authorPapers[0]?.authors.find(a => a.authorId === selectedAuthorId)?.name ?? 'Unknown'
    const clusterCounts = new Map<number, number>()
    for (const p of authorPapers) {
      clusterCounts.set(p.clusterId, (clusterCounts.get(p.clusterId) ?? 0) + 1)
    }
    const clusterById = new Map(graph.clusters.map(c => [c.id, c]))

    return (
      <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
        <button onClick={() => setSelectedAuthorId(null)} className="text-xs text-gray-400 hover:text-white mb-3">
          ← All clusters
        </button>
        <h2 className="font-semibold text-white mb-1 text-sm">{authorName}</h2>
        <p className="text-gray-400 text-xs mb-4">{authorPapers.length} papers in the network</p>
        <p className="text-xs font-semibold text-gray-300 mb-2">Research clusters:</p>
        <ul className="space-y-1">
          {[...clusterCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([clusterId, count]) => {
              const cluster = clusterById.get(clusterId)
              if (!cluster) return null
              return (
                <li key={clusterId} onClick={() => setSelectedCluster(cluster)}
                    className="cursor-pointer p-2 rounded hover:bg-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
                  <span className="text-xs text-gray-300 flex-1 truncate">{cluster.label}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </li>
              )
            })}
        </ul>
      </aside>
    )
  }

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
        {graph.clusters
          .slice()
          .sort((a, b) => b.paperIds.length - a.paperIds.length)
          .map(c => {
            const hidden = hiddenClusterIds.includes(c.id)
            return (
              <li key={c.id} className={`p-3 rounded border border-gray-700 ${hidden ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <button
                    onClick={() => setSelectedCluster(c)}
                    className="text-sm font-medium text-white text-left hover:underline flex-1 truncate"
                  >
                    {c.label}
                  </button>
                  <span className="text-xs text-gray-400 shrink-0">{c.paperIds.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleClusterVisibility(c.id) }}
                    aria-label={hidden ? `Show ${c.label}` : `Hide ${c.label}`}
                    className="text-gray-500 hover:text-white text-xs ml-1 shrink-0"
                    title={hidden ? 'Show' : 'Hide'}
                  >
                    {hidden ? '◉' : '◎'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{c.summary}</p>
              </li>
            )
          })}
      </ul>
    </aside>
  )
}
