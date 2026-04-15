import { useState, useEffect, useRef } from 'react'
import type { GraphData, Paper } from '../lib/types'
import { findRelevantPapers, embedQuery } from '../lib/citationFinder'
import { useAppStore } from '../store/appStore'
import { ExportButtons } from './ExportButtons'

const aside = "w-80 shrink-0 border-l p-4 overflow-y-auto"
const asideStyle = { background: 'var(--bg-surface)', borderColor: 'var(--border)' }

interface Props {
  graph: GraphData
  onClose: () => void
}

export function CitationFinderPanel({ graph, onClose }: Props) {
  const { setHighlightedPath, setSelectedPaper } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Paper[]>([])
  const [boostByCitations, setBoostByCitations] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mode, setMode] = useState<'semantic' | 'keyword' | null>(null)
  const embeddingsRef = useRef<Map<string, number[]> | null>(null)

  // Load pre-computed paper embeddings once
  useEffect(() => {
    fetch('/data/embeddings.json')
      .then(r => r.ok ? r.json() : null)
      .then((raw: Record<string, number[]> | null) => {
        if (raw) embeddingsRef.current = new Map(Object.entries(raw))
      })
      .catch(() => {})
  }, [])

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const paperEmbeddings = embeddingsRef.current ?? undefined
      const queryEmbedding = paperEmbeddings
        ? await embedQuery(query) ?? undefined
        : undefined

      const found = findRelevantPapers(query, graph.nodes, {
        queryEmbedding,
        paperEmbeddings,
        boostByCitations,
      })
      setResults(found)
      setHighlightedPath(found.map(p => p.id))
      setMode(queryEmbedding ? 'semantic' : 'keyword')
    } finally {
      setSearching(false)
    }
  }

  function handleClose() {
    setHighlightedPath([])
    onClose()
  }

  return (
    <aside className={aside} style={asideStyle}>
      <button onClick={handleClose} className="text-xs mb-3 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}>← Back</button>
      <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        Who should I cite?
      </h2>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Paste your paper's title and abstract. We'll find the most relevant SRC papers.
      </p>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSearch() }}
        placeholder="Paste your title and abstract here…"
        rows={6}
        className="w-full text-xs p-2 rounded border resize-none mb-2"
        style={{
          background: 'var(--input-bg)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border)',
        }}
      />
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
               style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={boostByCitations}
            onChange={e => setBoostByCitations(e.target.checked)}
            aria-label="Boost by citations"
          />
          Boost by citations
        </label>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          aria-label="Search"
          className="text-xs px-3 py-1 rounded border cursor-pointer disabled:opacity-40"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          {results.length} papers — {mode === 'semantic' ? 'semantic' : 'keyword'} match — highlighted in yellow
        </p>
      )}
      {results.length > 0 && (
        <ExportButtons papers={results} label="Citation Finder Results" />
      )}
      {query.trim() && results.length === 0 && !searching && mode !== null && (
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>No matches found.</p>
      )}
      <ul className="space-y-1">
        {results.map(p => (
          <li key={p.id}
              onClick={() => setSelectedPaper(p)}
              className="cursor-pointer text-xs p-2 rounded leading-tight"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => {
                (e.currentTarget.style.background = 'var(--hover-bg)')
                ;(e.currentTarget.style.color = 'var(--text-primary)')
              }}
              onMouseLeave={e => {
                (e.currentTarget.style.background = 'transparent')
                ;(e.currentTarget.style.color = 'var(--text-secondary)')
              }}>
            <span className="font-medium">{p.title}</span>
            <span className="ml-1" style={{ color: 'var(--text-muted)' }}>({p.year})</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
