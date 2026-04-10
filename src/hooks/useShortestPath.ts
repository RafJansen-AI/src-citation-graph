import { useState, useCallback } from 'react'
import type { GraphEdge } from '../lib/types'
import { bfsShortestPath } from '../lib/graphAlgorithms'
import { useAppStore } from '../store/appStore'

export function useShortestPath(edges: GraphEdge[]) {
  const [path, setPath] = useState<string[]>([])
  const { setHighlightedPath } = useAppStore()

  const findPath = useCallback((src: string, tgt: string) => {
    const result = bfsShortestPath(edges, src, tgt)
    setPath(result)
    setHighlightedPath(result)
  }, [edges, setHighlightedPath])

  const clearPath = useCallback(() => {
    setPath([])
    setHighlightedPath([])
  }, [setHighlightedPath])

  return { path, findPath, clearPath }
}
