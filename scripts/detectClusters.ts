import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { louvainCommunities } from '../src/lib/graphAlgorithms'
import type { GraphData, Cluster } from '../src/lib/types'

const COLORS = ['#4F46E5','#16A34A','#DC2626','#D97706','#0891B2','#7C3AED','#DB2777','#059669']

export function detectAndAnnotate(graph: GraphData): GraphData {
  const nodeIds = graph.nodes.map(n => n.id)
  const communities = louvainCommunities(nodeIds, graph.edges)

  const nodes = graph.nodes.map(n => ({ ...n, clusterId: communities[n.id] ?? 0 }))

  const clusterPapers = new Map<number, string[]>()
  for (const n of nodes) {
    if (!clusterPapers.has(n.clusterId)) clusterPapers.set(n.clusterId, [])
    clusterPapers.get(n.clusterId)!.push(n.id)
  }

  const clusters: Cluster[] = []
  for (const [id, paperIds] of clusterPapers) {
    clusters.push({
      id, label: `Cluster ${id + 1}`, summary: '',
      color: COLORS[id % COLORS.length], paperIds,
    })
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
