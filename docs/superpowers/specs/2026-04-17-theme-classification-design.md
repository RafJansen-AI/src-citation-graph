# Theme Classification — Design

## Goal

Replace the crude `CLUSTER_LABEL_TO_THEME` lookup table (8 OpenAlex concept mappings) with an embedding-similarity classifier that assigns each paper to one of 6 SRC themes + Other based on title and abstract content.

---

## Section 1: Data Model + New Script

A new pipeline step `scripts/classifyThemes.ts` runs after `embed-papers`. It:
1. Loads `public/data/embeddings.json` (all paper vectors, already generated)
2. Embeds 7 theme descriptions using `gemini-embedding-001` (~7 API calls)
3. For each paper, picks the theme with highest cosine similarity to the paper's embedding
4. Writes `srcTheme` directly onto each paper node in `graph.json`

A new field `srcTheme?: string` is added to the `Paper` type in `src/lib/types.ts`. Papers without an embedding get `srcTheme: 'Other'`.

The `CLUSTER_LABEL_TO_THEME` export in `srcThemes.ts` is removed — fully replaced by `srcTheme` on each paper.

---

## Section 2: Theme Descriptions

These strings are embedded as theme centroids:

| Theme | Description |
|-------|-------------|
| Planetary Boundaries | Earth system processes, planetary boundaries, climate change, biosphere integrity, biogeochemical flows, land-system change, global tipping points |
| Biodiversity & Ecosystems | Biodiversity conservation, ecosystem services, species loss, habitat degradation, marine and terrestrial ecology, nature-based solutions |
| Social-Ecological Systems | Social-ecological systems, resilience thinking, adaptive management, coupled human-nature systems, transformation, panarchy |
| Complexity & Modelling | Complex adaptive systems, agent-based modelling, systems thinking, network analysis, computational modelling, scenario analysis |
| Sustainability Governance | Sustainability governance, institutions, environmental policy, corporate sustainability, international agreements, environmental law, polycentric governance |
| Health & Wellbeing | Human health, wellbeing, food security, water security, disease, public health, nutrition, mental health |
| Other | Interdisciplinary or unclassified research |

Descriptions live in `classifyThemes.ts` and can be tuned without code restructuring.

---

## Section 3: UI Changes

Two small edits in `CitationGraph.tsx`:
- Node color: `p.srcTheme ?? 'Other'` replaces `CLUSTER_LABEL_TO_THEME[p.focusArea] ?? 'Other'`
- Theme filter: `n.srcTheme ?? 'Other'` replaces `CLUSTER_LABEL_TO_THEME[n.focusArea] ?? 'Other'`

No changes to `ClusterPanel.tsx`, `SearchBar.tsx`, or `App.tsx`.

---

## Section 4: Pipeline Integration

New npm script:
```json
"classify-themes": "npx tsx scripts/classifyThemes.ts"
```

Updated pipeline order:
```
fetch-data → embed-papers → classify-themes → detect-clusters → summarize-clusters
```

`classify-themes` is resumable — papers that already have `srcTheme` set are skipped, so re-runs only classify new papers. The 7 theme embeddings are recomputed each run (negligible cost).

---

## Files Changed

| File | Change |
|------|--------|
| `scripts/classifyThemes.ts` | New — embeds theme descriptions, assigns srcTheme by cosine similarity |
| `src/lib/types.ts` | Add `srcTheme?: string` to Paper interface |
| `src/lib/srcThemes.ts` | Remove `CLUSTER_LABEL_TO_THEME` export |
| `src/components/CitationGraph.tsx` | Use `p.srcTheme` / `n.srcTheme` instead of `CLUSTER_LABEL_TO_THEME[...focusArea]` |
| `package.json` | Add `classify-themes` script; update `pipeline` script order |

## Files Unchanged

- `scripts/embedPapers.ts` — no change needed
- `scripts/detectClusters.ts` — no change needed
- `scripts/summarizeClusters.ts` — no change needed
- `src/components/ClusterPanel.tsx` — no change needed
- `src/lib/srcThemes.ts` (SRC_THEME_COLORS, SRC_THEMES) — kept as-is

---

## Testing

- Unit tests for cosine similarity helper
- Unit tests for `classifyThemes`: verify each paper gets a valid theme, papers without embeddings get 'Other', known clear-cut papers land in expected themes
- Visual verification: re-run pipeline, confirm "A safe operating space" paper is green (Planetary Boundaries), "Business"-tagged sustainability papers get correct theme
