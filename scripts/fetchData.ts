import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { SemanticScholarClient } from './semanticScholar'
import { buildGraph } from './buildGraph'
import type { GraphData } from '../src/lib/types'

interface Roster {
  focusAreas: Record<string, string>
  researchers: Array<{ name: string; focusArea: string }>
}

async function main() {
  const client = new SemanticScholarClient(process.env.SEMANTIC_SCHOLAR_API_KEY)
  const roster: Roster = JSON.parse(readFileSync('data/researchers.json', 'utf-8'))

  console.log(`Fetching ${roster.researchers.length} researchers from Semantic Scholar…`)

  const authorPapers: Record<string, { name: string; focusArea: string; papers: any[] }> = {}

  for (const r of roster.researchers) {
    console.log(`  [author] ${r.name}`)
    try {
      const results = await client.searchAuthor(r.name)
      if (!results.length) { console.warn(`    no results`); continue }
      const author = results[0]
      console.log(`    → ${author.name} (${author.authorId}), ${author.paperCount ?? '?'} papers`)
      const papers = await client.getAuthorPapers(author.authorId)
      console.log(`    fetched ${papers.length} papers`)
      authorPapers[author.authorId] = { name: author.name, focusArea: r.focusArea, papers }
    } catch (e) {
      console.error(`    ERROR: ${e}`)
    }
  }

  const allPaperIds = new Set(
    Object.values(authorPapers).flatMap(a => a.papers.map((p: any) => p.paperId).filter(Boolean))
  )
  console.log(`\nTotal SRC papers: ${allPaperIds.size}`)
  console.log('Fetching citation relationships…')

  const citations: Record<string, string[]> = {}
  let i = 0
  for (const pid of allPaperIds) {
    i++
    if (i % 100 === 0) console.log(`  ${i}/${allPaperIds.size}`)
    try { citations[pid] = await client.getPaperCitingPapers(pid) }
    catch { citations[pid] = [] }
  }

  const { nodes, edges } = buildGraph(authorPapers, citations)
  console.log(`\nGraph: ${nodes.length} nodes, ${edges.length} edges`)

  const graph: GraphData = {
    nodes, edges, clusters: [],
    generatedAt: new Date().toISOString(),
  }

  const outDir = join(process.cwd(), 'public/data')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'graph.json'), JSON.stringify(graph, null, 2))
  console.log('Written → public/data/graph.json')
}

main().catch(e => { console.error(e); process.exit(1) })
