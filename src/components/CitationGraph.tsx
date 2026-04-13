import { useCallback, useMemo } from 'react'
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
  const { setSelectedPaper, highlightedPath, selectedCluster, searchQuery, hiddenClusterIds, selectedAuthorId } = useAppStore()

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

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = graph.edges.filter(
      e => nodeIds.has(resolveId(e.source)) && nodeIds.has(resolveId(e.target))
    )
    return { nodes, links }
  }, [graph, searchQuery, hiddenClusterIds])

  const nodeColor = useCallback((node: any) => {
    const p = node as Paper
    if (highlightedPath.includes(p.id)) return '#FBBF24'
    // Author highlight: dim all non-author papers
    if (selectedAuthorId) {
      return p.authors.some(a => a.authorId === selectedAuthorId)
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

  return (
    <ForceGraph2D
      graphData={filteredGraph}
      nodeId="id"
      nodeColor={nodeColor}
      nodeLabel={nodeLabel}
      nodeRelSize={4}
      linkColor={() => '#374151'}
      onNodeClick={(node: any) => setSelectedPaper(node as Paper)}
      backgroundColor="#111827"
    />
  )
}
