import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { CitationGraph } from './CitationGraph'
import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'

// Minimal stub so ForceGraph2D doesn't try to use canvas
vi.mock('react-force-graph-2d', () => ({
  default: ({ graphData }: any) => (
    <div data-testid="graph"
         data-nodes={graphData.nodes.length}
         data-links={graphData.links.length} />
  ),
}))

const mockGraph: GraphData = {
  nodes: [
    { id: 'p1', title: 'A', year: 2020, authors: [], focusArea: 'Ecology', tldr: '', clusterId: 0, citationCount: 10 },
    { id: 'p2', title: 'B', year: 2021, authors: [], focusArea: 'Ecology', tldr: '', clusterId: 0, citationCount: 5 },
  ],
  edges: [{ source: 'p1', target: 'p2', weight: 1 }],
  clusters: [{ id: 0, label: 'Ecology', summary: '', color: '#059669', paperIds: ['p1', 'p2'] }],
  generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => useAppStore.setState({
  searchQuery: '', hiddenClusterIds: [], selectedAuthorId: null,
  selectedCluster: null, highlightedPath: [], sizeByCitations: false,
  theme: 'dark',
}))

describe('CitationGraph edge mutation resilience', () => {
  it('includes edge when source/target are still strings', () => {
    const { getByTestId } = render(
      <CitationGraph graph={mockGraph} focusAreaColors={{ Ecology: '#059669' }} />
    )
    expect(getByTestId('graph').dataset.links).toBe('1')
  })

  it('includes edge when react-force-graph-2d has mutated source/target to node objects', () => {
    // Simulate the mutation react-force-graph-2d performs
    const mutated: GraphData = {
      ...mockGraph,
      edges: [{ source: { id: 'p1' } as any, target: { id: 'p2' } as any, weight: 1 }],
    }
    const { getByTestId } = render(
      <CitationGraph graph={mutated} focusAreaColors={{ Ecology: '#059669' }} />
    )
    expect(getByTestId('graph').dataset.links).toBe('1')
  })
})
