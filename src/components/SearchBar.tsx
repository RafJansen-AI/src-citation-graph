import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

interface Props {
  focusAreas: string[]
  focusAreaColors: Record<string, string>
}

export function SearchBar({ focusAreas, focusAreaColors }: Props) {
  const {
    setSearchQuery,
    sizeByCitations, toggleSizeByCitations,
    minCitations, setMinCitations,
    yearRange, setYearRange,
    selectedFocusAreas, toggleFocusArea, clearFocusAreas,
  } = useAppStore()

  const MIN_YEAR = 1973
  const MAX_YEAR = 2026
  const [localQuery, setLocalQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localQuery), 150)
    return () => clearTimeout(t)
  }, [localQuery, setSearchQuery])

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b flex-wrap"
         style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <input
        value={localQuery}
        onChange={e => setLocalQuery(e.target.value)}
        placeholder="Filter papers or authors…"
        className="text-sm px-3 py-1 rounded border w-56"
        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
      />
      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
             style={{ color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={sizeByCitations} onChange={toggleSizeByCitations} />
        Size by citations
      </label>
      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Min citations: {minCitations}
        <input
          type="range" min={0} max={200} step={10}
          value={minCitations}
          onChange={e => setMinCitations(Number(e.target.value))}
          className="w-24"
        />
      </label>
      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Years: {yearRange[0]}–{yearRange[1]}
        <input
          type="range" min={MIN_YEAR} max={MAX_YEAR} step={1}
          value={yearRange[0]}
          onChange={e => setYearRange([Math.min(Number(e.target.value), yearRange[1]), yearRange[1]])}
          className="w-20"
        />
        <input
          type="range" min={MIN_YEAR} max={MAX_YEAR} step={1}
          value={yearRange[1]}
          onChange={e => setYearRange([yearRange[0], Math.max(Number(e.target.value), yearRange[0])])}
          className="w-20"
        />
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {focusAreas.map(area => {
          const active = selectedFocusAreas.includes(area)
          return (
            <button
              key={area}
              onClick={() => toggleFocusArea(area)}
              aria-label={area}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-opacity"
              style={{
                borderColor: active ? focusAreaColors[area] : 'var(--border)',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                background: active ? 'var(--bg-elevated)' : 'transparent',
                opacity: selectedFocusAreas.length > 0 && !active ? 0.5 : 1,
              }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: focusAreaColors[area] }}
              />
              {area}
            </button>
          )
        })}
        {selectedFocusAreas.length > 0 && (
          <button
            onClick={clearFocusAreas}
            className="text-xs px-2 py-0.5 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
