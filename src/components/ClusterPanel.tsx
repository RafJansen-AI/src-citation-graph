import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'

const aside = "w-80 shrink-0 border-l p-4 overflow-y-auto"
const asideStyle = { background: 'var(--bg-surface)', borderColor: 'var(--border)' }
const backBtn = "text-xs mb-3 cursor-pointer"
const backBtnStyle = { color: 'var(--text-muted)' }

export function ClusterPanel({ graph }: { graph: GraphData }) {
  const {
    selectedPaper, selectedCluster, selectedAuthorId,
    setSelectedPaper, setSelectedCluster, setSelectedAuthorId,
    hiddenClusterIds, toggleClusterVisibility,
  } = useAppStore()

  if (selectedPaper) return (
    <aside className={aside} style={asideStyle}>
      <button onClick={() => setSelectedPaper(null)} className={backBtn} style={backBtnStyle}>← Back</button>
      <h2 className="font-semibold mb-1 text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{selectedPaper.title}</h2>
      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{selectedPaper.year} · {selectedPaper.focusArea}</p>
      {selectedPaper.tldr && <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{selectedPaper.tldr}</p>}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Citations: {selectedPaper.citationCount ?? 0}</p>
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
      <aside className={aside} style={asideStyle}>
        <button onClick={() => setSelectedAuthorId(null)} className={backBtn} style={backBtnStyle}>
          ← All clusters
        </button>
        <h2 className="font-semibold mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>{authorName}</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{authorPapers.length} papers in the network</p>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Research clusters:</p>
        <ul className="space-y-1">
          {[...clusterCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([clusterId, count]) => {
              const cluster = clusterById.get(clusterId)
              if (!cluster) return null
              return (
                <li key={clusterId} onClick={() => setSelectedCluster(cluster)}
                    className="cursor-pointer p-2 rounded flex items-center gap-2"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{cluster.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count}</span>
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
      <aside className={aside} style={asideStyle}>
        <button onClick={() => setSelectedCluster(null)} className={backBtn} style={backBtnStyle}>← All clusters</button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCluster.color }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedCluster.label}</h2>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{selectedCluster.summary || 'No summary yet.'}</p>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{papers.length} papers</p>
        <ul className="space-y-1">
          {papers.slice(0, 15).map(p => (
            <li key={p.id}
                onClick={() => setSelectedPaper(p)}
                className="cursor-pointer text-xs p-2 rounded leading-tight"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget.style.background = 'var(--hover-bg)'); (e.currentTarget.style.color = 'var(--text-primary)') }}
                onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-secondary)') }}>
              {p.title} ({p.year})
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  return (
    <aside className={aside} style={asideStyle}>
      <h2 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Research Clusters</h2>
      <ul className="space-y-2">
        {graph.clusters
          .slice()
          .sort((a, b) => b.paperIds.length - a.paperIds.length)
          .map(c => {
            const hidden = hiddenClusterIds.includes(c.id)
            return (
              <li key={c.id} className={`p-3 rounded border ${hidden ? 'opacity-40' : ''}`}
                  style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <button
                    onClick={() => setSelectedCluster(c)}
                    className="text-sm font-medium text-left hover:underline flex-1 truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {c.label}
                  </button>
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{c.paperIds.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleClusterVisibility(c.id) }}
                    aria-label={hidden ? `Show ${c.label}` : `Hide ${c.label}`}
                    className="text-xs ml-1 shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    title={hidden ? 'Show' : 'Hide'}
                  >
                    {hidden ? '◉' : '◎'}
                  </button>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{c.summary}</p>
              </li>
            )
          })}
      </ul>
    </aside>
  )
}
