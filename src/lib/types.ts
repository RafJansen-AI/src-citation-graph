export interface Author {
  authorId: string
  name: string
  focusArea?: string
}

export interface Paper {
  id: string            // Semantic Scholar paperId
  title: string
  year: number
  authors: Author[]
  focusArea: string     // inherited from the first matching SRC researcher
  tldr: string
  clusterId: number     // -1 until detectClusters.ts runs
  citationCount?: number
  externalUrl?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  srcTheme?: string     // SRC theme assigned by classifyThemes.ts; undefined until that step runs
}

export interface GraphEdge {
  source: string        // paperId
  target: string        // paperId
  weight: number        // 1 = direct citation
}

export interface Cluster {
  id: number
  label: string
  name?: string         // short curated title; set by summarizeClusters.ts
  summary: string       // Gemini-generated narrative; empty until summarizeClusters.ts runs
  color: string         // hex
  paperIds: string[]
}

export interface GraphData {
  nodes: Paper[]
  edges: GraphEdge[]
  clusters: Cluster[]
  generatedAt: string   // ISO 8601
}
