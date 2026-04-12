import { describe, it, expect } from 'vitest'
import { buildGraph } from '../../scripts/buildGraph'
import type { OAWork } from '../../scripts/openAlex'

const makeWork = (id: string, overrides: Partial<OAWork> = {}): OAWork => ({
  id: `https://openalex.org/${id}`,
  title: `Title of ${id}`,
  publication_year: 2020,
  authorships: [{ author: { id: 'https://openalex.org/A1', display_name: 'Alice' } }],
  abstract_inverted_index: { 'test': [0], 'abstract': [1] },
  concepts: [{ display_name: 'Environmental science', level: 0, score: 0.9 }],
  cited_by_count: 5,
  ids: { doi: `10.1000/${id}` },
  referenced_works: [],
  ...overrides,
})

describe('buildGraph', () => {
  it('creates one node per work', () => {
    const works = [makeWork('W1'), makeWork('W2')]
    const { nodes } = buildGraph(works)
    expect(nodes).toHaveLength(2)
    expect(nodes.map(n => n.id)).toContain('W1')
    expect(nodes.map(n => n.id)).toContain('W2')
  })

  it('creates edges from referenced_works when both papers are SRC papers', () => {
    const works = [
      makeWork('W1', { referenced_works: ['https://openalex.org/W2'] }),
      makeWork('W2'),
    ]
    const { edges } = buildGraph(works)
    expect(edges).toContainEqual({ source: 'W1', target: 'W2', weight: 1 })
    expect(edges).toHaveLength(1)
  })

  it('ignores references to papers not in the SRC set', () => {
    const works = [
      makeWork('W1', { referenced_works: ['https://openalex.org/W99'] }),
    ]
    const { edges } = buildGraph(works)
    expect(edges).toHaveLength(0)
  })

  it('sets focusArea from top level-0 concept', () => {
    const works = [makeWork('W1')]
    const { nodes } = buildGraph(works)
    expect(nodes[0].focusArea).toBe('Environmental science')
  })

  it('uses reconstructed abstract as tldr', () => {
    const works = [makeWork('W1')]
    const { nodes } = buildGraph(works)
    expect(nodes[0].tldr).toBe('test abstract')
  })

  it('falls back to "Other" when no level-0 concepts', () => {
    const works = [makeWork('W1', { concepts: [{ display_name: 'Ecology', level: 1, score: 0.9 }] })]
    const { nodes } = buildGraph(works)
    expect(nodes[0].focusArea).toBe('Other')
  })

  it('does not create duplicate edges', () => {
    const works = [
      makeWork('W1', { referenced_works: ['https://openalex.org/W2', 'https://openalex.org/W2'] }),
      makeWork('W2'),
    ]
    const { edges } = buildGraph(works)
    expect(edges).toHaveLength(1)
  })
})
