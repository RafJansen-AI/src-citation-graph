import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

interface Props {
  focusAreas: string[]
  focusAreaColors: Record<string, string>
}

export function SearchBar({ focusAreas, focusAreaColors }: Props) {
  const { setSearchQuery, sizeByCitations, toggleSizeByCitations, minCitations, setMinCitations } = useAppStore()
  const [localQuery, setLocalQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localQuery), 150)
    return () => clearTimeout(t)
  }, [localQuery, setSearchQuery])

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-700 bg-gray-800 flex-wrap">
      <input
        value={localQuery}
        onChange={e => setLocalQuery(e.target.value)}
        placeholder="Filter papers or authors…"
        className="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600 w-56"
      />
      <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
        <input type="checkbox" checked={sizeByCitations} onChange={toggleSizeByCitations} />
        Size by citations
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-300">
        Min citations: {minCitations}
        <input
          type="range" min={0} max={200} step={10}
          value={minCitations}
          onChange={e => setMinCitations(Number(e.target.value))}
          className="w-24"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        {focusAreas.map(area => (
          <span key={area} className="flex items-center gap-1 text-xs text-gray-300">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: focusAreaColors[area] }}
            />
            {area}
          </span>
        ))}
      </div>
    </div>
  )
}
