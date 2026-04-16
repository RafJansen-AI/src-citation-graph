import { describe, it, expect } from 'vitest'
import { detectAndAnnotate } from '../../scripts/detectClusters'
import type { GraphData } from '../../src/lib/types'

function makeGraph(nodeCount: number): GraphData {
  return {
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: `W${i}`,
      title: `Paper ${i}`,
      year: 2020,
      authors: [],
      focusArea: 'Environmental science',
      tldr: '',
      clusterId: -1,
      citationCount: 0,
    })),
    edges: [],
    clusters: [],
    generatedAt: '2024-01-01T00:00:00Z',
  }
}

// 10 papers: 5 near [1,0] and 5 near [0,1] — should form 2 clear clusters
function makeTwoGroupEmbeddings(graph: GraphData): Record<string, number[]> {
  const embs: Record<string, number[]> = {}
  graph.nodes.forEach((n, i) => {
    embs[n.id] = i < 5 ? [1 + i * 0.01, 0] : [0, 1 + (i - 5) * 0.01]
  })
  return embs
}

describe('detectAndAnnotate (k-means)', () => {
  it('assigns a clusterId to every paper that has an embedding', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    const result = detectAndAnnotate(graph, embeddings, 2)
    const assigned = result.nodes.filter(n => n.clusterId !== -1)
    expect(assigned).toHaveLength(10)
  })

  it('papers with no embedding get clusterId -1', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    // Remove embedding for W0
    delete embeddings['W0']
    const result = detectAndAnnotate(graph, embeddings, 2)
    expect(result.nodes.find(n => n.id === 'W0')!.clusterId).toBe(-1)
  })

  it('papers near [1,0] and papers near [0,1] land in different clusters', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    const result = detectAndAnnotate(graph, embeddings, 2)
    const group1 = result.nodes.slice(0, 5).map(n => n.clusterId)
    const group2 = result.nodes.slice(5, 10).map(n => n.clusterId)
    // All in group1 should share a cluster, all in group2 should share a different cluster
    expect(new Set(group1).size).toBe(1)
    expect(new Set(group2).size).toBe(1)
    expect(group1[0]).not.toBe(group2[0])
  })

  it('clusters smaller than MIN_CLUSTER_SIZE collapse to clusterId -1', () => {
    // 21 papers: 15 near [1,0], 5 near [0,1], 1 isolated at [5,5]
    const graph = makeGraph(21)
    const embs: Record<string, number[]> = {}
    graph.nodes.forEach((n, i) => {
      if (i < 15) embs[n.id] = [1, 0]
      else if (i < 20) embs[n.id] = [0, 1]
      else embs[n.id] = [5, 5] // 1 isolated paper → tiny cluster
    })
    const result = detectAndAnnotate(graph, embs, 3)
    // The isolated paper (W20) should be in clusterId -1
    expect(result.nodes.find(n => n.id === 'W20')!.clusterId).toBe(-1)
  })

  it('returns cluster objects covering all non-isolated papers', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    const result = detectAndAnnotate(graph, embeddings, 2)
    const coveredIds = new Set(result.clusters.flatMap(c => c.paperIds))
    result.nodes
      .filter(n => n.clusterId !== -1)
      .forEach(n => expect(coveredIds.has(n.id)).toBe(true))
  })
})
