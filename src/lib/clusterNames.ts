/**
 * Curated display names for each Louvain cluster, keyed by cluster ID.
 * Cluster IDs come from the Louvain community detection step in the pipeline
 * and are stable as long as graph.json is not regenerated.
 *
 * Labels are derived from reading each cluster's Gemini-generated summary.
 * If a cluster ID is not listed here the UI falls back to the pipeline label.
 *
 * NOTE: if the pipeline is rerun and cluster IDs change, update this map.
 */
export const CLUSTER_NAMES: Record<number, string> = {
  2:  'Transformations to Sustainability',
  0:  'Planetary Boundaries',
  3:  'Social-Ecological Resilience',
  6:  'Urban Ecosystem Services',
  4:  'Transformative Governance',
  11: 'Marine Resilience & Tipping Points',
  1:  'Blue Food & Aquaculture',
  8:  'Social Tipping Points',
  5:  'Ocean Conservation',
  9:  'Tropical Forest Governance',
  26: 'Antimicrobial Resistance & One Health',
  12: 'Climate Network Dynamics',
  21: 'Adaptive Governance & Learning',
  41: 'Public Health Interventions',
  14: 'Biogeochemical Cycles',
  13: 'Human Genetics',
  62: 'Remote Sensing & Land Use',
}

export function getClusterName(clusterId: number, fallback: string): string {
  return CLUSTER_NAMES[clusterId] ?? fallback
}
