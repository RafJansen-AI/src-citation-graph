import { describe, it, expect } from 'vitest'
import { toBibtex, toMarkdown } from '../../src/lib/export'
import type { Paper } from '../../src/lib/types'

function makePaper(overrides: Partial<Paper> & { id: string }): Paper {
  return {
    title: 'Test Paper',
    year: 2020,
    authors: [{ authorId: 'A1', name: 'Jane Smith' }],
    focusArea: 'Other',
    tldr: '',
    clusterId: 0,
    citationCount: 0,
    externalUrl: 'https://doi.org/10.1000/xyz',
    ...overrides,
  }
}

describe('toBibtex', () => {
  it('produces one @article entry per paper', () => {
    const papers = [makePaper({ id: 'p1' }), makePaper({ id: 'p2' })]
    const output = toBibtex(papers)
    expect(output.match(/@article\{/g)).toHaveLength(2)
  })

  it('includes title, year, and author', () => {
    const paper = makePaper({ id: 'p1', title: 'Resilience Theory', year: 2015 })
    const output = toBibtex([paper])
    expect(output).toContain('title = {Resilience Theory}')
    expect(output).toContain('year = {2015}')
    expect(output).toContain('author = {Jane Smith}')
  })

  it('includes doi when externalUrl is a doi.org link', () => {
    const paper = makePaper({ id: 'p1', externalUrl: 'https://doi.org/10.1000/abc' })
    expect(toBibtex([paper])).toContain('doi = {10.1000/abc}')
  })

  it('omits doi field when externalUrl is an openalex link', () => {
    const paper = makePaper({ id: 'p1', externalUrl: 'https://openalex.org/W123' })
    expect(toBibtex([paper])).not.toContain('doi =')
  })

  it('joins multiple authors with " and "', () => {
    const paper = makePaper({
      id: 'p1',
      authors: [
        { authorId: 'A1', name: 'Jane Smith' },
        { authorId: 'A2', name: 'Carl Folke' },
      ],
    })
    expect(toBibtex([paper])).toContain('Jane Smith and Carl Folke')
  })

  it('returns empty string for empty paper list', () => {
    expect(toBibtex([])).toBe('')
  })

  it('includes journal field when present', () => {
    const paper = makePaper({ id: 'p1', journal: 'Nature Sustainability' })
    expect(toBibtex([paper])).toContain('journal = {Nature Sustainability}')
  })

  it('includes volume, number, and pages when present', () => {
    const paper = makePaper({ id: 'p1', volume: '5', issue: '2', pages: '100–110' })
    const output = toBibtex([paper])
    expect(output).toContain('volume = {5}')
    expect(output).toContain('number = {2}')
    expect(output).toContain('pages = {100--110}')
  })

  it('omits journal/volume/number/pages when absent', () => {
    const paper = makePaper({ id: 'p1', journal: undefined, volume: undefined, issue: undefined, pages: undefined })
    const output = toBibtex([paper])
    expect(output).not.toContain('journal =')
    expect(output).not.toContain('volume =')
    expect(output).not.toContain('number =')
    expect(output).not.toContain('pages =')
  })
})

describe('toMarkdown', () => {
  it('includes the list title as an h1', () => {
    const output = toMarkdown([], 'My Reading List')
    expect(output).toContain('# My Reading List')
  })

  it('includes paper title, year, and authors', () => {
    const paper = makePaper({ id: 'p1', title: 'Planetary Boundaries', year: 2009 })
    const output = toMarkdown([paper], 'Test')
    expect(output).toContain('**Planetary Boundaries**')
    expect(output).toContain('2009')
    expect(output).toContain('Jane Smith')
  })

  it('truncates author list to 3 with et al.', () => {
    const paper = makePaper({
      id: 'p1',
      authors: [
        { authorId: 'A1', name: 'Author One' },
        { authorId: 'A2', name: 'Author Two' },
        { authorId: 'A3', name: 'Author Three' },
        { authorId: 'A4', name: 'Author Four' },
      ],
    })
    const output = toMarkdown([paper], 'Test')
    expect(output).toContain('et al.')
    expect(output).not.toContain('Author Four')
  })

  it('includes the external URL when present', () => {
    const paper = makePaper({ id: 'p1', externalUrl: 'https://doi.org/10.1000/xyz' })
    expect(toMarkdown([paper], 'Test')).toContain('https://doi.org/10.1000/xyz')
  })
})
