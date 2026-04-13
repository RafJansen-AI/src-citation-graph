import { useCallback, useMemo, useRef, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphData, Paper } from '../lib/types'
import { useAppStore } from '../store/appStore'

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
  const { setSelectedPaper, highlightedPath, selectedCluster, searchQuery, hiddenClusterIds, selectedAuthorId, sizeByCitations, theme, minCitations } = useAppStore()
  const fgRef = useRef<any>(null)

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

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = graph.edges.filter(
      e => nodeIds.has(resolveId(e.source)) && nodeIds.has(resolveId(e.target))
    )
    return { nodes, links }
  }, [graph, searchQuery, hiddenClusterIds, minCitations])

  // Re-heat simulation when the filtered set changes (search, toggle, slider)
  useEffect(() => {
    fgRef.current?.d3ReheatSimulation()
  }, [filteredGraph])

  const nodeColor = useCallback((node: any) => {
    const p = node as Paper
    if (highlightedPath.includes(p.id)) return '#FBBF24'
    // Author highlight: dim all non-author papers
    // selectedAuthorId stores the author's name (OpenAlex gives same person multiple IDs)
    if (selectedAuthorId) {
      return p.authors.some(a => a.name === selectedAuthorId)
        ? (focusAreaColors[p.focusArea] ?? '#6B7280')
        : '#1F2937'
    }
    if (selectedCluster && !selectedCluster.paperIds.includes(p.id)) return '#374151'
    return focusAreaColors[p.focusArea] ?? '#6B7280'
  }, [highlightedPath, selectedAuthorId, selectedCluster, focusAreaColors])

  const nodeLabel = useCallback((node: any) => {
    const p = node as Paper
    return `${p.title} (${p.year})${p.tldr ? `\n${p.tldr}` : ''}`
  }, [])

  const nodeVal = useCallback((node: any) => {
    if (!sizeByCitations) return 1
    const p = node as Paper
    return Math.log((p.citationCount ?? 1) + 1)
  }, [sizeByCitations])

  return (
    <ForceGraph2D
      ref={fgRef}
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
  )
}
