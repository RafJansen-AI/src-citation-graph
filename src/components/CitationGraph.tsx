import { useCallback, useMemo } from 'react'
import { ForceGraph2D } from 'react-force-graph'
import type { GraphData, Paper } from '../lib/types'
import { useAppStore } from '../store/appStore'

interface Props {
  graph: GraphData
  focusAreaColors: Record<string, string>
}

export function CitationGraph({ graph, focusAreaColors }: Props) {
  const { setSelectedPaper, highlightedPath, selectedCluster, searchQuery } = useAppStore()

  const filteredGraph = useMemo(() => {
    if (!searchQuery) return graph
    const q = searchQuery.toLowerCase()
    const matched = new Set(
      graph.nodes
        .filter(n => n.title.toLowerCase().includes(q) ||
                     n.authors.some(a => a.name.toLowerCase().includes(q)))
        .map(n => n.id)
    )
    return { ...graph, nodes: graph.nodes.filter(n => matched.has(n.id)) }
  }, [graph, searchQuery])

  const nodeColor = useCallback((node: any) => {
    const p = node as Paper
    if (highlightedPath.includes(p.id)) return '#FBBF24'
    if (selectedCluster && !selectedCluster.paperIds.includes(p.id)) return '#374151'
    return focusAreaColors[p.focusArea] ?? '#6B7280'
  }, [highlightedPath, selectedCluster, focusAreaColors])

  const nodeLabel = useCallback((node: any) => {
    const p = node as Paper
    return `${p.title} (${p.year})${p.tldr ? `\n${p.tldr}` : ''}`
  }, [])

  return (
    <ForceGraph2D
      graphData={filteredGraph}
      nodeId="id"
      nodeColor={nodeColor}
      nodeLabel={nodeLabel}
      nodeRelSize={4}
      linkColor={() => '#374151'}
      linkOpacity={0.3}
      onNodeClick={(node: any) => setSelectedPaper(node as Paper)}
      backgroundColor="#111827"
    />
  )
}
