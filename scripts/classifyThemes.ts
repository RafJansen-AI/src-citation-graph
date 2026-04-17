import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GraphData, Paper } from '../src/lib/types'

const THEMES: Record<string, string> = {
  'Planetary Boundaries':
    'Planetary boundaries framework, safe operating space, Earth system tipping points, climate change, biogeochemical flows, land-system change, ocean acidification, freshwater cycles, nitrogen and phosphorus, Anthropocene, navigating the Anthropocene, human-dominated Earth system',
  'Biodiversity & Ecosystems':
    'Biosphere integrity and functioning, biodiversity, ecosystem services, species and genetic diversity, habitat loss, marine and terrestrial ecology, nature-based solutions, pollination, functional diversity',
  'Social-Ecological Systems':
    'Social-ecological systems, resilience thinking, panarchy, adaptive management, coupled human-nature systems, stewardship, transformation, adaptive capacity, system dynamics',
  'Complexity & Modelling':
    'Complex adaptive systems, agent-based modelling, systems thinking, network analysis, computational modelling, scenario analysis, feedback loops, interacting complexities',
  'Sustainability Governance':
    'Earth system governance, ocean governance, adaptive governance, environmental institutions, polycentric governance, sustainability transitions, international environmental agreements, transformative governance',
  'Health & Wellbeing':
    'Antimicrobial resistance, One Health, human health outcomes, nature-based health benefits, wellbeing effects of biodiversity and green spaces, disease ecology, public health interventions, mental health and nature connections',
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

  // Clear existing srcTheme so all papers are re-classified with the current descriptions
  const freshNodes = graph.nodes.map(({ srcTheme: _, ...n }) => n) as Paper[]
  console.log(`Classifying ${freshNodes.length} papers…`)

  // Embed the 7 theme descriptions (~7 API calls)
  console.log('Embedding theme descriptions…')
  const themeEmbeddings: Record<string, number[]> = {}
  for (const [theme, description] of Object.entries(THEMES)) {
    process.stdout.write(`  ${theme}…`)
    themeEmbeddings[theme] = await embedText(model, description)
    process.stdout.write(' done\n')
  }

  const classified = classifyPapers(freshNodes, embeddings, themeEmbeddings)

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

// Guard needed because tests import classifyPapers from this module.
// Unlike embedPapers.ts, we can't call main() unconditionally.
if (process.argv[1] && process.argv[1].endsWith('classifyThemes.ts')) {
  main().catch(e => { console.error(e); process.exit(1) })
}
