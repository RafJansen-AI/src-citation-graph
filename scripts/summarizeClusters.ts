import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GraphData, Paper } from '../src/lib/types'

const PROMPT = (list: string) =>
  `These papers form a citation cluster in the Stockholm Resilience Centre research network. ` +
  `Write 2-3 sentences describing the research theme, suitable for a new PhD student orienting themselves in SRC's work.\n\nPapers:\n${list}`

async function summarize(model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, papers: Paper[]): Promise<string> {
  const list = papers.slice(0, 20)
    .map(p => `- "${p.title}" (${p.year})${p.tldr ? `: ${p.tldr.slice(0, 120)}` : ''}`)
    .join('\n')

  const result = await model.generateContent(PROMPT(list))
  return result.response.text().trim()
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set')

  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelName })
  console.log(`Using model: ${modelName}`)

  const graphPath = join(process.cwd(), 'public/data/graph.json')
  const graph: GraphData = JSON.parse(readFileSync(graphPath, 'utf-8'))

  if (!graph.clusters.length) {
    console.error('No clusters. Run npm run detect-clusters first.')
    process.exit(1)
  }

  const byId = new Map(graph.nodes.map(n => [n.id, n]))

  for (const cluster of graph.clusters) {
    if (cluster.summary) { console.log(`Skip "${cluster.label}" (already done)`); continue }
    const papers = cluster.paperIds.map(id => byId.get(id)!).filter(Boolean)
    console.log(`Summarizing "${cluster.label}" (${papers.length} papers)…`)
    cluster.summary = await summarize(model, papers)
    console.log(`  → ${cluster.summary.slice(0, 80)}…`)
    writeFileSync(graphPath, JSON.stringify(graph, null, 2))  // write after each — resumable
  }
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
