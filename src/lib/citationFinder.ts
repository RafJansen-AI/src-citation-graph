import type { Paper } from './types'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'of', 'to', 'and',
  'or', 'but', 'for', 'with', 'on', 'at', 'by', 'from', 'as', 'be', 'this',
  'that', 'these', 'those', 'it', 'its', 'their', 'our', 'we', 'they', 'have',
  'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'may',
  'might', 'should', 'shall', 'not', 'no', 'nor', 'so', 'yet', 'both', 'also',
  'which', 'how', 'what', 'when', 'where', 'who', 'why',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 4 && !STOP_WORDS.has(t))
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

function keywordScore(queryTokens: Set<string>, paper: Paper): number {
  const titleTokens    = new Set(tokenize(paper.title))
  const abstractTokens = new Set(tokenize(paper.tldr))
  let score = 0
  for (const token of queryTokens) {
    if (titleTokens.has(token))    score += 3
    if (abstractTokens.has(token)) score += 1
  }
  return score
}

export interface FindOptions {
  queryEmbedding?:  number[]
  paperEmbeddings?: Map<string, number[]>
  boostByCitations?: boolean  // default false
  topN?: number               // default 15
}

export function findRelevantPapers(
  query: string,
  papers: Paper[],
  options: FindOptions,
): Paper[] {
  const { queryEmbedding, paperEmbeddings, boostByCitations = false, topN = 15 } = options

  if (!query.trim()) return []

  const useSemantics = !!(queryEmbedding && paperEmbeddings && paperEmbeddings.size > 0)
  const queryTokens  = new Set(tokenize(query))

  if (!useSemantics && queryTokens.size === 0) return []

  const scored = papers.map(p => {
    let score: number

    if (useSemantics) {
      const pEmb = paperEmbeddings!.get(p.id)
      score = pEmb ? cosineSimilarity(queryEmbedding!, pEmb) : 0
    } else {
      score = keywordScore(queryTokens, p)
    }

    if (boostByCitations && score > 0) {
      score += Math.log1p(p.citationCount ?? 0) * 0.05
    }

    return { paper: p, score }
  })

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.paper)
}
