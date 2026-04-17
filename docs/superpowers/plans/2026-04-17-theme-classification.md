# Theme Classification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assign each paper an `srcTheme` field by cosine-similarity against embedded SRC theme descriptions, replacing the crude 8-entry `CLUSTER_LABEL_TO_THEME` lookup.

**Architecture:** A new pipeline script `classifyThemes.ts` exports a pure `classifyPapers()` function (testable, no API) and a `main()` that fetches theme embeddings (~7 Gemini calls) then annotates `graph.json`. The UI reads `paper.srcTheme` directly instead of mapping `focusArea` through a lookup table. Pipeline order: `fetch-data → embed-papers → classify-themes → detect-clusters → summarize-clusters`.

**Tech Stack:** TypeScript, `@google/generative-ai` (already installed), Vitest

---

## Chunk 1: Script, types, and pipeline

### Task 1: Add `srcTheme` field to Paper type

**Files:**
- Modify: `src/lib/types.ts:7-21`

No test needed — pure type addition, verified by TypeScript compile.

- [ ] **Step 1: Add `srcTheme?: string` to the Paper interface**

In `src/lib/types.ts`, after the `pages?: string` line, add:

```typescript
// BEFORE (line 20):
  pages?: string
}
```
```typescript
// AFTER:
  pages?: string
  srcTheme?: string   // SRC theme assigned by classifyThemes.ts; undefined until that step runs
}
```

- [ ] **Step 2: Confirm TypeScript is happy**

Run: `npm run build 2>&1 | head -20`
Expected: no new errors (srcTheme is optional so existing code compiles unchanged)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add srcTheme field to Paper type"
```

---

### Task 2: Write failing tests for classifyPapers

**Files:**
- Create: `tests/scripts/classifyThemes.test.ts`

- [ ] **Step 1: Create the test file**

Create `tests/scripts/classifyThemes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { classifyPapers } from '../../scripts/classifyThemes'
import type { Paper } from '../../src/lib/types'

function makePaper(id: string, overrides: Partial<Paper> = {}): Paper {
  return {
    id, title: `Paper ${id}`, year: 2020, authors: [],
    focusArea: 'Biology', tldr: '', clusterId: -1, ...overrides,
  }
}

// 2D theme embeddings — keep tests fast and deterministic
const THEME_EMBS: Record<string, number[]> = {
  'Planetary Boundaries': [1, 0],
  'Biodiversity & Ecosystems': [0, 1],
}

describe('classifyPapers', () => {
  it('assigns the nearest theme by cosine similarity', () => {
    const papers = [makePaper('A'), makePaper('B')]
    const embeddings: Record<string, number[]> = {
      A: [0.99, 0.01],  // near Planetary Boundaries
      B: [0.01, 0.99],  // near Biodiversity & Ecosystems
    }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    expect(result.find(p => p.id === 'A')!.srcTheme).toBe('Planetary Boundaries')
    expect(result.find(p => p.id === 'B')!.srcTheme).toBe('Biodiversity & Ecosystems')
  })

  it('papers without an embedding get srcTheme Other', () => {
    const papers = [makePaper('A')]
    const result = classifyPapers(papers, {}, THEME_EMBS)
    expect(result.find(p => p.id === 'A')!.srcTheme).toBe('Other')
  })

  it('skips papers that already have srcTheme set (resumable)', () => {
    const papers = [makePaper('A', { srcTheme: 'Health & Wellbeing' })]
    const embeddings: Record<string, number[]> = { A: [0.99, 0.01] }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    // Existing srcTheme must NOT be overwritten
    expect(result.find(p => p.id === 'A')!.srcTheme).toBe('Health & Wellbeing')
  })

  it('returns all papers including those without embeddings', () => {
    const papers = [makePaper('A'), makePaper('B'), makePaper('C')]
    const embeddings: Record<string, number[]> = { A: [1, 0] }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    expect(result).toHaveLength(3)
  })

  it('always returns a valid theme name from the provided theme embeddings', () => {
    const papers = [makePaper('A')]
    const embeddings: Record<string, number[]> = { A: [1, 1] }
    const result = classifyPapers(papers, embeddings, THEME_EMBS)
    expect(Object.keys(THEME_EMBS)).toContain(result[0].srcTheme)
  })
})
```

- [ ] **Step 2: Run tests to confirm they FAIL**

Run: `npm test -- tests/scripts/classifyThemes.test.ts`
Expected: FAIL — `classifyPapers` is not defined

---

### Task 3: Implement classifyThemes.ts

**Files:**
- Create: `scripts/classifyThemes.ts`

- [ ] **Step 1: Create the script**

Create `scripts/classifyThemes.ts`:

```typescript
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GraphData, Paper } from '../src/lib/types'

const THEMES: Record<string, string> = {
  'Planetary Boundaries':
    'Earth system processes, planetary boundaries, climate change, biosphere integrity, biogeochemical flows, land-system change, global tipping points',
  'Biodiversity & Ecosystems':
    'Biodiversity conservation, ecosystem services, species loss, habitat degradation, marine and terrestrial ecology, nature-based solutions',
  'Social-Ecological Systems':
    'Social-ecological systems, resilience thinking, adaptive management, coupled human-nature systems, transformation, panarchy',
  'Complexity & Modelling':
    'Complex adaptive systems, agent-based modelling, systems thinking, network analysis, computational modelling, scenario analysis',
  'Sustainability Governance':
    'Sustainability governance, institutions, environmental policy, corporate sustainability, international agreements, environmental law, polycentric governance',
  'Health & Wellbeing':
    'Human health, wellbeing, food security, water security, disease, public health, nutrition, mental health',
  'Other':
    'Interdisciplinary or unclassified research',
}

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

// Must match DIMENSIONS in embedPapers.ts — paper embeddings are truncated to 256
const DIMENSIONS = 256

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

  const toClassify = graph.nodes.filter(n => !n.srcTheme)
  console.log(`Classifying ${toClassify.length} papers (${graph.nodes.length - toClassify.length} already done)…`)

  if (toClassify.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // Embed the 7 theme descriptions (~7 API calls)
  console.log('Embedding theme descriptions…')
  const themeEmbeddings: Record<string, number[]> = {}
  for (const [theme, description] of Object.entries(THEMES)) {
    process.stdout.write(`  ${theme}…`)
    themeEmbeddings[theme] = await embedText(model, description)
    process.stdout.write(' done\n')
  }

  const classified = classifyPapers(graph.nodes, embeddings, themeEmbeddings)

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

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run tests to confirm they PASS**

Run: `npm test -- tests/scripts/classifyThemes.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 3: Run full test suite — confirm no regressions**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add scripts/classifyThemes.ts tests/scripts/classifyThemes.test.ts
git commit -m "feat: add classifyThemes script — assign srcTheme by cosine similarity"
```

---

### Task 4: Update package.json — add script and reorder pipeline

**Files:**
- Modify: `package.json:14-17`

- [ ] **Step 1: Add classify-themes script and update pipeline**

In `package.json`, update the `scripts` block:

```json
// BEFORE
"embed-papers": "tsx --env-file=.env scripts/embedPapers.ts",
"pipeline": "npm run fetch-data && npm run embed-papers && npm run detect-clusters && npm run summarize-clusters"
```
```json
// AFTER (--env-file=.env matches the embed-papers pattern — classifyThemes needs GOOGLE_API_KEY)
"embed-papers": "tsx --env-file=.env scripts/embedPapers.ts",
"classify-themes": "tsx --env-file=.env scripts/classifyThemes.ts",
"pipeline": "npm run fetch-data && npm run embed-papers && npm run classify-themes && npm run detect-clusters && npm run summarize-clusters"
```

- [ ] **Step 2: Confirm no test regressions**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add classify-themes pipeline step"
```

---

## Chunk 2: Update UI to read srcTheme

**Prerequisite:** `srcTheme?: string` must be on the Paper type (done in Chunk 1, Task 1).

**Note on `CLUSTER_LABEL_TO_THEME` in `srcThemes.ts`:** This map is NOT removed. It is still used internally by `buildClusterThemeMap` (which `ClusterPanel.tsx` calls for sidebar cluster dot colors). We only stop importing it in the consumer files that previously used it for node coloring and paper detail subtitles.

### Task 5: Update CitationGraph.tsx — use paper.srcTheme

**Files:**
- Modify: `src/components/CitationGraph.tsx:5,87,121`

Canvas rendering cannot be unit-tested in jsdom. Correctness is verified by the full test suite (no regressions) and visual inspection after `npm run dev`.

- [ ] **Step 1: Remove CLUSTER_LABEL_TO_THEME import and update usages**

**Line 5** — change the import:
```typescript
// BEFORE
import { CLUSTER_LABEL_TO_THEME } from '../lib/srcThemes'
```
```typescript
// AFTER — no srcThemes import needed in CitationGraph anymore
```
(Delete the import line entirely.)

**Line 87** — update the theme filter:
```typescript
// BEFORE
      nodes = nodes.filter(n => selectedThemes.has(CLUSTER_LABEL_TO_THEME[n.focusArea] ?? 'Other'))
```
```typescript
// AFTER
      nodes = nodes.filter(n => selectedThemes.has(n.srcTheme ?? 'Other'))
```

**Line 121** — update the node color:
```typescript
// BEFORE
    const srcTheme = CLUSTER_LABEL_TO_THEME[p.focusArea] ?? 'Other'
```
```typescript
// AFTER
    const srcTheme = p.srcTheme ?? 'Other'
```

- [ ] **Step 2: Run tests — confirm no regressions**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/CitationGraph.tsx
git commit -m "feat: color graph nodes by srcTheme instead of focusArea lookup"
```

---

### Task 6: Update ClusterPanel.tsx — paper detail subtitle

**Files:**
- Modify: `src/components/ClusterPanel.tsx:4,46`

The paper detail view (line 46) currently shows `CLUSTER_LABEL_TO_THEME[selectedPaper.focusArea]` as the paper's theme. Switch to `srcTheme`.

Note: `buildClusterThemeMap` is still imported and used for sidebar cluster dot colors (those remain cluster-derived). Only the paper detail subtitle changes.

- [ ] **Step 1: Update import and paper detail subtitle**

**Line 4** — remove `CLUSTER_LABEL_TO_THEME` from the import:
```typescript
// BEFORE
import { buildClusterThemeMap, CLUSTER_LABEL_TO_THEME, SRC_THEME_COLORS } from '../lib/srcThemes'
```
```typescript
// AFTER
import { buildClusterThemeMap, SRC_THEME_COLORS } from '../lib/srcThemes'
```

**Line 46** — update the paper detail subtitle:
```typescript
// BEFORE
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{selectedPaper.year} · {CLUSTER_LABEL_TO_THEME[selectedPaper.focusArea] ?? selectedPaper.focusArea}</p>
```
```typescript
// AFTER
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{selectedPaper.year} · {selectedPaper.srcTheme ?? selectedPaper.focusArea}</p>
```

- [ ] **Step 2: Run tests — confirm no regressions**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/ClusterPanel.tsx
git commit -m "feat: show paper srcTheme in detail panel instead of focusArea lookup"
```

---

## After all tasks: re-run the pipeline

Re-classify existing papers and push:

```powershell
npm run classify-themes; git add public/data/graph.json; git commit -m "data: classify paper themes by embedding similarity"; git push origin main
```

(`classify-themes` is resumable — skips papers that already have `srcTheme` set. On first run it classifies all ~2500 papers.)

**Visual check:** Open `npm run dev`, confirm "A safe operating space" is green (Planetary Boundaries), and Business-tagged sustainability papers no longer show as grey.
