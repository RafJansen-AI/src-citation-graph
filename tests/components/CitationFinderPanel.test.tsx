import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CitationFinderPanel } from '../../src/components/CitationFinderPanel'
import { useAppStore } from '../../src/store/appStore'
import type { GraphData } from '../../src/lib/types'

// Mock the embedding API call so tests don't need a real API key
vi.mock('../../src/lib/citationFinder', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/lib/citationFinder')>()
  return {
    ...actual,
    embedQuery: vi.fn().mockResolvedValue([1, 0, 0]),  // fake query embedding
  }
})

const mockGraph: GraphData = {
  nodes: [
    { id: 'p1', title: 'Planetary Boundaries Framework', year: 2009,
      authors: [{ authorId: 'A1', name: 'Johan Rockström' }],
      focusArea: 'Environmental science', tldr: 'earth system tipping points safe space',
      clusterId: 0, citationCount: 200 },
    { id: 'p2', title: 'Urban Biodiversity Services', year: 2015,
      authors: [{ authorId: 'A2', name: 'Carl Folke' }],
      focusArea: 'Geography', tldr: 'cities green infrastructure ecosystem',
      clusterId: 1, citationCount: 50 },
  ],
  edges: [],
  clusters: [],
  generatedAt: '2024-01-01T00:00:00Z',
}

// Fake embeddings: p1 similar to the mocked query vector [1,0,0], p2 orthogonal
const fakeEmbeddings = { p1: [1, 0, 0], p2: [0, 1, 0] }

beforeEach(() => {
  useAppStore.setState({ highlightedPath: [], selectedPaper: null })
  // Stub fetch for embeddings.json
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('embeddings.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeEmbeddings) })
    }
    return Promise.reject(new Error('unexpected fetch'))
  }))
})

describe('CitationFinderPanel', () => {
  it('renders a textarea and a Search button', () => {
    render(<CitationFinderPanel graph={mockGraph} onClose={() => {}} />)
    expect(screen.getByPlaceholderText(/paste your title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('renders a "Boost by citations" checkbox, unchecked by default', () => {
    render(<CitationFinderPanel graph={mockGraph} onClose={() => {}} />)
    const checkbox = screen.getByLabelText(/boost by citations/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('shows ranked results after clicking Search', async () => {
    const user = userEvent.setup()
    render(<CitationFinderPanel graph={mockGraph} onClose={() => {}} />)
    await user.type(screen.getByPlaceholderText(/paste your title/i), 'planetary tipping points')
    await user.click(screen.getByRole('button', { name: /search/i }))
    await waitFor(() => {
      expect(screen.getByText('Planetary Boundaries Framework')).toBeInTheDocument()
    })
  })

  it('sets highlightedPath in store with result paper IDs', async () => {
    const user = userEvent.setup()
    render(<CitationFinderPanel graph={mockGraph} onClose={() => {}} />)
    await user.type(screen.getByPlaceholderText(/paste your title/i), 'planetary tipping points')
    await user.click(screen.getByRole('button', { name: /search/i }))
    await waitFor(() => {
      expect(useAppStore.getState().highlightedPath).toContain('p1')
    })
  })

  it('clears highlightedPath when onClose is called', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CitationFinderPanel graph={mockGraph} onClose={onClose} />)
    await user.click(screen.getByText('← Back'))
    expect(useAppStore.getState().highlightedPath).toEqual([])
    expect(onClose).toHaveBeenCalled()
  })

  it('shows export buttons after a successful search', async () => {
    const user = userEvent.setup()
    render(<CitationFinderPanel graph={mockGraph} onClose={() => {}} />)
    await user.type(screen.getByPlaceholderText(/paste your title/i), 'planetary tipping points')
    await user.click(screen.getByRole('button', { name: /search/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /bibtex/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /markdown/i })).toBeInTheDocument()
    })
  })
})
