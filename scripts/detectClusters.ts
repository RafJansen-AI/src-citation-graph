import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { kmeans } from 'ml-kmeans'
import type { GraphData, Cluster } from '../src/lib/types'

const MIN_CLUSTER_SIZE = 5

const COLORS = ['#4F46E5','#16A34A','#DC2626','#D97706','#0891B2','#7C3AED','#DB2777','#059669']

interface Config { conceptColors: Record<string, string>; clusterCount?: number }

function loadConfig(): Config {
  try { return JSON.parse(readFileSync('data/config.json', 'utf-8')) }
  catch { return { conceptColors: {} } }
}

/**
 * detectAndAnnotate — public for testing.
 * @param graph       GraphData with nodes/edges (clusters will be replaced)
 * @param embeddings  Optional: paperId → float[] map. If omitted, loaded from public/data/embeddings.json.
 * @param k           Optional: number of clusters. If omitted, read from config (default 15).
 */
export function detectAndAnnotate(
  graph: GraphData,
  embeddings?: Record<string, number[]>,
  k?: number,
): GraphData {
  // Load embeddings from disk if not injected
  let embs: Record<string, number[]> = embeddings ?? {}
  if (!embeddings) {
    try {
      embs = JSON.parse(readFileSync(join(process.cwd(), 'public/data/embeddings.json'), 'utf-8'))
    } catch { /* no embeddings yet — all papers will be unclustered */ }
  }

  const config = loadConfig()
  const numClusters = k ?? config.clusterCount ?? 15

  // Split papers into those with/without embeddings
  const withEmb = graph.nodes.filter(n => embs[n.id])
  const withoutEmb = graph.nodes.filter(n => !embs[n.id])

  // Run k-means (need at least k papers)
  const effectiveK = Math.min(numClusters, withEmb.length)
  const nodeCommId: Record<string, number> = {}

  if (effectiveK > 0 && withEmb.length > 0) {
    const matrix = withEmb.map(n => embs[n.id])
    const result = kmeans(matrix, effectiveK, { initialization: 'kmeans++', seed: 42 })
    for (let i = 0; i < withEmb.length; i++) {
      nodeCommId[withEmb[i].id] = result.clusters[i]
    }
  }

  // Papers without embeddings → clusterId -1
  for (const n of withoutEmb) nodeCommId[n.id] = -1

  const nodes = graph.nodes.map(n => ({ ...n, clusterId: nodeCommId[n.id] ?? -1 }))

  // Group by clusterId
  const clusterPapers = new Map<number, string[]>()
  for (const n of nodes) {
    if (n.clusterId === -1) continue
    if (!clusterPapers.has(n.clusterId)) clusterPapers.set(n.clusterId, [])
    clusterPapers.get(n.clusterId)!.push(n.id)
  }

  // Collapse small clusters to -1
  const smallIds = new Set<number>()
  for (const [id, paperIds] of clusterPapers) {
    if (paperIds.length < MIN_CLUSTER_SIZE) smallIds.add(id)
  }
  const remappedNodes = nodes.map(n =>
    smallIds.has(n.clusterId) ? { ...n, clusterId: -1 } : n
  )

  // Rebuild groups after collapse
  const finalGroups = new Map<number, string[]>()
  for (const n of remappedNodes) {
    if (n.clusterId === -1) continue
    if (!finalGroups.has(n.clusterId)) finalGroups.set(n.clusterId, [])
    finalGroups.get(n.clusterId)!.push(n.id)
  }

  const paperById = new Map(remappedNodes.map(n => [n.id, n]))
  const { conceptColors } = config

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

  // Deduplicate labels
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
  console.log(`Clustering ${graph.nodes.length} nodes…`)
  const annotated = detectAndAnnotate(graph)
  const significant = annotated.clusters.filter(c => c.id !== -1)
  console.log(`Found ${significant.length} clusters (${annotated.nodes.filter(n => n.clusterId === -1).length} nodes ungrouped)`)
  significant.forEach(c => console.log(`  [${c.id}] ${c.label}: ${c.paperIds.length} papers`))
  writeFileSync(path, JSON.stringify(annotated, null, 2))
  console.log('Updated public/data/graph.json')
}

main().catch(e => { console.error(e); process.exit(1) })
