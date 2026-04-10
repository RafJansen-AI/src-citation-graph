import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGraphData } from '../../src/hooks/useGraphData'
import type { GraphData } from '../../src/lib/types'

const mockGraph: GraphData = {
  nodes: [{ id: 'p1', title: 'Test', year: 2020, authors: [], focusArea: 'AI',
            tldr: '', clusterId: 0, citationCount: 1 }],
  edges: [], clusters: [], generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockGraph } as any)
})

describe('useGraphData', () => {
  it('returns loading=true initially', () => {
    const { result } = renderHook(() => useGraphData())
    expect(result.current.loading).toBe(true)
  })

  it('returns graph data after fetch', async () => {
    const { result } = renderHook(() => useGraphData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.nodes).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('returns error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as any)
    const { result } = renderHook(() => useGraphData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).not.toBeNull()
  })
})
