import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CitationGraph } from '../../src/components/CitationGraph'
import { useAppStore } from '../../src/store/appStore'
import type { GraphData } from '../../src/lib/types'

vi.mock('react-force-graph-2d', () => ({
  default: ({ graphData }: any) => (
    <div data-testid="force-graph" data-nodecount={graphData.nodes.length} />
  ),
}))

const mockGraph: GraphData = {
  nodes: [{ id: 'p1', title: 'Test', year: 2020, authors: [], focusArea: 'AI',
            tldr: '', clusterId: 0, citationCount: 5 }],
  edges: [], clusters: [], generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  useAppStore.setState({ hiddenClusterIds: [], selectedAuthorId: null, searchQuery: '' })
})

describe('CitationGraph', () => {
  it('renders force graph with correct node count', () => {
    render(<CitationGraph graph={mockGraph} focusAreaColors={{}} />)
    expect(screen.getByTestId('force-graph')).toHaveAttribute('data-nodecount', '1')
  })

  it('filters out nodes from hidden clusters', () => {
    useAppStore.setState({ hiddenClusterIds: [0] })
    render(<CitationGraph graph={mockGraph} focusAreaColors={{}} />)
    expect(screen.getByTestId('force-graph')).toHaveAttribute('data-nodecount', '0')
  })
})
