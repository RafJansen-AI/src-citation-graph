# Embedding-Based Clustering & Per-Paper Node Coloring — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Color graph nodes by each paper's own research topic, and replace citation-topology (Louvain) clusters with content-based (k-means on embeddings) clusters.

**Architecture:** Two independent changes. Task 1 is a 2-line edit in `CitationGraph.tsx` — swap `clusterThemeMap.get(clusterId)` for `CLUSTER_LABEL_TO_THEME[focusArea]` in both the color callback and the theme filter. Task 2 rewrites `detectClusters.ts` to load `public/data/embeddings.json` and run k-means, then reorders the pipeline so embeddings are generated before cluster detection.

**Tech Stack:** TypeScript, `ml-kmeans` (pure-JS k-means), Vitest

---

## Chunk 1: Per-paper node coloring

### Task 1: Update CitationGraph.tsx — color and filter by paper's own focusArea

**Files:**
- Modify: `src/components/CitationGraph.tsx:5,52-55,89-100,121-141`

This is a UI-only change. Canvas rendering cannot be meaningfully unit-tested in jsdom. Correctness is verified by running the existing test suite (no regressions) and visual inspection after `npm run dev`.

- [ ] **Step 1: Remove `clusterThemeMap` and import `CLUSTER_LABEL_TO_THEME`**

In `src/components/CitationGraph.tsx`, replace the import line:
```typescript
// BEFORE
import { buildClusterThemeMap } from '../lib/srcThemes'
```
```typescript
// AFTER
import { CLUSTER_LABEL_TO_THEME } from '../lib/srcThemes'
```

Delete only the `clusterThemeMap` useMemo call in `CitationGraph.tsx` (lines 52–55) — do NOT remove `buildClusterThemeMap` from `srcThemes.ts`, it is still used by `ClusterPanel.tsx`:
```typescript
// DELETE these lines from CitationGraph.tsx only:
const clusterThemeMap = useMemo(
  () => buildClusterThemeMap(graph.clusters),
  [graph.clusters]
)
```

- [ ] **Step 2: Update the theme filter (line 92)**

```typescript
// BEFORE
nodes = nodes.filter(n => selectedThemes.has(clusterThemeMap.get(n.clusterId) ?? 'Other'))
```
```typescript
// AFTER
nodes = nodes.filter(n => selectedThemes.has(CLUSTER_LABEL_TO_THEME[n.focusArea] ?? 'Other'))
```

Also remove `clusterThemeMap` from the `useMemo` dependency array on line 100:
```typescript
// BEFORE
}, [graph, searchQuery, hiddenClusterIds, minCitations, yearRange, selectedFocusAreas, clusterThemeMap])
```
```typescript
// AFTER
}, [graph, searchQuery, hiddenClusterIds, minCitations, yearRange, selectedFocusAreas])
```

- [ ] **Step 3: Update the node color callback (lines 126–127)**

```typescript
// BEFORE
const theme = clusterThemeMap.get(p.clusterId) ?? 'Other'
const themeColor = focusAreaColors[theme] ?? '#6B7280'
```
```typescript
// AFTER
const theme = CLUSTER_LABEL_TO_THEME[p.focusArea] ?? 'Other'
const themeColor = focusAreaColors[theme] ?? '#6B7280'
```

Also remove `clusterThemeMap` from the `useCallback` dependency array (line 141):
```typescript
// BEFORE
}, [highlightedPath, coauthorPath, selectedPaper, citesIds, citedByIds, selectedAuthorId, selectedCluster, focusAreaColors, clusterThemeMap])
```
```typescript
// AFTER
}, [highlightedPath, coauthorPath, selectedPaper, citesIds, citedByIds, selectedAuthorId, selectedCluster, focusAreaColors])
```

- [ ] **Step 4: Run tests — confirm no regressions**

Run: `npm test`
Expected: all 125 tests pass (no regressions — no CitationGraph canvas tests exist)

- [ ] **Step 5: Commit**

```bash
git add src/components/CitationGraph.tsx
git commit -m "feat: color graph nodes by paper's own focusArea instead of cluster theme"
```

---

## Chunk 2: K-means embedding-based clustering

### Task 2: Rewrite detectClusters.ts and update pipeline

**Files:**
- Modify: `scripts/detectClusters.ts` — replace Louvain with k-means on embeddings
- Modify: `data/config.json` — add `clusterCount` field
- Modify: `package.json` — add `ml-kmeans` dependency, reorder pipeline script
- Create: `tests/scripts/detectClusters.test.ts`

- [ ] **Step 1: Install ml-kmeans**

Run: `npm install ml-kmeans`
Expected: `ml-kmeans` appears in `package.json` dependencies.

- [ ] **Step 2: Add `clusterCount` to data/config.json**

The current `data/config.json` has keys `institutionName`, `excludedAuthorIds`, and `conceptColors`. Add `clusterCount`:

```json
{
  "institutionName": "Stockholm Resilience Centre",
  "excludedAuthorIds": ["A5063021701"],
  "clusterCount": 15,
  "conceptColors": {
    ...existing entries...
  }
}
```

- [ ] **Step 3: Write failing tests**

Create `tests/scripts/detectClusters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { detectAndAnnotate } from '../../scripts/detectClusters'
import type { GraphData } from '../../src/lib/types'

function makeGraph(nodeCount: number): GraphData {
  return {
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: `W${i}`,
      title: `Paper ${i}`,
      year: 2020,
      authors: [],
      focusArea: 'Environmental science',
      tldr: '',
      clusterId: -1,
      citationCount: 0,
    })),
    edges: [],
    clusters: [],
    generatedAt: '2024-01-01T00:00:00Z',
  }
}

// 10 papers: 5 near [1,0] and 5 near [0,1] — should form 2 clear clusters
function makeTwoGroupEmbeddings(graph: GraphData): Record<string, number[]> {
  const embs: Record<string, number[]> = {}
  graph.nodes.forEach((n, i) => {
    embs[n.id] = i < 5 ? [1 + i * 0.01, 0] : [0, 1 + (i - 5) * 0.01]
  })
  return embs
}

describe('detectAndAnnotate (k-means)', () => {
  it('assigns a clusterId to every paper that has an embedding', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    const result = detectAndAnnotate(graph, embeddings, 2)
    const assigned = result.nodes.filter(n => n.clusterId !== -1)
    expect(assigned).toHaveLength(10)
  })

  it('papers with no embedding get clusterId -1', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    // Remove embedding for W0
    delete embeddings['W0']
    const result = detectAndAnnotate(graph, embeddings, 2)
    expect(result.nodes.find(n => n.id === 'W0')!.clusterId).toBe(-1)
  })

  it('papers near [1,0] and papers near [0,1] land in different clusters', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    const result = detectAndAnnotate(graph, embeddings, 2)
    const group1 = result.nodes.slice(0, 5).map(n => n.clusterId)
    const group2 = result.nodes.slice(5, 10).map(n => n.clusterId)
    // All in group1 should share a cluster, all in group2 should share a different cluster
    expect(new Set(group1).size).toBe(1)
    expect(new Set(group2).size).toBe(1)
    expect(group1[0]).not.toBe(group2[0])
  })

  it('clusters smaller than MIN_CLUSTER_SIZE collapse to clusterId -1', () => {
    // 20 papers: 15 near [1,0] and 5 near [0,1] — 5 papers form a cluster exactly at MIN_CLUSTER_SIZE=5
    // Use k=3 so one cluster is tiny (1 paper) and should collapse
    const graph = makeGraph(21)
    const embs: Record<string, number[]> = {}
    graph.nodes.forEach((n, i) => {
      if (i < 15) embs[n.id] = [1, 0]
      else if (i < 20) embs[n.id] = [0, 1]
      else embs[n.id] = [5, 5] // 1 isolated paper → tiny cluster
    })
    const result = detectAndAnnotate(graph, embs, 3)
    // The isolated paper (W20) should be in clusterId -1
    expect(result.nodes.find(n => n.id === 'W20')!.clusterId).toBe(-1)
  })

  it('returns cluster objects covering all non-isolated papers', () => {
    const graph = makeGraph(10)
    const embeddings = makeTwoGroupEmbeddings(graph)
    const result = detectAndAnnotate(graph, embeddings, 2)
    const coveredIds = new Set(result.clusters.flatMap(c => c.paperIds))
    result.nodes
      .filter(n => n.clusterId !== -1)
      .forEach(n => expect(coveredIds.has(n.id)).toBe(true))
  })
})
```

- [ ] **Step 4: Run tests to confirm they fail**

Run: `npm test -- tests/scripts/detectClusters.test.ts`
Expected: FAIL — `detectAndAnnotate` has wrong signature (no embeddings/k params yet)

- [ ] **Step 5: Rewrite detectClusters.ts**

Replace the entire file content of `scripts/detectClusters.ts`:

```typescript
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
 * @param graph     GraphData with nodes/edges (clusters will be replaced)
 * @param embeddings  Optional: paperId → float[] map. If omitted, loaded from public/data/embeddings.json.
 * @param k         Optional: number of clusters. If omitted, read from config (default 15).
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
```

- [ ] **Step 6: Run tests to confirm they pass**

Run: `npm test -- tests/scripts/detectClusters.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 7: Reorder pipeline in package.json**

Change the `pipeline` script:
```json
// BEFORE
"pipeline": "npm run fetch-data && npm run detect-clusters && npm run summarize-clusters && npm run embed-papers"

// AFTER
"pipeline": "npm run fetch-data && npm run embed-papers && npm run detect-clusters && npm run summarize-clusters"
```

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: all tests pass (no regressions)

- [ ] **Step 9: Commit**

```bash
git add scripts/detectClusters.ts tests/scripts/detectClusters.test.ts data/config.json package.json package-lock.json
git commit -m "feat: replace Louvain clustering with k-means on paper embeddings"
```

---

## After both tasks: re-run the pipeline

After both commits, the user must re-run the pipeline to apply the new clustering to `graph.json`:

```powershell
npm run embed-papers; npm run detect-clusters; npm run summarize-clusters; git add public/data/graph.json; git commit -m "data: re-cluster with k-means embeddings"; git push origin main
```

(`embed-papers` is resumable — skips already-embedded papers.)

**Note on `summarize-clusters`:** Because k-means produces new cluster IDs and blank summaries on every re-run, `summarize-clusters` will regenerate all cluster summaries each time `detect-clusters` is re-run. This is expected and unavoidable — the cost is one Claude API call per cluster (~15 calls). Future tuning of `k` in `config.json` will always require a full re-summarization.
