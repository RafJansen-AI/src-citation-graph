import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GraphData } from '../src/lib/types'

const DIMENSIONS = 256  // truncated from 768 — good quality, smaller file

async function embedText(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  text: string,
): Promise<number[]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await model.embedContent({
        content: { parts: [{ text }], role: 'user' },
        taskType: 'RETRIEVAL_DOCUMENT' as any,
      })
      return result.embedding.values.slice(0, DIMENSIONS)
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 429 || status === 503) {
        const delay = Math.pow(2, attempt + 1) * 10_000
        console.log(`  ${status === 429 ? 'Rate limited' : 'Service unavailable'} — waiting ${delay / 1000}s…`)
        await new Promise(r => setTimeout(r, delay))
      } else throw err
    }
  }
  throw new Error('Max retries exceeded')
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

  const graphPath = join(process.cwd(), 'public/data/graph.json')
  const embPath   = join(process.cwd(), 'public/data/embeddings.json')

  const graph: GraphData = JSON.parse(readFileSync(graphPath, 'utf-8'))
  let existing: Record<string, number[]> = {}
  try { existing = JSON.parse(readFileSync(embPath, 'utf-8')) } catch { /* first run */ }

  const toEmbed = graph.nodes.filter(n => !existing[n.id])
  console.log(`Embedding ${toEmbed.length} papers (${Object.keys(existing).length} already done)…`)

  for (let i = 0; i < toEmbed.length; i++) {
    const paper = toEmbed[i]
    const text = `${paper.title}. ${paper.tldr}`.slice(0, 2000)
    process.stdout.write(`\r  [${i + 1}/${toEmbed.length}] ${paper.title.slice(0, 60)}…`)
    existing[paper.id] = await embedText(model, text)
    // Write after every 20 papers so the run is resumable
    if ((i + 1) % 20 === 0) writeFileSync(embPath, JSON.stringify(existing))
  }

  writeFileSync(embPath, JSON.stringify(existing))
  process.stdout.write('\nDone.\n')
}

main().catch(e => { console.error(e); process.exit(1) })
