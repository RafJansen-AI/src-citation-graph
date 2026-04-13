import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'
import type { GraphData, Cluster } from '../src/lib/types'

const MIN_CLUSTER_SIZE = 5

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
  // Build graphology graph
  const g = new Graph({ type: 'undirected', multi: false })
  for (const node of graph.nodes) g.addNode(node.id)
  for (const edge of graph.edges) {
    if (!g.hasEdge(edge.source, edge.target) && !g.hasEdge(edge.target, edge.source)) {
      g.addEdge(edge.source, edge.target)
    }
  }

  // Run proper Louvain community detection
  const communities = louvain(g)

  // Re-number community IDs to be 0-based integers
  const communityMap = new Map<string | number, number>()
  let nextId = 0
  const nodeCommId: Record<string, number> = {}
  for (const nodeId of graph.nodes.map(n => n.id)) {
    const raw = communities[nodeId] ?? 0
    if (!communityMap.has(raw)) communityMap.set(raw, nextId++)
    nodeCommId[nodeId] = communityMap.get(raw)!
  }

  const nodes = graph.nodes.map(n => ({ ...n, clusterId: nodeCommId[n.id] ?? 0 }))

  // Group papers by cluster
  const clusterPapers = new Map<number, string[]>()
  for (const n of nodes) {
    if (!clusterPapers.has(n.clusterId)) clusterPapers.set(n.clusterId, [])
    clusterPapers.get(n.clusterId)!.push(n.id)
  }

  // Assign small clusters to cluster -1 (ungrouped)
  const smallIds = new Set<number>()
  for (const [id, paperIds] of clusterPapers) {
    if (paperIds.length < MIN_CLUSTER_SIZE) smallIds.add(id)
  }

  const remappedNodes = nodes.map(n =>
    smallIds.has(n.clusterId) ? { ...n, clusterId: -1 } : n
  )

  // Rebuild cluster groups after remap
  const finalGroups = new Map<number, string[]>()
  for (const n of remappedNodes) {
    if (n.clusterId === -1) continue
    if (!finalGroups.has(n.clusterId)) finalGroups.set(n.clusterId, [])
    finalGroups.get(n.clusterId)!.push(n.id)
  }

  const conceptColors = loadConceptColors()
  const paperById = new Map(remappedNodes.map(n => [n.id, n]))

  // Build clusters sorted by size descending
  const clusters: Cluster[] = [...finalGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, paperIds], idx) => {
      const areaCounts = new Map<string, number>()
      for (const pid of paperIds) {
        const area = paperById.get(pid)?.focusArea ?? 'Other'
        areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1)
      }
      const dominantArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Other'
      const color = conceptColors[dominantArea] ?? COLORS[idx % COLORS.length]
      return { id, label: dominantArea, summary: '', color, paperIds }
    })

  // Deduplicate cluster labels
  const labelCounts = new Map<string, number>()
  for (const c of clusters) {
    const n = (labelCounts.get(c.label) ?? 0) + 1
    labelCounts.set(c.label, n)
    if (n > 1) c.label = `${c.label} (${n})`
  }

  return { ...graph, nodes: remappedNodes, clusters }
}

async function main() {
  const path = join(process.cwd(), 'public/data/graph.json')
  const graph: GraphData = JSON.parse(readFileSync(path, 'utf-8'))
  console.log(`Detecting clusters in ${graph.nodes.length} nodes, ${graph.edges.length} edges…`)
  const annotated = detectAndAnnotate(graph)
  const significant = annotated.clusters.filter(c => c.id !== -1)
  console.log(`Found ${significant.length} clusters (min size ${MIN_CLUSTER_SIZE}, ${annotated.nodes.filter(n => n.clusterId === -1).length} nodes ungrouped)`)
  significant.forEach(c => console.log(`  [${c.id}] ${c.label}: ${c.paperIds.length} papers`))
  writeFileSync(path, JSON.stringify(annotated, null, 2))
  console.log('Updated public/data/graph.json')
}

main().catch(e => { console.error(e); process.exit(1) })
