import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphData, Paper } from '../lib/types'
import { useAppStore } from '../store/appStore'
import { CLUSTER_LABEL_TO_THEME } from '../lib/srcThemes'

const DIMMED = '#1F2937'
const EDGE_DIM = '#1F2937'
const EDGE_DEFAULT = '#4B5563'
// Blue = papers this paper cites (outgoing); orange = papers that cite this paper (incoming)
const COLOR_CITES = '#60A5FA'
const COLOR_CITED_BY = '#FB923C'

function resolveId(n: unknown): string {
  if (typeof n === 'string') return n
  if (n && typeof n === 'object' && 'id' in n) return (n as any).id as string
  return ''
}

interface Props {
  graph: GraphData
  focusAreaColors: Record<string, string>
}

export function CitationGraph({ graph, focusAreaColors }: Props) {
  const { setSelectedPaper, selectedPaper, highlightedPath, selectedCluster, searchQuery, hiddenClusterIds, selectedAuthorId, sizeByCitations, theme, minCitations, yearRange, selectedFocusAreas, coauthorPath } = useAppStore()
  const fgRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Measure the container so ForceGraph2D gets exact pixel dimensions.
  // Without this, auto-detection inside a flex container can return 0 or a
  // wrong value, causing the canvas coordinate system to mismatch the
  // visual display — all clicks land at wrong positions and miss every node.
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('charge')?.strength(-120)
    fg.d3Force('link')?.distance(60)
  }, [])

  const filteredGraph = useMemo(() => {
    let nodes = graph.nodes

    // Text search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matched = new Set(
        nodes
          .filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.authors.some(a => a.name.toLowerCase().includes(q))
          )
          .map(n => n.id)
      )
      nodes = nodes.filter(n => matched.has(n.id))
    }

    // Hidden cluster filter
    if (hiddenClusterIds.length > 0) {
      nodes = nodes.filter(n => !hiddenClusterIds.includes(n.clusterId))
    }

    // Minimum citation count filter
    if (minCitations > 0) {
      nodes = nodes.filter(n => (n.citationCount ?? 0) >= minCitations)
    }

    // Year range filter
    if (yearRange[0] > 2007 || yearRange[1] < 2026) {
      nodes = nodes.filter(n => n.year >= yearRange[0] && n.year <= yearRange[1])
    }

    // SRC theme filter (multi-select) — keyed by clusterId, not focusArea
    if (selectedFocusAreas.length > 0) {
      const selectedThemes = new Set(selectedFocusAreas)
      nodes = nodes.filter(n => selectedThemes.has(CLUSTER_LABEL_TO_THEME[n.focusArea] ?? 'Other'))
    }

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = graph.edges.filter(
      e => nodeIds.has(resolveId(e.source)) && nodeIds.has(resolveId(e.target))
    )
    return { nodes, links }
  }, [graph, searchQuery, hiddenClusterIds, minCitations, yearRange, selectedFocusAreas])

  // Directional neighbor sets for selected-paper highlighting
  // citesIds: papers the selected paper cites (outgoing edges from selected)
  // citedByIds: papers that cite the selected paper (incoming edges to selected)
  const { citesIds, citedByIds, neighborEdgeKeys } = useMemo(() => {
    if (!selectedPaper) return {
      citesIds: new Set<string>(), citedByIds: new Set<string>(), neighborEdgeKeys: new Set<string>(),
    }
    const citesIds = new Set<string>()
    const citedByIds = new Set<string>()
    const neighborEdgeKeys = new Set<string>()
    for (const link of filteredGraph.links) {
      const src = resolveId(link.source)
      const tgt = resolveId(link.target)
      if (src === selectedPaper.id) { citesIds.add(tgt); neighborEdgeKeys.add(`${src}|${tgt}`) }
      if (tgt === selectedPaper.id) { citedByIds.add(src); neighborEdgeKeys.add(`${tgt}|${src}`) }
    }
    return { citesIds, citedByIds, neighborEdgeKeys }
  }, [selectedPaper, filteredGraph.links])

  const nodeColor = useCallback((node: any) => {
    const p = node as Paper
    if (highlightedPath.includes(p.id)) return '#FBBF24'
    // Coauthor path active: dim everything except the shared (highlighted) papers
    if (coauthorPath.length > 0) return DIMMED
    const theme = CLUSTER_LABEL_TO_THEME[p.focusArea] ?? 'Other'
    const themeColor = focusAreaColors[theme] ?? '#6B7280'
    // Selected-paper: colour by citation direction; dim everything else
    if (selectedPaper) {
      if (p.id === selectedPaper.id) return '#FFFFFF'
      if (citesIds.has(p.id)) return COLOR_CITES       // papers this paper cites → blue
      if (citedByIds.has(p.id)) return COLOR_CITED_BY  // papers that cite this paper → orange
      return DIMMED
    }
    // selectedAuthorId stores the author's name (OpenAlex gives same person multiple IDs)
    if (selectedAuthorId) {
      return p.authors.some(a => a.name === selectedAuthorId) ? themeColor : DIMMED
    }
    if (selectedCluster && !selectedCluster.paperIds.includes(p.id)) return '#374151'
    return themeColor
  }, [highlightedPath, coauthorPath, selectedPaper, citesIds, citedByIds, selectedAuthorId, selectedCluster, focusAreaColors])

  const nodeLabel = useCallback((node: any) => {
    const p = node as Paper
    return `${p.title} (${p.year})${p.tldr ? `\n${p.tldr}` : ''}`
  }, [])

  const nodeVal = useCallback((node: any) => {
    if (!sizeByCitations) return 1
    const p = node as Paper
    // Minimum of 1 so zero-citation papers are still visible and clickable.
    // Math.log(1+1) = 0 without the max, giving zero-radius nodes.
    return Math.max(1, Math.log((p.citationCount ?? 0) + 1))
  }, [sizeByCitations])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {size.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={size.width}
          height={size.height}
          graphData={filteredGraph}
          nodeId="id"
          nodeColor={nodeColor}
          nodeLabel={nodeLabel}
          nodeRelSize={6}
          nodeVal={nodeVal}
          linkColor={(link: any) => {
            if (!selectedPaper) return EDGE_DEFAULT
            const src = resolveId(link.source)
            const tgt = resolveId(link.target)
            if (src === selectedPaper.id) return COLOR_CITES      // outgoing: blue
            if (tgt === selectedPaper.id) return COLOR_CITED_BY   // incoming: orange
            return EDGE_DIM
          }}
          linkWidth={(link: any) => {
            if (!selectedPaper) return 1
            const key = `${resolveId(link.source)}|${resolveId(link.target)}`
            const keyRev = `${resolveId(link.target)}|${resolveId(link.source)}`
            return (neighborEdgeKeys.has(key) || neighborEdgeKeys.has(keyRev)) ? 2 : 1
          }}
          linkDirectionalArrowLength={(link: any) => {
            if (!selectedPaper) return 0
            const key = `${resolveId(link.source)}|${resolveId(link.target)}`
            const keyRev = `${resolveId(link.target)}|${resolveId(link.source)}`
            return (neighborEdgeKeys.has(key) || neighborEdgeKeys.has(keyRev)) ? 5 : 0
          }}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={(link: any) => {
            const src = resolveId(link.source)
            const tgt = resolveId(link.target)
            if (src === selectedPaper?.id) return COLOR_CITES
            if (tgt === selectedPaper?.id) return COLOR_CITED_BY
            return EDGE_DEFAULT
          }}
          onNodeClick={(node: any) => setSelectedPaper(node as Paper)}
          backgroundColor={theme === 'dark' ? '#111827' : '#F3F4F6'}
          warmupTicks={150}
          cooldownTicks={50}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.4}
        />
      )}
    </div>
  )
}
