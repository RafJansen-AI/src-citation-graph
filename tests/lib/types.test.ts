import { describe, it, expect } from 'vitest'
import type { GraphData } from '../../src/lib/types'

describe('GraphData type contract', () => {
  it('should accept a valid GraphData object', () => {
    const g: GraphData = {
      nodes: [{
        id: 'p1', title: 'Test', year: 2020,
        authors: [{ authorId: 'a1', name: 'Alice' }],
        focusArea: 'AI', tldr: '', clusterId: 0,
        citationCount: 5, externalUrl: 'https://example.com',
      }],
      edges: [{ source: 'p1', target: 'p2', weight: 1 }],
      clusters: [{
        id: 0, label: 'Cluster 1', summary: 'AI stuff',
        color: '#4F46E5', paperIds: ['p1'],
      }],
      generatedAt: '2024-01-01T00:00:00Z',
    }
    expect(g.nodes).toHaveLength(1)
    expect(g.edges).toHaveLength(1)
    expect(g.clusters).toHaveLength(1)
  })
})
