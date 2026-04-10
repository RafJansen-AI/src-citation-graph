import type { GraphData, Paper, GraphEdge } from '../src/lib/types'

interface AuthorEntry {
  name: string
  focusArea: string
  papers: any[]
}

export function buildGraph(
  authorPapers: Record<string, AuthorEntry>,
  citations: Record<string, string[]>,
): Pick<GraphData, 'nodes' | 'edges'> {
  const srcIds = new Set<string>()
  const paperMap = new Map<string, Paper>()

  for (const authorData of Object.values(authorPapers)) {
    for (const raw of authorData.papers) {
      if (!raw.paperId) continue
      srcIds.add(raw.paperId)
      if (paperMap.has(raw.paperId)) continue
      paperMap.set(raw.paperId, {
        id: raw.paperId,
        title: raw.title ?? 'Untitled',
        year: raw.year ?? 0,
        authors: (raw.authors ?? []).map((a: any) => ({ authorId: a.authorId, name: a.name })),
        focusArea: authorData.focusArea,
        tldr: raw.tldr?.text ?? '',
        clusterId: -1,
        citationCount: raw.citationCount ?? 0,
        externalUrl: raw.externalIds?.DOI
          ? `https://doi.org/${raw.externalIds.DOI}`
          : `https://www.semanticscholar.org/paper/${raw.paperId}`,
      })
    }
  }

  const seen = new Set<string>()
  const edges: GraphEdge[] = []
  for (const [src, targets] of Object.entries(citations)) {
    if (!srcIds.has(src)) continue
    for (const tgt of targets) {
      if (!srcIds.has(tgt)) continue
      const key = `${src}:${tgt}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ source: src, target: tgt, weight: 1 })
    }
  }

  return { nodes: Array.from(paperMap.values()), edges }
}
