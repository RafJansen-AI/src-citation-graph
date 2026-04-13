import { useState, useMemo } from 'react'
import type { GraphData } from '../lib/types'
import { useAppStore } from '../store/appStore'
import { buildCoauthorGraph, coauthorPath } from '../lib/coauthorGraph'

interface AuthorEntry {
  authorId: string
  name: string
  paperCount: number
}

export function ResearcherSearch({ graph }: { graph: GraphData }) {
  const { selectedAuthorId, setSelectedAuthorId, setCoauthorPath, setCoauthorNoPath } = useAppStore()
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [toAuthorId, setToAuthorId] = useState<string | null>(null)

  // Deduplicate authors across all papers
  const authors = useMemo<AuthorEntry[]>(() => {
    const map = new Map<string, AuthorEntry>()
    for (const node of graph.nodes) {
      for (const a of node.authors) {
        const entry = map.get(a.authorId)
        if (entry) {
          entry.paperCount++
        } else {
          map.set(a.authorId, { authorId: a.authorId, name: a.name, paperCount: 1 })
        }
      }
    }
    return [...map.values()].sort((a, b) => b.paperCount - a.paperCount)
  }, [graph])

  const coauthorGraph = useMemo(() => buildCoauthorGraph(graph.nodes), [graph])

  const fromSuggestions = useMemo(() => {
    if (fromQuery.length < 2 || selectedAuthorId) return []
    const q = fromQuery.toLowerCase()
    return authors.filter(a => a.name.toLowerCase().includes(q)).slice(0, 6)
  }, [fromQuery, authors, selectedAuthorId])

  const toSuggestions = useMemo(() => {
    if (toQuery.length < 2 || toAuthorId) return []
    const q = toQuery.toLowerCase()
    return authors.filter(a => a.name.toLowerCase().includes(q) && a.authorId !== selectedAuthorId).slice(0, 6)
  }, [toQuery, authors, toAuthorId, selectedAuthorId])

  const selectedAuthor = useMemo(
    () => selectedAuthorId ? authors.find(a => a.authorId === selectedAuthorId) : null,
    [selectedAuthorId, authors]
  )

  function selectFrom(a: AuthorEntry) {
    setSelectedAuthorId(a.authorId)
    setFromQuery(a.name)
  }

  function selectTo(a: AuthorEntry) {
    setToAuthorId(a.authorId)
    setToQuery(a.name)
  }

  function connect() {
    if (!selectedAuthorId || !toAuthorId) return
    const path = coauthorPath(coauthorGraph, selectedAuthorId, toAuthorId)
    setCoauthorPath(path)
    setCoauthorNoPath(path.length === 0)
  }

  function clear() {
    setFromQuery('')
    setToQuery('')
    setSelectedAuthorId(null)
    setToAuthorId(null)
    setCoauthorPath([])
    setCoauthorNoPath(false)
  }

  return (
    <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Researcher Explorer</p>
      <div className="flex gap-2 items-start flex-wrap">
        {/* FROM input */}
        <div className="relative">
          <input
            value={fromQuery}
            onChange={e => { setFromQuery(e.target.value); if (!e.target.value) setSelectedAuthorId(null) }}
            placeholder="Search researcher…"
            className="w-44 text-xs px-2 py-1.5 rounded border"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
          />
          {fromSuggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-0.5 rounded shadow-lg"
                 style={{ background: 'var(--bg-elevated)' }}>
              {fromSuggestions.map(a => (
                <button key={a.authorId} onClick={() => selectFrom(a)}
                  className="block w-full text-left text-xs px-3 py-1.5 truncate"
                  style={{ color: 'var(--text-primary)' }}>
                  {a.name}
                  <span className="ml-2" style={{ color: 'var(--text-muted)' }}>{a.paperCount} papers</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TO input — shown once a "from" author is selected */}
        {selectedAuthorId && (
          <div className="relative">
            <input
              value={toQuery}
              onChange={e => { setToQuery(e.target.value); if (!e.target.value) setToAuthorId(null) }}
              placeholder="Connect to…"
              className="w-40 text-xs px-2 py-1.5 rounded border"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
            {toSuggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-0.5 rounded shadow-lg"
                   style={{ background: 'var(--bg-elevated)' }}>
                {toSuggestions.map(a => (
                  <button key={a.authorId} onClick={() => selectTo(a)}
                    className="block w-full text-left text-xs px-3 py-1.5 truncate"
                    style={{ color: 'var(--text-primary)' }}>
                    {a.name}
                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>{a.paperCount} papers</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connect button — shown when both authors are selected */}
        {selectedAuthorId && toAuthorId && (
          <button onClick={connect}
            className="px-2 py-1.5 text-xs rounded border cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            Connect
          </button>
        )}

        {/* Clear button */}
        {selectedAuthorId && (
          <button onClick={clear} aria-label="×"
            className="px-2 py-1.5 text-xs rounded border cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            ×
          </button>
        )}

        {selectedAuthor && !toAuthorId && (
          <span className="text-xs self-center" style={{ color: 'var(--text-muted)' }}>
            {selectedAuthor.paperCount} papers highlighted
          </span>
        )}
      </div>
    </div>
  )
}
