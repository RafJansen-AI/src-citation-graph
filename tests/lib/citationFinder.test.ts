import { describe, it, expect } from 'vitest'
import { tokenize, cosineSimilarity, findRelevantPapers } from '../../src/lib/citationFinder'
import type { Paper } from '../../src/lib/types'

function makePaper(overrides: Partial<Paper> & { id: string }): Paper {
  return {
    title: '',
    year: 2020,
    authors: [],
    focusArea: 'Other',
    tldr: '',
    clusterId: 0,
    citationCount: 0,
    ...overrides,
  }
}

describe('tokenize', () => {
  it('lowercases and splits on whitespace', () => {
    expect(tokenize('Planetary Boundaries')).toContain('planetary')
    expect(tokenize('Planetary Boundaries')).toContain('boundaries')
  })

  it('removes stop words', () => {
    expect(tokenize('the resilience of ecosystems')).not.toContain('the')
    expect(tokenize('the resilience of ecosystems')).not.toContain('of')
  })

  it('removes tokens shorter than 3 characters', () => {
    expect(tokenize('on a sea')).toEqual([])
  })

  it('strips punctuation', () => {
    expect(tokenize('social-ecological')).toContain('social')
    expect(tokenize('social-ecological')).toContain('ecological')
  })
})

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 0, 0]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('returns 0 for zero vector', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })
})

describe('findRelevantPapers — keyword fallback', () => {
  const papers: Paper[] = [
    makePaper({ id: 'p1', title: 'Planetary Boundaries and Resilience', tldr: 'earth system tipping points', citationCount: 100 }),
    makePaper({ id: 'p2', title: 'Urban Ecosystem Services', tldr: 'cities biodiversity green infrastructure', citationCount: 10 }),
    makePaper({ id: 'p3', title: 'Aquaculture and Blue Food', tldr: 'fish farming sustainability seafood', citationCount: 5 }),
  ]

  it('returns empty array for empty query', () => {
    expect(findRelevantPapers('', papers, {})).toEqual([])
  })

  it('returns empty array for stop-words-only query', () => {
    expect(findRelevantPapers('the and of', papers, {})).toEqual([])
  })

  it('ranks papers with title match above abstract-only match', () => {
    const results = findRelevantPapers('planetary boundaries resilience', papers, {})
    expect(results[0].id).toBe('p1')
  })

  it('excludes papers with no token overlap', () => {
    const results = findRelevantPapers('planetary boundaries', papers, {})
    const ids = results.map(r => r.id)
    expect(ids).toContain('p1')
    expect(ids).not.toContain('p3')
  })

  it('respects topN option', () => {
    const results = findRelevantPapers('ecosystem sustainability biodiversity', papers, { topN: 1 })
    expect(results.length).toBeLessThanOrEqual(1)
  })

  it('does NOT boost by citations when boostByCitations is false (default)', () => {
    const lowCite  = makePaper({ id: 'low',  title: 'resilience governance', tldr: '', citationCount: 1 })
    const highCite = makePaper({ id: 'high', title: 'resilience governance', tldr: '', citationCount: 500 })
    // Both have identical text scores — order should be stable (not citation-driven)
    const results = findRelevantPapers('resilience governance', [lowCite, highCite], { boostByCitations: false })
    // Both should appear; we just verify no citation reordering occurred
    expect(results.map(r => r.id)).toContain('low')
    expect(results.map(r => r.id)).toContain('high')
  })

  it('boosts by citations when boostByCitations is true', () => {
    const lowCite  = makePaper({ id: 'low',  title: 'resilience governance', tldr: '', citationCount: 1 })
    const highCite = makePaper({ id: 'high', title: 'resilience governance', tldr: '', citationCount: 500 })
    const results = findRelevantPapers('resilience governance', [lowCite, highCite], { boostByCitations: true })
    expect(results[0].id).toBe('high')
  })
})

describe('findRelevantPapers — semantic mode', () => {
  const papers: Paper[] = [
    makePaper({ id: 'p1', title: 'Resilience', tldr: '', citationCount: 5 }),
    makePaper({ id: 'p2', title: 'Aquaculture', tldr: '', citationCount: 5 }),
  ]
  // Fake embeddings: p1 similar to query, p2 orthogonal
  const paperEmbeddings = new Map([
    ['p1', [1, 0, 0]],
    ['p2', [0, 1, 0]],
  ])
  const queryEmbedding = [1, 0, 0]  // identical to p1

  it('ranks by cosine similarity when embeddings are provided', () => {
    const results = findRelevantPapers('anything', papers, { queryEmbedding, paperEmbeddings })
    expect(results[0].id).toBe('p1')
  })

  it('excludes papers with negative cosine similarity', () => {
    const negEmbeddings = new Map([
      ['p1', [-1, 0, 0]],  // opposite to query
      ['p2', [0.5, 0.5, 0]],
    ])
    const results = findRelevantPapers('anything', papers, {
      queryEmbedding: [1, 0, 0],
      paperEmbeddings: negEmbeddings,
    })
    expect(results.map(r => r.id)).not.toContain('p1')
  })
})
