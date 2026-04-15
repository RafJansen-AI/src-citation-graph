import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'
import { toBibtex, toMarkdown, downloadFile } from '../lib/export'

interface Props {
  focusAreas: string[]
  focusAreaColors: Record<string, string>
  graph?: GraphData
}

const MIN_YEAR = 2007
const MAX_YEAR = 2026

const DECADE_PRESETS: { label: string; range: [number, number] }[] = [
  { label: '2000s', range: [2007, 2009] },
  { label: '2010s', range: [2010, 2019] },
  { label: '2020s', range: [2020, 2026] },
]

export function SearchBar({ focusAreas, focusAreaColors, graph }: Props) {
  const {
    setSearchQuery,
    sizeByCitations, toggleSizeByCitations,
    minCitations, setMinCitations,
    yearRange, setYearRange,
    selectedFocusAreas, toggleFocusArea, clearFocusAreas,
  } = useAppStore()
  const [localQuery, setLocalQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localQuery), 150)
    return () => clearTimeout(t)
  }, [localQuery, setSearchQuery])

  function setFrom(raw: string) {
    const v = parseInt(raw, 10)
    if (isNaN(v)) return
    setYearRange([Math.max(MIN_YEAR, Math.min(v, yearRange[1])), yearRange[1]])
  }

  function setTo(raw: string) {
    const v = parseInt(raw, 10)
    if (isNaN(v)) return
    setYearRange([yearRange[0], Math.min(MAX_YEAR, Math.max(v, yearRange[0]))])
  }

  const isAllTime = yearRange[0] === MIN_YEAR && yearRange[1] === MAX_YEAR

  const matchingPapers = useMemo(() => {
    if (!graph || localQuery.length < 2) return []
    const q = localQuery.toLowerCase()
    return graph.nodes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.authors.some(a => a.name.toLowerCase().includes(q))
    )
  }, [graph, localQuery])

  const activeDecade = DECADE_PRESETS.find(
    d => d.range[0] === yearRange[0] && d.range[1] === yearRange[1]
  )

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
      {matchingPapers.length > 0 && (
        <>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {matchingPapers.length} paper{matchingPapers.length !== 1 ? 's' : ''}
          </span>
          <button
            aria-label="Export BibTeX"
            onClick={() => {
              const slug = `keyword-${localQuery.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
              downloadFile(toBibtex(matchingPapers), `src-${slug}.bib`, 'text/plain')
            }}
            className="text-xs px-2 py-1 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            ↓ BibTeX
          </button>
          <button
            aria-label="Export Markdown"
            onClick={() => {
              const label = `Keyword: ${localQuery}`
              const slug = `keyword-${localQuery.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
              downloadFile(toMarkdown(matchingPapers, label), `src-${slug}.md`, 'text/markdown')
            }}
            className="text-xs px-2 py-1 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            ↓ Markdown
          </button>
        </>
      )}
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

      {/* Year range: number inputs + decade presets */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Years</span>
        <input
          type="number" min={MIN_YEAR} max={MAX_YEAR}
          value={yearRange[0]}
          onChange={e => setFrom(e.target.value)}
          className="w-16 px-1 py-0.5 rounded border text-center"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
          aria-label="From year"
        />
        <span style={{ color: 'var(--text-muted)' }}>–</span>
        <input
          type="number" min={MIN_YEAR} max={MAX_YEAR}
          value={yearRange[1]}
          onChange={e => setTo(e.target.value)}
          className="w-16 px-1 py-0.5 rounded border text-center"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
          aria-label="To year"
        />
        <div className="flex gap-1">
          <button
            onClick={() => setYearRange([MIN_YEAR, MAX_YEAR])}
            className="text-xs px-1.5 py-0.5 rounded border cursor-pointer"
            style={{
              borderColor: isAllTime ? 'var(--text-secondary)' : 'var(--border)',
              color: isAllTime ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isAllTime ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            All
          </button>
          {DECADE_PRESETS.map(d => {
            const active = activeDecade?.label === d.label
            return (
              <button
                key={d.label}
                onClick={() => setYearRange(d.range)}
                className="text-xs px-1.5 py-0.5 rounded border cursor-pointer"
                style={{
                  borderColor: active ? 'var(--text-secondary)' : 'var(--border)',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: active ? 'var(--bg-elevated)' : 'transparent',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

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
