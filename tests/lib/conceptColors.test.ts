import { describe, it, expect } from 'vitest'
import { resolveConceptColor, SRC_CONCEPTS } from '../../src/lib/conceptColors'

const COLORS: Record<string, string> = {
  'Environmental science': '#16A34A',
  'Sociology': '#DB2777',
  'Other': '#6B7280',
}

describe('resolveConceptColor', () => {
  it('returns the mapped colour for SRC concepts', () => {
    expect(resolveConceptColor('Environmental science', COLORS)).toBe('#16A34A')
    expect(resolveConceptColor('Sociology', COLORS)).toBe('#DB2777')
  })

  it('returns Other colour for non-SRC concepts', () => {
    expect(resolveConceptColor('Mathematics', COLORS)).toBe('#6B7280')
    expect(resolveConceptColor('History', COLORS)).toBe('#6B7280')
    expect(resolveConceptColor('Geology', COLORS)).toBe('#6B7280')
  })

  it('SRC_CONCEPTS includes Business (common OpenAlex top-level for SRC papers)', () => {
    expect(SRC_CONCEPTS.has('Business')).toBe(true)
  })
})
