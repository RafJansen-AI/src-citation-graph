import { describe, it, expect } from 'vitest'
import {
  CLUSTER_LABEL_TO_THEME,
  SRC_THEME_COLORS,
  SRC_THEMES,
  buildClusterThemeMap,
} from '../../src/lib/srcThemes'
import type { Cluster } from '../../src/lib/types'

const mockClusters: Cluster[] = [
  { id: 0, label: 'Environmental science', summary: '', color: '#16A34A', paperIds: [] },
  { id: 1, label: 'Business (2)', summary: '', color: '#DC2626', paperIds: [] },
  { id: 2, label: 'Geography', summary: '', color: '#D97706', paperIds: [] },
  { id: 3, label: 'Unknown field', summary: '', color: '#000000', paperIds: [] },
]

describe('CLUSTER_LABEL_TO_THEME', () => {
  it('maps Environmental science to Planetary Boundaries', () => {
    expect(CLUSTER_LABEL_TO_THEME['Environmental science']).toBe('Planetary Boundaries')
  })

  it('maps Business to Sustainability Governance', () => {
    expect(CLUSTER_LABEL_TO_THEME['Business']).toBe('Sustainability Governance')
  })
})

describe('SRC_THEME_COLORS', () => {
  it('has a color for every theme in SRC_THEMES', () => {
    for (const theme of SRC_THEMES) {
      expect(SRC_THEME_COLORS[theme]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('has an Other fallback', () => {
    expect(SRC_THEME_COLORS['Other']).toBe('#6B7280')
  })
})

describe('buildClusterThemeMap', () => {
  it('strips (N) suffix and maps to SRC theme', () => {
    const map = buildClusterThemeMap(mockClusters)
    expect(map.get(0)).toBe('Planetary Boundaries')
    expect(map.get(1)).toBe('Sustainability Governance')
    expect(map.get(2)).toBe('Social-Ecological Systems')
  })

  it('falls back to Other for unrecognised labels', () => {
    const map = buildClusterThemeMap(mockClusters)
    expect(map.get(3)).toBe('Other')
  })
})
