import { describe, it, expect } from 'vitest'
import { OpenAlexClient } from '../../scripts/openAlex'

describe('OpenAlexClient', () => {
  describe('workId', () => {
    it('extracts ID from full OpenAlex URL', () => {
      expect(OpenAlexClient.workId('https://openalex.org/W123456789')).toBe('W123456789')
    })

    it('returns bare ID unchanged', () => {
      expect(OpenAlexClient.workId('W123456789')).toBe('W123456789')
    })
  })

  describe('reconstructAbstract', () => {
    it('reconstructs text from inverted index', () => {
      const result = OpenAlexClient.reconstructAbstract({
        'Hello': [0],
        'world': [1],
        'foo': [2],
      })
      expect(result).toBe('Hello world foo')
    })

    it('returns empty string for null', () => {
      expect(OpenAlexClient.reconstructAbstract(null)).toBe('')
    })

    it('handles non-contiguous positions', () => {
      const result = OpenAlexClient.reconstructAbstract({
        'first': [0],
        'third': [2],
        'second': [1],
      })
      expect(result).toBe('first second third')
    })
  })

  describe('topConcept', () => {
    it('returns top-scored level-0 concept', () => {
      const concepts = [
        { display_name: 'Biology', level: 0, score: 0.5 },
        { display_name: 'Ecology', level: 1, score: 0.9 },
        { display_name: 'Environmental science', level: 0, score: 0.8 },
      ]
      expect(OpenAlexClient.topConcept(concepts)).toBe('Environmental science')
    })

    it('returns "Other" when no level-0 concepts exist', () => {
      const concepts = [{ display_name: 'Ecology', level: 1, score: 0.9 }]
      expect(OpenAlexClient.topConcept(concepts)).toBe('Other')
    })

    it('returns "Other" for empty concepts array', () => {
      expect(OpenAlexClient.topConcept([])).toBe('Other')
    })
  })

  describe('institutionSearchUrl', () => {
    it('builds correct institution search URL', () => {
      const client = new OpenAlexClient()
      const url = client.institutionSearchUrl('Stockholm Resilience Centre')
      expect(url).toContain('institutions')
      expect(url).toContain(encodeURIComponent('Stockholm Resilience Centre'))
    })
  })
})
