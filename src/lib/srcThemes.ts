import type { Cluster } from './types'

export const CLUSTER_LABEL_TO_THEME: Record<string, string> = {
  'Environmental science': 'Planetary Boundaries',
  'Geography': 'Social-Ecological Systems',
  'Biology': 'Biodiversity & Ecosystems',
  'Computer science': 'Complexity & Modelling',
  'Business': 'Sustainability Governance',
  'Sociology': 'Social Transformations',
  'Medicine': 'Health & Wellbeing',
}

export const SRC_THEME_COLORS: Record<string, string> = {
  'Planetary Boundaries': '#16A34A',
  'Social-Ecological Systems': '#D97706',
  'Biodiversity & Ecosystems': '#059669',
  'Complexity & Modelling': '#6366F1',
  'Sustainability Governance': '#4F46E5',
  'Social Transformations': '#DB2777',
  'Health & Wellbeing': '#DC2626',
  'Other': '#6B7280',
}

// Ordered list for legend display (Other excluded — shown last by App.tsx)
export const SRC_THEMES = Object.keys(SRC_THEME_COLORS).filter(t => t !== 'Other')

/**
 * Returns a Map<clusterId, srcThemeName> derived from the graph's cluster list.
 * Strips "(N)" suffix from cluster labels before looking up the theme.
 */
export function buildClusterThemeMap(clusters: Cluster[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const cluster of clusters) {
    const base = cluster.label.replace(/ \(\d+\)$/, '')
    map.set(cluster.id, CLUSTER_LABEL_TO_THEME[base] ?? 'Other')
  }
  return map
}
