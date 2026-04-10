import { describe, it, expect } from 'vitest'
import { bfsShortestPath, louvainCommunities } from '../../src/lib/graphAlgorithms'
import type { GraphEdge } from '../../src/lib/types'

describe('bfsShortestPath', () => {
  const edges: GraphEdge[] = [
    { source: 'A', target: 'B', weight: 1 },
    { source: 'B', target: 'C', weight: 1 },
    { source: 'A', target: 'D', weight: 1 },
    { source: 'D', target: 'C', weight: 1 },
  ]

  it('finds shortest path between connected nodes', () => {
    const path = bfsShortestPath(edges, 'A', 'C')
    expect(path).toHaveLength(3)
    expect(path[0]).toBe('A')
    expect(path[path.length - 1]).toBe('C')
  })

  it('returns [] when no path exists', () => {
    expect(bfsShortestPath(edges, 'A', 'Z')).toEqual([])
  })

  it('returns [node] when source === target', () => {
    expect(bfsShortestPath(edges, 'A', 'A')).toEqual(['A'])
  })
})

describe('louvainCommunities', () => {
  it('assigns all nodes a community ID', () => {
    const nodes = ['p1', 'p2', 'p3', 'p4']
    const edges: GraphEdge[] = [
      { source: 'p1', target: 'p2', weight: 1 },
      { source: 'p3', target: 'p4', weight: 1 },
    ]
    const result = louvainCommunities(nodes, edges)
    expect(Object.keys(result)).toHaveLength(4)
    expect(result['p1']).toBe(result['p2'])
    expect(result['p3']).toBe(result['p4'])
    expect(result['p1']).not.toBe(result['p3'])
  })
})
