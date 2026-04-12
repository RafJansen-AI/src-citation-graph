import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { louvainCommunities } from '../src/lib/graphAlgorithms'
import type { GraphData, Cluster } from '../src/lib/types'

// Fallback palette — overridden by concept-derived colors in config.json when available
const COLORS = ['#4F46E5','#16A34A','#DC2626','#D97706','#0891B2','#7C3AED','#DB2777','#059669']

interface Config { conceptColors: Record<string, string> }

function loadConceptColors(): Record<string, string> {
  try {
    const cfg: Config = JSON.parse(readFileSync('data/config.json', 'utf-8'))
    return cfg.conceptColors ?? {}
  } catch { return {} }
}

export function detectAndAnnotate(graph: GraphData): GraphData {
  const nodeIds = graph.nodes.map(n => n.id)
  const communities = louvainCommunities(nodeIds, graph.edges)

  const nodes = graph.nodes.map(n => ({ ...n, clusterId: communities[n.id] ?? 0 }))

  const clusterPapers = new Map<number, string[]>()
  for (const n of nodes) {
    if (!clusterPapers.has(n.clusterId)) clusterPapers.set(n.clusterId, [])
    clusterPapers.get(n.clusterId)!.push(n.id)
  }

  const conceptColors = loadConceptColors()
  const clusters: Cluster[] = []

  for (const [id, paperIds] of clusterPapers) {
    // Pick cluster color from the dominant focus area in this cluster
    const paperById = new Map(nodes.map(n => [n.id, n]))
    const areaCounts = new Map<string, number>()
    for (const pid of paperIds) {
      const area = paperById.get(pid)?.focusArea ?? 'Other'
      areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1)
    }
    const dominantArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Other'
    const color = conceptColors[dominantArea] ?? COLORS[id % COLORS.length]

    clusters.push({
      id, label: dominantArea, summary: '',
      color, paperIds,
    })
  }

  // Deduplicate cluster labels (multiple clusters may share a dominant concept)
  const labelCounts = new Map<string, number>()
  for (const c of clusters) {
    const n = (labelCounts.get(c.label) ?? 0) + 1
    labelCounts.set(c.label, n)
    if (n > 1) c.label = `${c.label} (${n})`
  }

  return { ...graph, nodes, clusters }
}

async function main() {
  const path = join(process.cwd(), 'public/data/graph.json')
  const graph: GraphData = JSON.parse(readFileSync(path, 'utf-8'))
  console.log(`Detecting clusters in ${graph.nodes.length} nodes…`)
  const annotated = detectAndAnnotate(graph)
  console.log(`Found ${annotated.clusters.length} clusters`)
  annotated.clusters.forEach(c => console.log(`  ${c.label}: ${c.paperIds.length} papers`))
  writeFileSync(path, JSON.stringify(annotated, null, 2))
  console.log('Updated public/data/graph.json')
}

main().catch(e => { console.error(e); process.exit(1) })
