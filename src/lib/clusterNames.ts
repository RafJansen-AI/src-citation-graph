/**
 * Curated display names keyed by cluster ID.
 * Cluster IDs change whenever detect-clusters is re-run, so this map
 * is intentionally empty — names come from cluster.name in graph.json
 * (set by summarize-clusters). Falls back to the raw pipeline label.
 */
export const CLUSTER_NAMES: Record<number, string> = {}

/** Returns the best available display name for a cluster.
 *  Priority: name from graph data → static override map → raw label fallback.
 */
export function getClusterName(clusterId: number, fallback: string, dataName?: string): string {
  return dataName ?? CLUSTER_NAMES[clusterId] ?? fallback
}
