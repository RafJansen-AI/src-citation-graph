import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClusterPanel } from '../../src/components/ClusterPanel'
import { useAppStore } from '../../src/store/appStore'
import type { GraphData } from '../../src/lib/types'

const mockGraph: GraphData = {
  nodes: [{ id: 'p1', title: 'Test Paper', year: 2020, authors: [], focusArea: 'AI', tldr: '', clusterId: 0, citationCount: 1 }],
  edges: [],
  clusters: [{ id: 0, label: 'Cluster 1', summary: 'AI research theme.', color: '#4F46E5', paperIds: ['p1'] }],
  generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  useAppStore.setState({ selectedPaper: null, selectedCluster: null, selectedAuthorId: null, hiddenClusterIds: [] })
})

describe('ClusterPanel', () => {
  it('shows cluster list by default', () => {
    render(<ClusterPanel graph={mockGraph} />)
    expect(screen.getByText('Research Clusters')).toBeInTheDocument()
    expect(screen.getByText('Cluster 1')).toBeInTheDocument()
  })

  it('shows paper detail when a paper is selected', () => {
    useAppStore.setState({ selectedPaper: mockGraph.nodes[0] })
    render(<ClusterPanel graph={mockGraph} />)
    expect(screen.getByText('Test Paper')).toBeInTheDocument()
    expect(screen.getByText('← Back')).toBeInTheDocument()
  })

  it('renders a toggle button for each cluster', () => {
    render(<ClusterPanel graph={mockGraph} />)
    expect(screen.getAllByRole('button', { name: /hide|show/i })).toHaveLength(1)
  })

  it('calls toggleClusterVisibility when toggle button clicked', async () => {
    const user = userEvent.setup()
    render(<ClusterPanel graph={mockGraph} />)
    const toggleBtn = screen.getByRole('button', { name: /hide/i })
    await user.click(toggleBtn)
    expect(useAppStore.getState().hiddenClusterIds).toContain(0)
  })

  it('shows author cluster breakdown when selectedAuthorId is set', () => {
    useAppStore.setState({ selectedAuthorId: 'A_TEST' })
    const graphWithAuthor: GraphData = {
      ...mockGraph,
      nodes: [{
        ...mockGraph.nodes[0],
        authors: [{ authorId: 'A_TEST', name: 'Test Researcher' }],
        clusterId: 0,
      }],
    }
    render(<ClusterPanel graph={graphWithAuthor} />)
    expect(screen.getByText('Test Researcher')).toBeInTheDocument()
    expect(screen.getByText('1 papers in the network')).toBeInTheDocument()
    expect(screen.getByText('Cluster 1')).toBeInTheDocument()
  })
})
