import type { GraphData, Paper, GraphEdge } from '../src/lib/types'
import { OpenAlexClient, type OAWork } from './openAlex'

export function buildGraph(works: OAWork[]): Pick<GraphData, 'nodes' | 'edges'> {
  const srcIds = new Set(works.map(w => OpenAlexClient.workId(w.id)))

  const nodes: Paper[] = works.map(w => {
    const id = OpenAlexClient.workId(w.id)
    const doi = w.ids?.doi?.replace('https://doi.org/', '')
    return {
      id,
      title: w.title ?? 'Untitled',
      year: w.publication_year ?? 0,
      authors: (w.authorships ?? []).map(a => ({
        authorId: OpenAlexClient.workId(a.author.id),
        name: a.author.display_name,
      })),
      focusArea: OpenAlexClient.topConcept(w.concepts ?? []),
      tldr: OpenAlexClient.reconstructAbstract(w.abstract_inverted_index).slice(0, 400),
      clusterId: -1,
      citationCount: w.cited_by_count ?? 0,
      externalUrl: doi
        ? `https://doi.org/${doi}`
        : `https://openalex.org/${id}`,
    }
  })

  const seen = new Set<string>()
  const edges: GraphEdge[] = []

  for (const w of works) {
    const srcId = OpenAlexClient.workId(w.id)
    for (const ref of w.referenced_works ?? []) {
      const tgtId = OpenAlexClient.workId(ref)
      if (!srcIds.has(tgtId)) continue
      const key = `${srcId}:${tgtId}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ source: srcId, target: tgtId, weight: 1 })
    }
  }

  return { nodes, edges }
}
