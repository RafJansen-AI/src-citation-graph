import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import type { GraphData, Paper } from '../src/lib/types'

async function summarize(client: Anthropic, papers: Paper[]): Promise<string> {
  const list = papers.slice(0, 20)
    .map(p => `- "${p.title}" (${p.year})${p.tldr ? `: ${p.tldr}` : ''}`)
    .join('\n')

  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `These papers form a citation cluster in the Stockholm Resilience Centre research network. Write 2-3 sentences describing the research theme, suitable for a new PhD student orienting themselves in SRC's work.\n\nPapers:\n${list}`,
    }],
  })
  return (msg.content[0] as { type: string; text: string }).text
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
  const client = new Anthropic()
  const graphPath = join(process.cwd(), 'public/data/graph.json')
  const graph: GraphData = JSON.parse(readFileSync(graphPath, 'utf-8'))

  if (!graph.clusters.length) {
    console.error('No clusters. Run npm run detect-clusters first.')
    process.exit(1)
  }

  const byId = new Map(graph.nodes.map(n => [n.id, n]))

  for (const cluster of graph.clusters) {
    if (cluster.summary) { console.log(`Skip ${cluster.label} (already done)`); continue }
    const papers = cluster.paperIds.map(id => byId.get(id)!).filter(Boolean)
    console.log(`Summarizing ${cluster.label} (${papers.length} papers)…`)
    cluster.summary = await summarize(client, papers)
    console.log(`  → ${cluster.summary.slice(0, 80)}…`)
    writeFileSync(graphPath, JSON.stringify(graph, null, 2))
  }
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
