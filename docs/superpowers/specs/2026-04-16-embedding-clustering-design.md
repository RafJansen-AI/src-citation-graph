# Embedding-Based Clustering & Per-Paper Node Coloring — Design

## Goal

Fix two related visual problems:
1. Node colors reflect citation community membership instead of each paper's own research topic.
2. Sidebar clusters group papers by citation topology (Louvain), producing semantically illogical groupings.

## Solution

- **Node color** = paper's own `focusArea` → SRC theme → color (independent of cluster).
- **Sidebar clusters** = k-means on paper embeddings (content-based), replacing Louvain.

---

## Section 1: Node Coloring

**Current:** `CitationGraph.tsx` colors nodes via `clusterThemeMap.get(paper.clusterId)` → `SRC_THEME_COLORS` (lines 126–127). The theme filter at line 92 also uses `clusterThemeMap.get(n.clusterId)`.

**New:** Both the color and the filter use the paper's own `focusArea` (an OpenAlex concept string like `"Environmental science"`) via `CLUSTER_LABEL_TO_THEME`:
```typescript
// node color (line 126–127)
const theme = CLUSTER_LABEL_TO_THEME[p.focusArea] ?? 'Other'
const themeColor = focusAreaColors[theme] ?? '#6B7280'

// theme filter (line 92)
nodes = nodes.filter(n => selectedThemes.has(CLUSTER_LABEL_TO_THEME[n.focusArea] ?? 'Other'))
```

`CLUSTER_LABEL_TO_THEME` must be imported in `CitationGraph.tsx`. Papers whose `focusArea` is not in the map show as grey (`'Other'`).

The sidebar cluster dots keep their cluster-based color (domain: distinguishing clusters from each other).

**File:** `src/components/CitationGraph.tsx` — node color (line 126) and theme filter (line 92).

---

## Section 2: Embedding-Based Clustering

**Current:** `scripts/detectClusters.ts` runs Louvain community detection on the citation graph.

**New:** Load `public/data/embeddings.json` (256-dim vectors, one per paper), run k-means, assign `clusterId` by nearest centroid.

- Library: `ml-kmeans` (pure JS, no native deps)
- Default k: 15, configurable as `clusterCount` in `data/config.json`
- Papers missing an embedding: assigned `clusterId: -1`
- `MIN_CLUSTER_SIZE: 5` retained — clusters smaller than 5 collapse to `clusterId: -1`
- Cluster label: dominant `focusArea` of papers in cluster (unchanged)
- Cluster summary: Claude narrative via `summarizeClusters` (unchanged)

---

## Section 3: Pipeline Reorder

Embeddings must exist before cluster detection runs.

**Current order:**
```
fetch-data → detect-clusters → summarize-clusters → embed-papers
```

**New order:**
```
fetch-data → embed-papers → detect-clusters → summarize-clusters
```

Update the `pipeline` script in `package.json`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/CitationGraph.tsx` | Color nodes by own `focusArea`, update theme filter |
| `scripts/detectClusters.ts` | Replace Louvain with k-means on embeddings; read `clusterCount` from config |
| `package.json` | Reorder pipeline script; add `ml-kmeans` to dependencies |
| `data/config.json` | Add `clusterCount` field (default: 15) |

## Files Unchanged

- `scripts/embedPapers.ts` — no change needed
- `scripts/summarizeClusters.ts` — no change needed
- `src/lib/srcThemes.ts` — `CLUSTER_LABEL_TO_THEME` and `SRC_THEME_COLORS` used as-is
- `src/components/ClusterPanel.tsx` — cluster sidebar logic unchanged

---

## Testing

- Unit tests for the new `detectAndAnnotate` in `tests/scripts/detectClusters.test.ts` — verify k-means assignment, fallback for missing embeddings, MIN_CLUSTER_SIZE collapse.
- Visual verification: re-run pipeline, confirm "A safe operating space" node is green (Planetary Boundaries), check sidebar clusters are semantically coherent.
