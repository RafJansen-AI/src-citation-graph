import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResearcherSearch } from '../../src/components/ResearcherSearch'
import { useAppStore } from '../../src/store/appStore'
import type { GraphData } from '../../src/lib/types'

const mockGraph: GraphData = {
  nodes: [
    {
      id: 'p1', title: 'Planetary Boundaries', year: 2009,
      authors: [{ authorId: 'A1', name: 'Johan Rockström' }],
      focusArea: 'Environmental science', tldr: '', clusterId: 0, citationCount: 100,
    },
    {
      id: 'p2', title: 'Resilience Thinking', year: 2010,
      authors: [{ authorId: 'A1', name: 'Johan Rockström' }],
      focusArea: 'Environmental science', tldr: '', clusterId: 0, citationCount: 50,
    },
    {
      id: 'p3', title: 'Urban Governance', year: 2015,
      authors: [{ authorId: 'A2', name: 'Carl Folke' }],
      focusArea: 'Sociology', tldr: '', clusterId: 1, citationCount: 30,
    },
  ],
  edges: [],
  clusters: [
    { id: 0, label: 'Environmental science', summary: '', color: '#16A34A', paperIds: ['p1', 'p2'] },
    { id: 1, label: 'Sociology', summary: '', color: '#DB2777', paperIds: ['p3'] },
  ],
  generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => { useAppStore.setState({ selectedAuthorId: null }) })

describe('ResearcherSearch', () => {
  it('renders the input', () => {
    render(<ResearcherSearch graph={mockGraph} />)
    expect(screen.getByPlaceholderText('Search researcher…')).toBeInTheDocument()
  })

  it('shows author suggestions after 2 characters', async () => {
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'Jo')
    expect(screen.getByText('Johan Rockström')).toBeInTheDocument()
  })

  it('does not show suggestions for 1 character', async () => {
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'J')
    expect(screen.queryByText('Johan Rockström')).not.toBeInTheDocument()
  })

  it('sets selectedAuthorId in store when author is clicked', async () => {
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'Jo')
    await user.click(screen.getByText('Johan Rockström'))
    expect(useAppStore.getState().selectedAuthorId).toBe('A1')
  })

  it('clears selectedAuthorId when × button is clicked after selecting', async () => {
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'Jo')
    await user.click(screen.getByText('Johan Rockström'))
    expect(useAppStore.getState().selectedAuthorId).toBe('A1')

    await user.click(screen.getByRole('button', { name: '×' }))
    expect(useAppStore.getState().selectedAuthorId).toBeNull()
  })
})
