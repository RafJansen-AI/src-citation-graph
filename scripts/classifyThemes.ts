import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GraphData, Paper } from '../src/lib/types'

const THEMES: Record<string, string> = {
  'Planetary Boundaries':
    'Earth system processes, planetary boundaries, climate change, biosphere integrity, biogeochemical flows, land-system change, global tipping points',
  'Biodiversity & Ecosystems':
    'Biodiversity conservation, ecosystem services, species loss, habitat degradation, marine and terrestrial ecology, nature-based solutions',
  'Social-Ecological Systems':
    'Social-ecological systems, resilience thinking, adaptive management, coupled human-nature systems, transformation, panarchy',
  'Complexity & Modelling':
    'Complex adaptive systems, agent-based modelling, systems thinking, network analysis, computational modelling, scenario analysis',
  'Sustainability Governance':
    'Sustainability governance, institutions, environmental policy, corporate sustainability, international agreements, environmental law, polycentric governance',
  'Health & Wellbeing':
    'Human health, wellbeing, food security, water security, disease, public health, nutrition, mental health',
  'Other':
    'Interdisciplinary or unclassified research',
}

// Must match DIMENSIONS in embedPapers.ts — paper embeddings are truncated to 256
const DIMENSIONS = 256

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Assigns srcTheme to each paper by cosine similarity to theme embeddings.
 * Papers that already have srcTheme set are left unchanged (resumable).
 * Papers without an embedding in the map get srcTheme 'Other'.
 *
 * @param papers          Array of Paper nodes from graph.json
 * @param embeddings      Map of paperId → float[] (from embeddings.json)
 * @param themeEmbeddings Map of theme name → float[] (embed the THEMES descriptions)
 */
export function classifyPapers(
  papers: Paper[],
  embeddings: Record<string, number[]>,
  themeEmbeddings: Record<string, number[]>,
): Paper[] {
  const themeNames = Object.keys(themeEmbeddings)
  return papers.map(paper => {
    if (paper.srcTheme) return paper          // already classified — skip
    const emb = embeddings[paper.id]
    if (!emb) return { ...paper, srcTheme: 'Other' }
    let best = 'Other'
    let bestScore = -Infinity
    for (const theme of themeNames) {
      const score = cosineSimilarity(emb, themeEmbeddings[theme])
      if (score > bestScore) { bestScore = score; best = theme }
    }
    return { ...paper, srcTheme: best }
  })
}

async function embedText(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  text: string,
): Promise<number[]> {
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    // Theme descriptions are retrieval queries against paper documents
    taskType: 'RETRIEVAL_QUERY' as any,
  })
  return result.embedding.values.slice(0, DIMENSIONS)
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

  const graphPath = join(process.cwd(), 'public/data/graph.json')
  const embPath   = join(process.cwd(), 'public/data/embeddings.json')

  const graph: GraphData = JSON.parse(readFileSync(graphPath, 'utf-8'))
  const embeddings: Record<string, number[]> = JSON.parse(readFileSync(embPath, 'utf-8'))

  const toClassify = graph.nodes.filter(n => !n.srcTheme)
  console.log(`Classifying ${toClassify.length} papers (${graph.nodes.length - toClassify.length} already done)…`)

  if (toClassify.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // Embed the 7 theme descriptions (~7 API calls)
  console.log('Embedding theme descriptions…')
  const themeEmbeddings: Record<string, number[]> = {}
  for (const [theme, description] of Object.entries(THEMES)) {
    process.stdout.write(`  ${theme}…`)
    themeEmbeddings[theme] = await embedText(model, description)
    process.stdout.write(' done\n')
  }

  const classified = classifyPapers(graph.nodes, embeddings, themeEmbeddings)

  // Log distribution
  const counts = new Map<string, number>()
  for (const p of classified) {
    const t = p.srcTheme ?? 'Other'
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  console.log('Theme distribution:')
  for (const [theme, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${theme}: ${count}`)
  }

  writeFileSync(graphPath, JSON.stringify({ ...graph, nodes: classified }, null, 2))
  console.log('Updated public/data/graph.json')
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] && process.argv[1].endsWith('classifyThemes.ts')) {
  main().catch(e => { console.error(e); process.exit(1) })
}
