import { describe, it, expect } from 'vitest'
import { buildCoauthorGraph, coauthorPath, sharedPapers } from '../../src/lib/coauthorGraph'
import type { Paper } from '../../src/lib/types'

const papers: Paper[] = [
  { id: 'p1', title: 'A', year: 2020, authors: [{ authorId: 'A1', name: 'Alice' }, { authorId: 'A2', name: 'Bob' }], focusArea: 'X', tldr: '', clusterId: 0 },
  { id: 'p2', title: 'B', year: 2021, authors: [{ authorId: 'A2', name: 'Bob' }, { authorId: 'A3', name: 'Carol' }], focusArea: 'X', tldr: '', clusterId: 0 },
  { id: 'p3', title: 'C', year: 2022, authors: [{ authorId: 'A4', name: 'Dan' }], focusArea: 'X', tldr: '', clusterId: 0 },
]

describe('buildCoauthorGraph', () => {
  it('creates direct edges between co-authors', () => {
    const g = buildCoauthorGraph(papers)
    expect(g.get('A1')?.has('A2')).toBe(true)
    expect(g.get('A2')?.has('A1')).toBe(true)
    expect(g.get('A2')?.has('A3')).toBe(true)
  })

  it('does not create edges between non-co-authors', () => {
    const g = buildCoauthorGraph(papers)
    expect(g.get('A1')?.has('A3')).toBe(false)
  })

  it('isolated author has empty adjacency', () => {
    const g = buildCoauthorGraph(papers)
    expect(g.get('A4')?.size).toBe(0)
  })
})

describe('coauthorPath', () => {
  it('finds direct connection', () => {
    const g = buildCoauthorGraph(papers)
    expect(coauthorPath(g, 'A1', 'A2')).toEqual(['A1', 'A2'])
  })

  it('finds two-hop connection', () => {
    const g = buildCoauthorGraph(papers)
    const path = coauthorPath(g, 'A1', 'A3')
    expect(path).toEqual(['A1', 'A2', 'A3'])
  })

  it('returns empty array when no connection exists', () => {
    const g = buildCoauthorGraph(papers)
    expect(coauthorPath(g, 'A1', 'A4')).toEqual([])
  })

  it('returns single-element array for same author', () => {
    const g = buildCoauthorGraph(papers)
    expect(coauthorPath(g, 'A1', 'A1')).toEqual(['A1'])
  })
})

describe('sharedPapers', () => {
  it('returns papers both authors share', () => {
    const result = sharedPapers(papers, 'A1', 'A2')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })

  it('returns empty array for non-collaborators', () => {
    expect(sharedPapers(papers, 'A1', 'A3')).toHaveLength(0)
  })
})
