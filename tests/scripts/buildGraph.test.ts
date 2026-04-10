import { describe, it, expect } from 'vitest'
import { buildGraph } from '../../scripts/buildGraph'

const authorPapers = {
  'author1': {
    name: 'Alice', focusArea: 'AI',
    papers: [
      { paperId: 'p1', title: 'Paper 1', year: 2020, tldr: { text: 'AI paper' },
        authors: [{ authorId: 'author1', name: 'Alice' }], citationCount: 5 },
      { paperId: 'p2', title: 'Paper 2', year: 2021, tldr: null,
        authors: [{ authorId: 'author1', name: 'Alice' }], citationCount: 2 },
    ],
  },
  'author2': {
    name: 'Bob', focusArea: 'Sustainability',
    papers: [
      { paperId: 'p3', title: 'Paper 3', year: 2022, tldr: { text: 'Eco paper' },
        authors: [{ authorId: 'author2', name: 'Bob' }], citationCount: 1 },
    ],
  },
}

const citations: Record<string, string[]> = { p1: ['p3'], p2: ['p1'], p3: [] }

describe('buildGraph', () => {
  it('creates one node per unique SRC paper', () => {
    const { nodes } = buildGraph(authorPapers, citations)
    expect(nodes).toHaveLength(3)
    expect(nodes.map(n => n.id)).toContain('p1')
  })

  it('only includes edges between SRC papers', () => {
    const { edges } = buildGraph(authorPapers, citations)
    expect(edges).toContainEqual({ source: 'p1', target: 'p3', weight: 1 })
    expect(edges).toContainEqual({ source: 'p2', target: 'p1', weight: 1 })
    expect(edges).toHaveLength(2)
  })

  it('inherits focusArea from the authoring researcher', () => {
    const { nodes } = buildGraph(authorPapers, citations)
    expect(nodes.find(n => n.id === 'p1')?.focusArea).toBe('AI')
    expect(nodes.find(n => n.id === 'p3')?.focusArea).toBe('Sustainability')
  })

  it('uses empty string tldr when tldr is null', () => {
    const { nodes } = buildGraph(authorPapers, citations)
    expect(nodes.find(n => n.id === 'p2')?.tldr).toBe('')
  })
})
