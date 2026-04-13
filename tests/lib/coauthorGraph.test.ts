import { describe, it, expect } from 'vitest'
import { buildCoauthorGraph, coauthorPath, sharedPapers } from '../../src/lib/coauthorGraph'
import type { Paper } from '../../src/lib/types'

const papers: Paper[] = [
  { id: 'p1', title: 'A', year: 2020, authors: [{ authorId: 'A1', name: 'Alice' }, { authorId: 'A2', name: 'Bob' }], focusArea: 'X', tldr: '', clusterId: 0 },
  { id: 'p2', title: 'B', year: 2021, authors: [{ authorId: 'A2', name: 'Bob' }, { authorId: 'A3', name: 'Carol' }], focusArea: 'X', tldr: '', clusterId: 0 },
  { id: 'p3', title: 'C', year: 2022, authors: [{ authorId: 'A4', name: 'Dan' }], focusArea: 'X', tldr: '', clusterId: 0 },
]

describe('buildCoauthorGraph', () => {
  it('creates direct edges between co-authors (keyed by name)', () => {
    const g = buildCoauthorGraph(papers)
    expect(g.get('Alice')?.has('Bob')).toBe(true)
    expect(g.get('Bob')?.has('Alice')).toBe(true)
    expect(g.get('Bob')?.has('Carol')).toBe(true)
  })

  it('does not create edges between non-co-authors', () => {
    const g = buildCoauthorGraph(papers)
    expect(g.get('Alice')?.has('Carol')).toBe(false)
  })

  it('isolated author has empty adjacency', () => {
    const g = buildCoauthorGraph(papers)
    expect(g.get('Dan')?.size).toBe(0)
  })

  it('same author with different authorIds appears once (name-based dedup)', () => {
    const multiIdPapers: Paper[] = [
      { id: 'x1', title: 'X', year: 2020, authors: [{ authorId: 'ID1', name: 'Alice' }, { authorId: 'ID9', name: 'Alice' }], focusArea: 'X', tldr: '', clusterId: 0 },
    ]
    const g = buildCoauthorGraph(multiIdPapers)
    // Alice appears once; self-edge is not created
    expect(g.get('Alice')?.has('Alice')).toBe(false)
  })
})

describe('coauthorPath', () => {
  it('finds direct connection', () => {
    const g = buildCoauthorGraph(papers)
    expect(coauthorPath(g, 'Alice', 'Bob')).toEqual(['Alice', 'Bob'])
  })

  it('finds two-hop connection', () => {
    const g = buildCoauthorGraph(papers)
    const path = coauthorPath(g, 'Alice', 'Carol')
    expect(path).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('returns empty array when no connection exists', () => {
    const g = buildCoauthorGraph(papers)
    expect(coauthorPath(g, 'Alice', 'Dan')).toEqual([])
  })

  it('returns single-element array for same author', () => {
    const g = buildCoauthorGraph(papers)
    expect(coauthorPath(g, 'Alice', 'Alice')).toEqual(['Alice'])
  })
})

describe('sharedPapers', () => {
  it('returns papers both authors share (matched by name)', () => {
    const result = sharedPapers(papers, 'Alice', 'Bob')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })

  it('returns empty array for non-collaborators', () => {
    expect(sharedPapers(papers, 'Alice', 'Carol')).toHaveLength(0)
  })
})
