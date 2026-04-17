import { describe, it, expect } from 'vitest'
import { classifyPapers } from '../../scripts/classifyThemes'
import type { Paper } from '../../src/lib/types'

function makePaper(id: string, overrides: Partial<Paper> = {}): Paper {
  return {
    id, title: `Paper ${id}`, year: 2020, authors: [],
    focusArea: 'Biology', tldr: '', clusterId: -1, ...overrides,
  }
}

// 2D theme embeddings — keep tests fast and deterministic
const THEME_EMBS: Record<string, number[]> = {
  'Planetary Boundaries': [1, 0],
  'Biodiversity & Ecosystems': [0, 1],
}

describe('classifyPapers', () => {
  it('assigns the nearest theme by cosine similarity', () => {
    const papers = [makePaper('A'), makePaper('B')]
    const embeddings: Record<string, number[]> = {
      A: [0.99, 0.01],  // near Planetary Boundaries
      B: [0.01, 0.99],  // near Biodiversity & Ecosystems
    }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    expect(result.find(p => p.id === 'A')!.srcTheme).toBe('Planetary Boundaries')
    expect(result.find(p => p.id === 'B')!.srcTheme).toBe('Biodiversity & Ecosystems')
  })

  it('papers without an embedding get srcTheme Other', () => {
    const papers = [makePaper('A')]
    const result = classifyPapers(papers, {}, THEME_EMBS)
    expect(result.find(p => p.id === 'A')!.srcTheme).toBe('Other')
  })

  it('skips papers that already have srcTheme set (resumable)', () => {
    const papers = [makePaper('A', { srcTheme: 'Health & Wellbeing' })]
    const embeddings: Record<string, number[]> = { A: [0.99, 0.01] }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    // Existing srcTheme must NOT be overwritten
    expect(result.find(p => p.id === 'A')!.srcTheme).toBe('Health & Wellbeing')
  })

  it('returns all papers including those without embeddings', () => {
    const papers = [makePaper('A'), makePaper('B'), makePaper('C')]
    const embeddings: Record<string, number[]> = { A: [1, 0] }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    expect(result).toHaveLength(3)
  })

  it('always returns a valid theme name from the provided theme embeddings', () => {
    const papers = [makePaper('A')]
    const embeddings: Record<string, number[]> = { A: [1, 1] }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    expect(Object.keys(THEME_EMBS)).toContain(result[0].srcTheme)
  })
})
