import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphData, Paper } from '../lib/types'
import { useAppStore } from '../store/appStore'
import { buildClusterThemeMap } from '../lib/srcThemes'

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
  const { setSelectedPaper, highlightedPath, selectedCluster, searchQuery, hiddenClusterIds, selectedAuthorId, sizeByCitations, theme, minCitations, selectedFocusAreas } = useAppStore()
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

  const clusterThemeMap = useMemo(
    () => buildClusterThemeMap(graph.clusters),
    [graph.clusters]
  )

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

    // SRC theme filter (multi-select) — keyed by clusterId, not focusArea
    if (selectedFocusAreas.length > 0) {
      const selectedThemes = new Set(selectedFocusAreas)
      nodes = nodes.filter(n => selectedThemes.has(clusterThemeMap.get(n.clusterId) ?? 'Other'))
    }

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = graph.edges.filter(
      e => nodeIds.has(resolveId(e.source)) && nodeIds.has(resolveId(e.target))
    )
    return { nodes, links }
  }, [graph, searchQuery, hiddenClusterIds, minCitations, selectedFocusAreas, clusterThemeMap])

  const nodeColor = useCallback((node: any) => {
    const p = node as Paper
    if (highlightedPath.includes(p.id)) return '#FBBF24'
    const theme = clusterThemeMap.get(p.clusterId) ?? 'Other'
    const themeColor = focusAreaColors[theme] ?? '#6B7280'
    // selectedAuthorId stores the author's name (OpenAlex gives same person multiple IDs)
    if (selectedAuthorId) {
      return p.authors.some(a => a.name === selectedAuthorId) ? themeColor : '#1F2937'
    }
    if (selectedCluster && !selectedCluster.paperIds.includes(p.id)) return '#374151'
    return themeColor
  }, [highlightedPath, selectedAuthorId, selectedCluster, focusAreaColors, clusterThemeMap])

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
          linkColor={() => '#4B5563'}
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
