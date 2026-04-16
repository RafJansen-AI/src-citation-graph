import { readFileSync } from 'fs'
import type { GraphData, Paper, GraphEdge } from '../src/lib/types'
import { OpenAlexClient, type OAWork } from './openAlex'

function loadExcludedAuthorIds(): Set<string> {
  try {
    const cfg = JSON.parse(readFileSync('data/config.json', 'utf-8'))
    return new Set<string>((cfg.excludedAuthorIds ?? []).map((id: string) => OpenAlexClient.workId(id)))
  } catch { return new Set() }
}

export function buildGraph(works: OAWork[]): Pick<GraphData, 'nodes' | 'edges'> {
  const excludedAuthorIds = loadExcludedAuthorIds()
  const validWorks = works.filter(w => {
    if (w.id == null || w.title == null) return false
    if (excludedAuthorIds.size === 0) return true
    // Drop papers where every authorship traces back to an excluded author
    // (i.e. the paper is only in the dataset because of a misattributed affiliation)
    const authorIds = (w.authorships ?? []).map(a => OpenAlexClient.workId(a.author?.id ?? ''))
    return !authorIds.some(id => excludedAuthorIds.has(id))
  })
  const srcIds = new Set(validWorks.map(w => OpenAlexClient.workId(w.id)))

  const nodes: Paper[] = validWorks.map(w => {
    const id = OpenAlexClient.workId(w.id)
    const doi = w.ids?.doi?.replace('https://doi.org/', '')
    return {
      id,
      title: w.title ?? 'Untitled',
      year: w.publication_year ?? 0,
      authors: (w.authorships ?? [])
        .filter(a => a.author?.id != null)
        .map(a => ({
          authorId: OpenAlexClient.workId(a.author.id),
          name: a.author.display_name ?? 'Unknown',
        })),
      focusArea: OpenAlexClient.topConcept(w.concepts ?? []),
      tldr: OpenAlexClient.reconstructAbstract(w.abstract_inverted_index).slice(0, 400),
      clusterId: -1,
      citationCount: w.cited_by_count ?? 0,
      externalUrl: doi
        ? `https://doi.org/${doi}`
        : `https://openalex.org/${id}`,
      journal: w.primary_location?.source?.display_name ?? undefined,
      volume: w.biblio?.volume ?? undefined,
      issue: w.biblio?.issue ?? undefined,
      pages: (w.biblio?.first_page && w.biblio?.last_page)
        ? `${w.biblio.first_page}\u2013${w.biblio.last_page}`
        : w.biblio?.first_page
          ? w.biblio.first_page
          : undefined,
    }
  })

  const seen = new Set<string>()
  const edges: GraphEdge[] = []

  for (const w of validWorks) {
    const srcId = OpenAlexClient.workId(w.id)
    for (const ref of (w.referenced_works ?? []).filter(Boolean)) {
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
