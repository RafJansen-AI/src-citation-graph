import { describe, it, expect, beforeEach } from 'vitest'
import { SemanticScholarClient } from '../../scripts/semanticScholar'

describe('SemanticScholarClient', () => {
  let client: SemanticScholarClient

  beforeEach(() => { client = new SemanticScholarClient() })

  it('should build correct author search URL', () => {
    const url = client.authorSearchUrl('Johan Rockström')
    expect(url).toContain('author/search')
    expect(url).toContain(encodeURIComponent('Johan Rockström'))
  })

  it('should extract paperId from paper object', () => {
    expect(client.extractPaperId({ paperId: 'abc123' })).toBe('abc123')
  })

  it('should use 1000ms interval without API key', () => {
    expect(client.minInterval).toBe(1000)
  })

  it('should use 100ms interval with API key', () => {
    const keyed = new SemanticScholarClient('mykey')
    expect(keyed.minInterval).toBe(100)
  })
})
