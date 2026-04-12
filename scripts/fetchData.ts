import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { OpenAlexClient, type OAWork } from './openAlex'
import { buildGraph } from './buildGraph'
import type { GraphData } from '../src/lib/types'

interface Config {
  institutionName: string
  conceptColors: Record<string, string>
}

async function main() {
  const config: Config = JSON.parse(readFileSync('data/config.json', 'utf-8'))
  const client = new OpenAlexClient(process.env.OPENALEX_EMAIL)

  // Step 1: Resolve institution
  console.log(`Finding institution: "${config.institutionName}"…`)
  const institution = await client.findInstitution(config.institutionName)
  if (!institution) throw new Error(`Institution not found: ${config.institutionName}`)
  const institutionId = OpenAlexClient.workId(institution.id)
  console.log(`Found: ${institution.display_name} (${institutionId})`)

  // Step 2: Stream all works from OpenAlex
  console.log('Fetching works from OpenAlex…')
  const works: OAWork[] = []
  for await (const work of client.getInstitutionWorks(institutionId)) {
    works.push(work)
  }
  console.log(`Total works: ${works.length}`)

  // Step 3: Build graph (citations derived from referenced_works — no extra API calls)
  const { nodes, edges } = buildGraph(works)
  console.log(`Graph: ${nodes.length} nodes, ${edges.length} edges`)

  // Report discovered focus areas (for config tuning)
  const areas = new Set(nodes.map(n => n.focusArea))
  console.log(`Focus areas found: ${[...areas].join(', ')}`)

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
