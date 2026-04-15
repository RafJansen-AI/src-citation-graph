import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '../../src/components/SearchBar'
import { useAppStore } from '../../src/store/appStore'
import { downloadFile } from '../../src/lib/export'
import type { GraphData } from '../../src/lib/types'

vi.mock('../../src/lib/export', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/lib/export')>()
  return { ...actual, downloadFile: vi.fn() }
})

const mockGraph: GraphData = {
  nodes: [
    { id: 'p1', title: 'Planetary Boundaries Framework', year: 2009,
      authors: [{ authorId: 'A1', name: 'Johan Rockström' }],
      focusArea: 'Environmental science', tldr: '', clusterId: 0, citationCount: 100 },
    { id: 'p2', title: 'Urban Biodiversity', year: 2015,
      authors: [{ authorId: 'A2', name: 'Carl Folke' }],
      focusArea: 'Geography', tldr: '', clusterId: 1, citationCount: 20 },
  ],
  edges: [], clusters: [], generatedAt: '2024-01-01T00:00:00Z',
}

afterEach(() => { useAppStore.setState({ searchQuery: '', selectedFocusAreas: [] }) })

describe('SearchBar', () => {
  it('does not update the store synchronously on every keystroke', async () => {
    const user = userEvent.setup()
    render(<SearchBar focusAreas={[]} focusAreaColors={{}} />)

    const input = screen.getByPlaceholderText('Filter papers or authors…')
    await user.type(input, 'a')

    // Immediately after typing one char, store should still be empty (debounce not fired)
    expect(useAppStore.getState().searchQuery).toBe('')

    // After debounce fires, store should be updated
    await waitFor(() => {
      expect(useAppStore.getState().searchQuery).toBe('a')
    }, { timeout: 1000 })
  })

  it('renders focus area legend entries', () => {
    render(
      <SearchBar
        focusAreas={['Environmental science', 'Other']}
        focusAreaColors={{ 'Environmental science': '#16A34A', 'Other': '#6B7280' }}
      />
    )
    expect(screen.getByText('Environmental science')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })
})

describe('SearchBar — focus area chip filtering', () => {
  const areas = ['Environmental science', 'Medicine']
  const colors = { 'Environmental science': '#16A34A', 'Medicine': '#DC2626' }

  afterEach(() => useAppStore.setState({ selectedFocusAreas: [] }))

  it('clicking a chip adds it to selectedFocusAreas', async () => {
    const user = userEvent.setup()
    render(<SearchBar focusAreas={areas} focusAreaColors={colors} />)
    await user.click(screen.getByRole('button', { name: /environmental science/i }))
    expect(useAppStore.getState().selectedFocusAreas).toContain('Environmental science')
  })

  it('clicking an active chip removes it', async () => {
    useAppStore.setState({ selectedFocusAreas: ['Environmental science'] })
    const user = userEvent.setup()
    render(<SearchBar focusAreas={areas} focusAreaColors={colors} />)
    await user.click(screen.getByRole('button', { name: /environmental science/i }))
    expect(useAppStore.getState().selectedFocusAreas).not.toContain('Environmental science')
  })

  it('shows Clear button when a chip is selected and Clear resets', async () => {
    useAppStore.setState({ selectedFocusAreas: ['Medicine'] })
    const user = userEvent.setup()
    render(<SearchBar focusAreas={areas} focusAreaColors={colors} />)
    const clearBtn = screen.getByRole('button', { name: /clear/i })
    expect(clearBtn).toBeInTheDocument()
    await user.click(clearBtn)
    expect(useAppStore.getState().selectedFocusAreas).toHaveLength(0)
  })

  it('does not show Clear button when nothing is selected', () => {
    render(<SearchBar focusAreas={areas} focusAreaColors={colors} />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })
})

describe('SearchBar — focus area store actions', () => {
  afterEach(() => useAppStore.setState({ selectedFocusAreas: [] }))

  it('toggleFocusArea adds an area', () => {
    useAppStore.getState().toggleFocusArea('Biology')
    expect(useAppStore.getState().selectedFocusAreas).toContain('Biology')
  })

  it('toggleFocusArea removes an already-selected area', () => {
    useAppStore.setState({ selectedFocusAreas: ['Biology'] })
    useAppStore.getState().toggleFocusArea('Biology')
    expect(useAppStore.getState().selectedFocusAreas).not.toContain('Biology')
  })

  it('clearFocusAreas empties the selection', () => {
    useAppStore.setState({ selectedFocusAreas: ['Biology', 'Medicine'] })
    useAppStore.getState().clearFocusAreas()
    expect(useAppStore.getState().selectedFocusAreas).toHaveLength(0)
  })
})

const defaultProps = {
  focusAreas: [],
  focusAreaColors: {},
  graph: mockGraph,
}

describe('SearchBar keyword export', () => {
  beforeEach(() => {
    useAppStore.setState({ searchQuery: '' })
    vi.clearAllMocks()
  })

  it('shows no export buttons when query is empty', () => {
    render(<SearchBar {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /bibtex/i })).not.toBeInTheDocument()
  })

  it('shows export buttons and match count when query matches papers', async () => {
    const user = userEvent.setup()
    render(<SearchBar {...defaultProps} />)
    await user.type(screen.getByPlaceholderText(/filter papers/i), 'planetary')
    expect(await screen.findByRole('button', { name: /bibtex/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /markdown/i })).toBeInTheDocument()
    expect(screen.getByText(/1 paper/i)).toBeInTheDocument()
  })

  it('calls downloadFile when BibTeX export is clicked', async () => {
    const user = userEvent.setup()
    render(<SearchBar {...defaultProps} />)
    await user.type(screen.getByPlaceholderText(/filter papers/i), 'planetary')
    const btn = await screen.findByRole('button', { name: /bibtex/i })
    await user.click(btn)
    expect(downloadFile).toHaveBeenCalledWith(
      expect.stringContaining('@article'),
      expect.stringMatching(/\.bib$/),
      'text/plain',
    )
  })
})
