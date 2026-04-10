import type { GraphEdge } from './types'

/** BFS shortest path on undirected graph. Returns [] if no path exists. */
export function bfsShortestPath(
  edges: GraphEdge[], sourceId: string, targetId: string
): string[] {
  if (sourceId === targetId) return [sourceId]

  const adj = new Map<string, string[]>()
  for (const { source, target } of edges) {
    if (!adj.has(source)) adj.set(source, [])
    if (!adj.has(target)) adj.set(target, [])
    adj.get(source)!.push(target)
    adj.get(target)!.push(source)
  }

  const visited = new Set([sourceId])
  const queue: string[][] = [[sourceId]]

  while (queue.length) {
    const path = queue.shift()!
    for (const nb of adj.get(path[path.length - 1]) ?? []) {
      if (nb === targetId) return [...path, nb]
      if (!visited.has(nb)) { visited.add(nb); queue.push([...path, nb]) }
    }
  }
  return []
}

/**
 * Greedy community detection (simplified Louvain-style).
 * Returns a map of nodeId → communityId (0-indexed integers).
 */
export function louvainCommunities(
  nodeIds: string[], edges: GraphEdge[]
): Record<string, number> {
  const community: Record<string, number> = {}
  nodeIds.forEach((id, i) => { community[id] = i })

  const adj = new Map<string, string[]>()
  for (const id of nodeIds) adj.set(id, [])
  for (const { source, target } of edges) {
    adj.get(source)?.push(target)
    adj.get(target)?.push(source)
  }

  let changed = true
  let iter = 0
  while (changed && iter++ < 20) {
    changed = false
    for (const id of nodeIds) {
      const counts = new Map<number, number>()
      for (const nb of adj.get(id) ?? []) {
        const c = community[nb]
        counts.set(c, (counts.get(c) ?? 0) + 1)
      }
      let best = community[id], bestN = counts.get(best) ?? 0
      for (const [c, n] of counts) { if (n > bestN) { best = c; bestN = n } }
      if (best !== community[id]) { community[id] = best; changed = true }
    }
  }

  // Compact to 0-indexed contiguous integers
  const remap = new Map<number, number>()
  let next = 0
  for (const id of nodeIds) {
    if (!remap.has(community[id])) remap.set(community[id], next++)
    community[id] = remap.get(community[id])!
  }
  return community
}
