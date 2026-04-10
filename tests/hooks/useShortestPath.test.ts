import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShortestPath } from '../../src/hooks/useShortestPath'
import { useAppStore } from '../../src/store/appStore'
import type { GraphEdge } from '../../src/lib/types'

const edges: GraphEdge[] = [
  { source: 'p1', target: 'p2', weight: 1 },
  { source: 'p2', target: 'p3', weight: 1 },
]

beforeEach(() => { useAppStore.setState({ highlightedPath: [] }) })

describe('useShortestPath', () => {
  it('computes path when findPath is called', () => {
    const { result } = renderHook(() => useShortestPath(edges))
    act(() => { result.current.findPath('p1', 'p3') })
    expect(result.current.path).toEqual(['p1', 'p2', 'p3'])
  })

  it('returns [] when no route exists', () => {
    const { result } = renderHook(() => useShortestPath(edges))
    act(() => { result.current.findPath('p1', 'p99') })
    expect(result.current.path).toEqual([])
  })

  it('clears path when clearPath is called', () => {
    const { result } = renderHook(() => useShortestPath(edges))
    act(() => { result.current.findPath('p1', 'p3') })
    act(() => { result.current.clearPath() })
    expect(result.current.path).toEqual([])
  })
})
