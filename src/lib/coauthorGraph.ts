import type { Paper } from './types'

export type CoauthorGraph = Map<string, Set<string>>

export function buildCoauthorGraph(nodes: Paper[]): CoauthorGraph {
  const graph: CoauthorGraph = new Map()
  for (const paper of nodes) {
    for (const a of paper.authors) {
      if (!graph.has(a.authorId)) graph.set(a.authorId, new Set())
    }
    for (let i = 0; i < paper.authors.length; i++) {
      for (let j = i + 1; j < paper.authors.length; j++) {
        const a = paper.authors[i].authorId
        const b = paper.authors[j].authorId
        graph.get(a)!.add(b)
        graph.get(b)!.add(a)
      }
    }
  }
  return graph
}

export function coauthorPath(graph: CoauthorGraph, fromId: string, toId: string): string[] {
  if (fromId === toId) return [fromId]
  const visited = new Set([fromId])
  const queue: string[][] = [[fromId]]
  while (queue.length) {
    const path = queue.shift()!
    const current = path[path.length - 1]
    for (const nb of graph.get(current) ?? []) {
      if (nb === toId) return [...path, nb]
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push([...path, nb])
      }
    }
  }
  return []
}

export function sharedPapers(nodes: Paper[], idA: string, idB: string): Paper[] {
  return nodes.filter(p =>
    p.authors.some(a => a.authorId === idA) &&
    p.authors.some(a => a.authorId === idB)
  )
}
