import { useState } from 'react'
import type { GraphData, Paper } from '../lib/types'
import { useShortestPath } from '../hooks/useShortestPath'

export function PathFinder({ graph }: { graph: GraphData }) {
  const [srcQ, setSrcQ] = useState('')
  const [tgtQ, setTgtQ] = useState('')
  const [srcId, setSrcId] = useState<string | null>(null)
  const [tgtId, setTgtId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const { path, findPath, clearPath } = useShortestPath(graph.edges)

  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const suggest = (q: string): Paper[] =>
    q.length < 3 ? [] :
    graph.nodes.filter(n =>
      n.title.toLowerCase().includes(q.toLowerCase()) ||
      n.authors.some(a => a.name.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 5)

  const Autocomplete = ({
    value, onChange, onSelect, placeholder
  }: { value: string; onChange: (v: string) => void; onSelect: (p: Paper) => void; placeholder: string }) => (
    <div className="relative flex-1">
      <input value={value} onChange={e => onChange(e.target.value)}
             placeholder={placeholder}
             className="w-full bg-gray-700 text-white text-xs px-2 py-1.5 rounded border border-gray-600" />
      {suggest(value).map(p => (
        <button key={p.id} onClick={() => onSelect(p)}
                className="block w-full text-left text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white truncate">
          {p.title.slice(0, 55)}
        </button>
      ))}
    </div>
  )

  return (
    <div className="px-4 py-2 border-b border-gray-700 bg-gray-900">
      <p className="text-xs font-semibold text-gray-300 mb-1">Find Citation Path</p>
      <div className="flex gap-2 items-start">
        <Autocomplete value={srcQ} placeholder="Source paper/author…"
          onChange={v => { setSrcQ(v); setSrcId(null); clearPath(); setHasSearched(false) }}
          onSelect={p => { setSrcId(p.id); setSrcQ(p.title) }} />
        <Autocomplete value={tgtQ} placeholder="Target paper/author…"
          onChange={v => { setTgtQ(v); setTgtId(null); clearPath(); setHasSearched(false) }}
          onSelect={p => { setTgtId(p.id); setTgtQ(p.title) }} />
        <button
          onClick={() => { if (srcId && tgtId) { setHasSearched(true); findPath(srcId, tgtId) } }}
          disabled={!srcId || !tgtId}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs rounded">
          Find
        </button>
      </div>
      {path.length > 0 && (
        <p className="text-xs text-yellow-300 mt-1">
          {path.length - 1} hops: {path.map(id => byId.get(id)?.title?.slice(0, 25) ?? id).join(' → ')}
        </p>
      )}
      {hasSearched && path.length === 0 && (
        <p className="text-xs text-red-400 mt-1">No citation path found.</p>
      )}
    </div>
  )
}
