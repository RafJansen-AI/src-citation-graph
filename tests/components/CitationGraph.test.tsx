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
            tldr: '', clusterId: 0, citationCount: 5, srcTheme: 'Artificial Intelligence' }],
  edges: [], clusters: [], generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  useAppStore.setState({ hiddenClusterIds: [], selectedAuthorId: null, searchQuery: '', selectedFocusAreas: [] })
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

  it('filters nodes to selected SRC themes', () => {
    const themeFilterGraph: GraphData = {
      nodes: [
        { id: 'p1', title: 'A', year: 2020, authors: [], focusArea: 'Biology',
          tldr: '', clusterId: 10, citationCount: 5, srcTheme: 'Biodiversity & Ecosystems' },
        { id: 'p2', title: 'B', year: 2021, authors: [], focusArea: 'Medicine',
          tldr: '', clusterId: 20, citationCount: 2, srcTheme: 'Health & Wellbeing' },
        { id: 'p3', title: 'C', year: 2022, authors: [], focusArea: 'Business',
          tldr: '', clusterId: 30, citationCount: 1, srcTheme: 'Economic Systems' },
      ],
      edges: [],
      clusters: [
        { id: 10, label: 'Biology', summary: '', color: '#059669', paperIds: ['p1'] },
        { id: 20, label: 'Medicine', summary: '', color: '#DC2626', paperIds: ['p2'] },
        { id: 30, label: 'Business', summary: '', color: '#4F46E5', paperIds: ['p3'] },
      ],
      generatedAt: '2024-01-01T00:00:00Z',
    }
    // Filter to Biodiversity & Ecosystems (Biology cluster) and Health & Wellbeing (Medicine cluster)
    useAppStore.setState({ selectedFocusAreas: ['Biodiversity & Ecosystems', 'Health & Wellbeing'] })
    render(<CitationGraph graph={themeFilterGraph} focusAreaColors={{}} />)
    expect(screen.getByTestId('force-graph')).toHaveAttribute('data-nodecount', '2')
  })
})
