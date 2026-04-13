import type { Paper } from './types'

// Co-authorship graph keyed by author NAME (not authorId).
// OpenAlex assigns different authorIds to the same person across papers,
// so name-based matching is more reliable for this dataset.
export type CoauthorGraph = Map<string, Set<string>>

export function buildCoauthorGraph(nodes: Paper[]): CoauthorGraph {
  const graph: CoauthorGraph = new Map()
  for (const paper of nodes) {
    for (const a of paper.authors) {
      if (!graph.has(a.name)) graph.set(a.name, new Set())
    }
    for (let i = 0; i < paper.authors.length; i++) {
      for (let j = i + 1; j < paper.authors.length; j++) {
        const a = paper.authors[i].name
        const b = paper.authors[j].name
        if (a === b) continue  // skip duplicate-name entries in the same paper
        graph.get(a)!.add(b)
        graph.get(b)!.add(a)
      }
    }
  }
  return graph
}

export function coauthorPath(graph: CoauthorGraph, fromName: string, toName: string): string[] {
  if (fromName === toName) return [fromName]
  const visited = new Set([fromName])
  const queue: string[][] = [[fromName]]
  while (queue.length) {
    const path = queue.shift()!
    const current = path[path.length - 1]
    for (const nb of graph.get(current) ?? []) {
      if (nb === toName) return [...path, nb]
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push([...path, nb])
      }
    }
  }
  return []
}

// Returns papers where both named authors appear (matched by name).
export function sharedPapers(nodes: Paper[], nameA: string, nameB: string): Paper[] {
  return nodes.filter(p =>
    p.authors.some(a => a.name === nameA) &&
    p.authors.some(a => a.name === nameB)
  )
}
