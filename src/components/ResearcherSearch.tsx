import { useState, useMemo } from 'react'
import type { GraphData } from '../lib/types'
import { useAppStore } from '../store/appStore'

interface AuthorEntry {
  authorId: string
  name: string
  paperCount: number
}

export function ResearcherSearch({ graph }: { graph: GraphData }) {
  const { selectedAuthorId, setSelectedAuthorId } = useAppStore()
  const [query, setQuery] = useState('')

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

  const suggestions = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return authors.filter(a => a.name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, authors])

  const selectedAuthor = useMemo(
    () => selectedAuthorId ? authors.find(a => a.authorId === selectedAuthorId) : null,
    [selectedAuthorId, authors]
  )

  function selectAuthor(a: AuthorEntry) {
    setSelectedAuthorId(a.authorId)
    setQuery(a.name)
  }

  function clear() {
    setQuery('')
    setSelectedAuthorId(null)
  }

  return (
    <div className="px-4 py-2 border-b border-gray-700 bg-gray-900">
      <p className="text-xs font-semibold text-gray-300 mb-1">Researcher Explorer</p>
      <div className="flex gap-2 items-start">
        <div className="relative flex-1 max-w-xs">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value) setSelectedAuthorId(null) }}
            placeholder="Search researcher…"
            className="w-full bg-gray-700 text-white text-xs px-2 py-1.5 rounded border border-gray-600"
          />
          {suggestions.length > 0 && !selectedAuthorId && (
            <div className="absolute z-10 top-full left-0 right-0 mt-0.5 bg-gray-600 rounded shadow-lg">
              {suggestions.map(a => (
                <button
                  key={a.authorId}
                  onClick={() => selectAuthor(a)}
                  className="block w-full text-left text-xs px-3 py-1.5 hover:bg-gray-500 text-white truncate"
                >
                  {a.name}
                  <span className="ml-2 text-gray-400">{a.paperCount} papers</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedAuthorId && (
          <button
            onClick={clear}
            aria-label="×"
            className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
          >
            ×
          </button>
        )}
        {selectedAuthor && (
          <span className="text-xs text-gray-400 self-center">
            {selectedAuthor.paperCount} papers highlighted
          </span>
        )}
      </div>
    </div>
  )
}
