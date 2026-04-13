# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the search input bug, consolidate concept colors, add cluster visibility toggles, and replace the citation path finder with a researcher/author search.

**Architecture:** Four independent UI changes that all touch `appStore.ts` (shared state) and specific components. Do them in order — each task is self-contained and the store changes accumulate. No pipeline re-run is needed.

**Tech Stack:** React 19, TypeScript, Zustand v5, Tailwind CSS v4, Vitest + React Testing Library. Run tests with `npm run test:run` from the project root `C:\Users\raja4291\OneDrive - Stockholm University\Documents\Claude Code\projects\src-citation-graph`.

---

## Codebase orientation

Key files (all under `src/`):

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root layout; computes `focusAreaColors`; renders all panels |
| `src/store/appStore.ts` | Zustand store — single source of UI state |
| `src/components/SearchBar.tsx` | Title/author filter input + concept legend |
| `src/components/PathFinder.tsx` | Citation path tool — **being replaced** |
| `src/components/CitationGraph.tsx` | ForceGraph2D canvas; reads store for highlighting |
| `src/components/ClusterPanel.tsx` | Right sidebar; cluster list / cluster detail / paper detail |
| `src/lib/types.ts` | `Paper`, `Cluster`, `GraphEdge`, `GraphData` interfaces |
| `data/config.json` | Institution name + concept→color map |

Tests live in `tests/` mirroring `src/`. Setup file: `tests/setup.ts` (imports `@testing-library/jest-dom`).

---

## Chunk 1: Foundational fixes

### Task 1: Fix search input debounce bug

**Problem:** `SearchBar` is a controlled input whose value lives in Zustand. Every keystroke triggers `CitationGraph` to re-render with 3 479 nodes, which is synchronous and heavy enough to cause the input to feel unresponsive and lose apparent focus.

**Fix:** Hold the input value in local React state; sync to the Zustand store with a 150 ms debounce so the graph only re-renders after the user pauses.

**Files:**
- Modify: `src/components/SearchBar.tsx`
- Test: `tests/components/SearchBar.test.tsx` (create)

---

- [ ] **Step 1.1 — Write the failing test**

Create `tests/components/SearchBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '../../src/components/SearchBar'
import { useAppStore } from '../../src/store/appStore'

// Fake timers must be scoped to beforeEach/afterEach so they don't leak into other test files
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); useAppStore.setState({ searchQuery: '' }) })

describe('SearchBar', () => {
  it('does not update the store on every keystroke', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SearchBar focusAreas={[]} focusAreaColors={{}} />)

    const input = screen.getByPlaceholderText('Filter papers or authors…')
    await user.type(input, 'abc')

    // Before debounce fires, store should still be empty
    expect(useAppStore.getState().searchQuery).toBe('')

    vi.runAllTimers()

    // After debounce fires, store should have the full string
    expect(useAppStore.getState().searchQuery).toBe('abc')
  })

  it('renders focus area legend entries', () => {
    render(
      <SearchBar
        focusAreas={['Environmental science', 'Other']}
        focusAreaColors={{ 'Environmental science': '#16A34A', 'Other': '#6B7280' }}
      />
    )
    expect(screen.getByText('Environmental science')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })
})
```

- [ ] **Step 1.2 — Run test to verify it fails**

```
npm run test:run -- --reporter=verbose tests/components/SearchBar.test.tsx
```

Expected: FAIL — store updates immediately on each character.

- [ ] **Step 1.3 — Implement debounce in SearchBar**

Replace `src/components/SearchBar.tsx` with:

```tsx
import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

interface Props {
  focusAreas: string[]
  focusAreaColors: Record<string, string>
}

export function SearchBar({ focusAreas, focusAreaColors }: Props) {
  const { setSearchQuery } = useAppStore()
  const [localQuery, setLocalQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localQuery), 150)
    return () => clearTimeout(t)
  }, [localQuery, setSearchQuery])

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-700 bg-gray-800">
      <input
        value={localQuery}
        onChange={e => setLocalQuery(e.target.value)}
        placeholder="Filter papers or authors…"
        className="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600 w-56"
      />
      <div className="flex flex-wrap gap-3">
        {focusAreas.map(area => (
          <span key={area} className="flex items-center gap-1 text-xs text-gray-300">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: focusAreaColors[area] }}
            />
            {area}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 1.4 — Run test to verify it passes**

```
npm run test:run -- --reporter=verbose tests/components/SearchBar.test.tsx
```

Expected: PASS (both tests green).

- [ ] **Step 1.5 — Run full test suite**

```
npm run test:run
```

Expected: all 30+ tests pass.

- [ ] **Step 1.6 — Commit**

```bash
git add src/components/SearchBar.tsx tests/components/SearchBar.test.tsx
git commit -m "fix: debounce search input to prevent per-keystroke graph re-renders"
```

---

### Task 2: Consolidate concept colors

**Problem:** Many SRC papers have non-SRC focus areas (Mathematics, History, Geology, Chemistry, etc.) — each gets its own colour slot, creating visual noise. The legend and graph have too many colours.

**Fix:** Add a `resolveConceptColor` utility that returns a colour only for known SRC-relevant concepts; everything else maps to the single `"Other"` grey (`#6B7280`). Update `App.tsx` to use it so the legend stays clean.

**Files:**
- Create: `src/lib/conceptColors.ts`
- Modify: `src/App.tsx` (colour computation block)
- Test: `tests/lib/conceptColors.test.ts` (create)

The canonical SRC concepts and their colours come from `data/config.json` (already has `Environmental science`, `Ecology`, `Political science`, `Economics`, `Sociology`, `Geography`, `Biology`, `Medicine`, `Computer science`, `Psychology`, `Other`). We add `Business` as an alias for the common OpenAlex L0 label that covers management/sustainability papers.

---

- [ ] **Step 2.1 — Write the failing test**

Create `tests/lib/conceptColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveConceptColor, SRC_CONCEPTS } from '../../src/lib/conceptColors'

const COLORS: Record<string, string> = {
  'Environmental science': '#16A34A',
  'Sociology': '#DB2777',
  'Other': '#6B7280',
}

describe('resolveConceptColor', () => {
  it('returns the mapped colour for SRC concepts', () => {
    expect(resolveConceptColor('Environmental science', COLORS)).toBe('#16A34A')
    expect(resolveConceptColor('Sociology', COLORS)).toBe('#DB2777')
  })

  it('returns Other colour for non-SRC concepts', () => {
    expect(resolveConceptColor('Mathematics', COLORS)).toBe('#6B7280')
    expect(resolveConceptColor('History', COLORS)).toBe('#6B7280')
    expect(resolveConceptColor('Geology', COLORS)).toBe('#6B7280')
  })

  it('SRC_CONCEPTS includes Business (common OpenAlex top-level for SRC papers)', () => {
    expect(SRC_CONCEPTS.has('Business')).toBe(true)
  })
})
```

- [ ] **Step 2.2 — Run test to verify it fails**

```
npm run test:run -- --reporter=verbose tests/lib/conceptColors.test.ts
```

Expected: FAIL — module does not exist yet.

- [ ] **Step 2.3 — Create `src/lib/conceptColors.ts`**

```ts
// Concepts that appear meaningfully in SRC research — everything else → "Other"
export const SRC_CONCEPTS = new Set([
  'Environmental science',
  'Ecology',
  'Geography',
  'Sociology',
  'Economics',
  'Political science',
  'Computer science',
  'Medicine',
  'Biology',
  'Psychology',
  'Business',  // OpenAlex L0 label for sustainability governance, management, etc.
])

const OTHER_COLOR = '#6B7280'

/**
 * Returns the display colour for a focus area concept.
 * Non-SRC concepts all get the neutral "Other" grey so the legend stays readable.
 */
export function resolveConceptColor(
  concept: string,
  conceptColors: Record<string, string>,
): string {
  if (SRC_CONCEPTS.has(concept)) {
    return conceptColors[concept] ?? conceptColors['Other'] ?? OTHER_COLOR
  }
  return conceptColors['Other'] ?? OTHER_COLOR
}
```

- [ ] **Step 2.4 — Run test to verify it passes**

```
npm run test:run -- --reporter=verbose tests/lib/conceptColors.test.ts
```

Expected: PASS.

- [ ] **Step 2.5 — Update `src/App.tsx` to use `resolveConceptColor`**

Replace the `focusAreaColors` computation block in `App.tsx` (lines 25–31) with:

```tsx
import { resolveConceptColor, SRC_CONCEPTS } from './lib/conceptColors'

// inside the component, after the error/loading guards:

// Load concept→colour map from cluster data
const clusterConceptColor: Record<string, string> = {}
data.clusters.forEach(c => {
  // Strip disambiguation suffix like " (2)" to get the base concept name
  const base = c.label.replace(/ \(\d+\)$/, '')
  if (!clusterConceptColor[base]) clusterConceptColor[base] = c.color
})

// Build the node colour map: SRC concepts get their colour, everything else → Other
const configColors: Record<string, string> = {}  // populated from cluster dominant colors
data.clusters.forEach(c => {
  const base = c.label.replace(/ \(\d+\)$/, '')
  if (!configColors[base]) configColors[base] = c.color
})
configColors['Other'] = '#6B7280'

const focusAreaColors: Record<string, string> = {}
// Collect all unique focus areas and resolve their display colour
const allAreas = new Set(data.nodes.map(n => n.focusArea))
allAreas.forEach(area => {
  focusAreaColors[area] = resolveConceptColor(area, configColors)
})

// Legend only shows SRC concepts that actually appear in the data
const legendAreas = [...allAreas]
  .filter(a => SRC_CONCEPTS.has(a))
  .sort()
if (allAreas.size > SRC_CONCEPTS.size) legendAreas.push('Other')
```

**Step 2.5 actual diff** — only update the colour computation in App.tsx; leave the PathFinder→ResearcherSearch swap for Task 4. Minimal diff:

```tsx
// Add import at top of App.tsx
import { resolveConceptColor, SRC_CONCEPTS } from './lib/conceptColors'

// Replace lines 25–31 (the focusAreaColors block) with:
const configColors: Record<string, string> = { 'Other': '#6B7280' }
data.clusters.forEach(c => {
  const base = c.label.replace(/ \(\d+\)$/, '')
  if (!configColors[base]) configColors[base] = c.color
})

const focusAreaColors: Record<string, string> = {}
const allAreas = new Set(data.nodes.map(n => n.focusArea))
allAreas.forEach(area => {
  focusAreaColors[area] = resolveConceptColor(area, configColors)
})
focusAreaColors['Other'] = '#6B7280'

const legendAreas = [...allAreas].filter(a => SRC_CONCEPTS.has(a)).sort()
if ([...allAreas].some(a => !SRC_CONCEPTS.has(a))) legendAreas.push('Other')

// Update the SearchBar call:
<SearchBar focusAreas={legendAreas} focusAreaColors={focusAreaColors} />
```

- [ ] **Step 2.6 — Run full test suite**

```
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 2.7 — Commit**

```bash
git add src/lib/conceptColors.ts tests/lib/conceptColors.test.ts src/App.tsx
git commit -m "feat: consolidate non-SRC concept colours into Other grey"
```

---

## Chunk 2: Interactive features

### Task 3: Cluster visibility toggle

**Goal:** Each cluster in the sidebar list gets a show/hide eye-icon button. Hidden clusters disappear from the graph canvas. Multiple clusters can be active simultaneously — e.g. "Business" only, or "Business + Environmental science".

**Files:**
- Modify: `src/store/appStore.ts` — add `hiddenClusterIds`, `toggleClusterVisibility`
- Modify: `src/components/ClusterPanel.tsx` — toggle button per cluster
- Modify: `src/components/CitationGraph.tsx` — filter out hidden-cluster nodes + edges
- Test: `tests/components/ClusterPanel.test.tsx` — extend existing test
- Test: `tests/components/CitationGraph.test.tsx` — extend existing test

---

- [ ] **Step 3.1 — Write failing tests**

Add to `tests/components/ClusterPanel.test.tsx` (append after existing tests):

```tsx
import userEvent from '@testing-library/user-event'

it('renders a toggle button for each cluster', () => {
  render(<ClusterPanel graph={mockGraph} />)
  // Each cluster row should have a toggle button
  expect(screen.getAllByRole('button', { name: /hide|show/i })).toHaveLength(1)
})

it('calls toggleClusterVisibility when toggle button clicked', async () => {
  const user = userEvent.setup()
  render(<ClusterPanel graph={mockGraph} />)
  const toggleBtn = screen.getByRole('button', { name: /hide/i })
  await user.click(toggleBtn)
  expect(useAppStore.getState().hiddenClusterIds).toContain(0)
})
```

Add to `tests/components/CitationGraph.test.tsx` (append after existing test):

```tsx
it('filters out nodes from hidden clusters', () => {
  useAppStore.setState({ hiddenClusterIds: [0] })
  render(<CitationGraph graph={mockGraph} focusAreaColors={{}} />)
  // The node in cluster 0 should not be in the graph data passed to ForceGraph2D
  const graphEl = screen.getByTestId('force-graph')
  expect(graphEl).toHaveAttribute('data-nodecount', '0')
})
```

Don't forget to add `beforeEach(() => { useAppStore.setState({ hiddenClusterIds: [] }) })` to the CitationGraph test file's beforeEach (or add it at the top of the new test).

- [ ] **Step 3.2 — Run tests to verify they fail**

```
npm run test:run -- --reporter=verbose tests/components/ClusterPanel.test.tsx tests/components/CitationGraph.test.tsx
```

Expected: FAIL — `hiddenClusterIds` not in store, no toggle buttons.

- [ ] **Step 3.3 — Update `src/store/appStore.ts`**

```ts
import { create } from 'zustand'
import type { Paper, Cluster } from '../lib/types'

interface AppState {
  selectedPaper: Paper | null
  selectedCluster: Cluster | null
  searchQuery: string
  highlightedPath: string[]
  hiddenClusterIds: number[]
  selectedAuthorId: string | null

  setSelectedPaper: (p: Paper | null) => void
  setSelectedCluster: (c: Cluster | null) => void
  setSearchQuery: (q: string) => void
  setHighlightedPath: (path: string[]) => void
  toggleClusterVisibility: (id: number) => void
  setSelectedAuthorId: (id: string | null) => void
}

export const useAppStore = create<AppState>(set => ({
  selectedPaper: null,
  selectedCluster: null,
  searchQuery: '',
  highlightedPath: [],
  hiddenClusterIds: [],
  selectedAuthorId: null,

  setSelectedPaper: p => set({ selectedPaper: p }),
  setSelectedCluster: c => set({ selectedCluster: c }),
  setSearchQuery: q => set({ searchQuery: q }),
  setHighlightedPath: path => set({ highlightedPath: path }),
  toggleClusterVisibility: id =>
    set(s => ({
      hiddenClusterIds: s.hiddenClusterIds.includes(id)
        ? s.hiddenClusterIds.filter(x => x !== id)
        : [...s.hiddenClusterIds, id],
    })),
  // Selecting an author clears any stale highlighted path (path highlight takes priority in nodeColor)
  setSelectedAuthorId: id => set({ selectedAuthorId: id, highlightedPath: [] }),
}))
```

(`selectedAuthorId` added here too since Task 4 needs it — no harm adding it early.)

- [ ] **Step 3.4 — Update `src/components/ClusterPanel.tsx`**

Add the toggle button to the cluster list item. Only change the cluster list `<li>` content (the `return` at the bottom of `ClusterPanel`):

```tsx
import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'

export function ClusterPanel({ graph }: { graph: GraphData }) {
  const {
    selectedPaper, selectedCluster,
    setSelectedPaper, setSelectedCluster,
    hiddenClusterIds, toggleClusterVisibility,
  } = useAppStore()

  // ... (paper detail and cluster detail views unchanged) ...

  // Cluster list view — replace the existing <ul> block:
  return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <h2 className="font-semibold text-white mb-3 text-sm">Research Clusters</h2>
      <ul className="space-y-2">
        {graph.clusters
          .slice()
          .sort((a, b) => b.paperIds.length - a.paperIds.length)
          .map(c => {
            const hidden = hiddenClusterIds.includes(c.id)
            return (
              <li
                key={c.id}
                className={`p-3 rounded border border-gray-700 ${hidden ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <button
                    onClick={() => setSelectedCluster(c)}
                    className="text-sm font-medium text-white text-left hover:underline flex-1 truncate"
                  >
                    {c.label}
                  </button>
                  <span className="text-xs text-gray-400 shrink-0">{c.paperIds.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleClusterVisibility(c.id) }}
                    aria-label={hidden ? `Show ${c.label}` : `Hide ${c.label}`}
                    className="text-gray-500 hover:text-white text-xs ml-1 shrink-0"
                    title={hidden ? 'Show' : 'Hide'}
                  >
                    {hidden ? '◉' : '◎'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{c.summary}</p>
              </li>
            )
          })}
      </ul>
    </aside>
  )
}
```

The full component (keeping paper/cluster detail views intact):

```tsx
import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'

export function ClusterPanel({ graph }: { graph: GraphData }) {
  const {
    selectedPaper, selectedCluster,
    setSelectedPaper, setSelectedCluster,
    hiddenClusterIds, toggleClusterVisibility,
  } = useAppStore()

  if (selectedPaper) return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <button onClick={() => setSelectedPaper(null)} className="text-xs text-gray-400 hover:text-white mb-3">← Back</button>
      <h2 className="font-semibold text-white mb-1 text-sm leading-tight">{selectedPaper.title}</h2>
      <p className="text-gray-400 text-xs mb-2">{selectedPaper.year} · {selectedPaper.focusArea}</p>
      {selectedPaper.tldr && <p className="text-gray-300 text-sm mb-3">{selectedPaper.tldr}</p>}
      <p className="text-xs text-gray-400">Citations: {selectedPaper.citationCount ?? 0}</p>
      {selectedPaper.externalUrl && (
        <a href={selectedPaper.externalUrl} target="_blank" rel="noopener noreferrer"
           className="mt-3 block text-indigo-400 hover:text-indigo-300 text-xs">
          View on OpenAlex →
        </a>
      )}
    </aside>
  )

  if (selectedCluster) {
    const papers = graph.nodes.filter(n => selectedCluster.paperIds.includes(n.id))
    return (
      <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
        <button onClick={() => setSelectedCluster(null)} className="text-xs text-gray-400 hover:text-white mb-3">← All clusters</button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCluster.color }} />
          <h2 className="font-semibold text-white text-sm">{selectedCluster.label}</h2>
        </div>
        <p className="text-gray-300 text-sm mb-4">{selectedCluster.summary || 'No summary yet.'}</p>
        <p className="text-xs text-gray-500 mb-2">{papers.length} papers</p>
        <ul className="space-y-1">
          {papers.slice(0, 15).map(p => (
            <li key={p.id}
                onClick={() => setSelectedPaper(p)}
                className="cursor-pointer text-xs text-gray-300 hover:text-white p-2 rounded hover:bg-gray-700 leading-tight">
              {p.title} ({p.year})
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <h2 className="font-semibold text-white mb-3 text-sm">Research Clusters</h2>
      <ul className="space-y-2">
        {graph.clusters
          .slice()
          .sort((a, b) => b.paperIds.length - a.paperIds.length)
          .map(c => {
            const hidden = hiddenClusterIds.includes(c.id)
            return (
              <li key={c.id} className={`p-3 rounded border border-gray-700 ${hidden ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <button
                    onClick={() => setSelectedCluster(c)}
                    className="text-sm font-medium text-white text-left hover:underline flex-1 truncate"
                  >
                    {c.label}
                  </button>
                  <span className="text-xs text-gray-400 shrink-0">{c.paperIds.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleClusterVisibility(c.id) }}
                    aria-label={hidden ? `Show ${c.label}` : `Hide ${c.label}`}
                    className="text-gray-500 hover:text-white text-xs ml-1 shrink-0"
                    title={hidden ? 'Show' : 'Hide'}
                  >
                    {hidden ? '◉' : '◎'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{c.summary}</p>
              </li>
            )
          })}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 3.5 — Update `src/components/CitationGraph.tsx` to filter hidden clusters**

In the `filteredGraph` useMemo, add hidden-cluster filtering. Also update the mock test to expose `data-nodecount` for the new test:

```tsx
import { useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphData, Paper } from '../lib/types'
import { useAppStore } from '../store/appStore'

interface Props {
  graph: GraphData
  focusAreaColors: Record<string, string>
}

export function CitationGraph({ graph, focusAreaColors }: Props) {
  const { setSelectedPaper, highlightedPath, selectedCluster, searchQuery, hiddenClusterIds, selectedAuthorId } = useAppStore()

  const filteredGraph = useMemo(() => {
    let nodes = graph.nodes

    // Text search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matched = new Set(
        nodes
          .filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.authors.some(a => a.name.toLowerCase().includes(q))
          )
          .map(n => n.id)
      )
      nodes = nodes.filter(n => matched.has(n.id))
    }

    // Hidden cluster filter
    if (hiddenClusterIds.length > 0) {
      nodes = nodes.filter(n => !hiddenClusterIds.includes(n.clusterId))
    }

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = graph.edges.filter(
      e => nodeIds.has(e.source as string) && nodeIds.has(e.target as string)
    )
    return { nodes, links }
  }, [graph, searchQuery, hiddenClusterIds])

  const nodeColor = useCallback((node: any) => {
    const p = node as Paper
    if (highlightedPath.includes(p.id)) return '#FBBF24'
    // Author highlight: dim all non-author papers
    if (selectedAuthorId) {
      return p.authors.some(a => a.authorId === selectedAuthorId)
        ? (focusAreaColors[p.focusArea] ?? '#6B7280')
        : '#1F2937'
    }
    if (selectedCluster && !selectedCluster.paperIds.includes(p.id)) return '#374151'
    return focusAreaColors[p.focusArea] ?? '#6B7280'
  }, [highlightedPath, selectedAuthorId, selectedCluster, focusAreaColors])

  const nodeLabel = useCallback((node: any) => {
    const p = node as Paper
    return `${p.title} (${p.year})${p.tldr ? `\n${p.tldr}` : ''}`
  }, [])

  return (
    <ForceGraph2D
      graphData={filteredGraph}
      nodeId="id"
      nodeColor={nodeColor}
      nodeLabel={nodeLabel}
      nodeRelSize={4}
      linkColor={() => '#374151'}
      onNodeClick={(node: any) => setSelectedPaper(node as Paper)}
      backgroundColor="#111827"
    />
  )
}
```

- [ ] **Step 3.6 — Update CitationGraph test mock to forward nodecount properly**

In `tests/components/CitationGraph.test.tsx`, update the mock and add import/beforeEach:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CitationGraph } from '../../src/components/CitationGraph'
import { useAppStore } from '../../src/store/appStore'
import type { GraphData } from '../../src/lib/types'

vi.mock('react-force-graph-2d', () => ({
  default: ({ graphData }: any) => (
    <div data-testid="force-graph" data-nodecount={graphData.nodes.length} />
  ),
}))

const mockGraph: GraphData = {
  nodes: [{ id: 'p1', title: 'Test', year: 2020, authors: [], focusArea: 'AI',
            tldr: '', clusterId: 0, citationCount: 5 }],
  edges: [], clusters: [], generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  useAppStore.setState({ hiddenClusterIds: [], selectedAuthorId: null, searchQuery: '' })
})

describe('CitationGraph', () => {
  it('renders force graph with correct node count', () => {
    render(<CitationGraph graph={mockGraph} focusAreaColors={{}} />)
    expect(screen.getByTestId('force-graph')).toHaveAttribute('data-nodecount', '1')
  })

  it('filters out nodes from hidden clusters', () => {
    useAppStore.setState({ hiddenClusterIds: [0] })
    render(<CitationGraph graph={mockGraph} focusAreaColors={{}} />)
    expect(screen.getByTestId('force-graph')).toHaveAttribute('data-nodecount', '0')
  })
})
```

- [ ] **Step 3.7 — Run full test suite**

```
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 3.8 — Commit**

```bash
git add src/store/appStore.ts src/components/ClusterPanel.tsx src/components/CitationGraph.tsx tests/components/ClusterPanel.test.tsx tests/components/CitationGraph.test.tsx
git commit -m "feat: cluster visibility toggle (◎/◉) and per-author graph highlighting"
```

---

### Task 4: Replace PathFinder with Researcher / Author Search

**Goal:** Remove the citation-path finder. Replace with a search bar that finds researchers by name, then highlights their papers on the canvas and shows a cluster breakdown in the sidebar.

**UX flow:**
1. User types an author name → dropdown of matching authors
2. User selects an author → their papers are highlighted (bright), others dimmed
3. Sidebar switches to an "Author view": shows the author's paper count and which clusters their work spans
4. Clicking a cluster entry in the author view activates that cluster in the main panel
5. Clicking "×" or clearing the input resets everything

**Files:**
- Create: `src/components/ResearcherSearch.tsx`
- Delete: `src/components/PathFinder.tsx` (no longer used)
- Modify: `src/App.tsx` — swap `<PathFinder>` for `<ResearcherSearch>`, apply Chunk 1 colour fix
- Modify: `src/components/ClusterPanel.tsx` — add author-view rendering when `selectedAuthorId` is set
- Test: `tests/components/ResearcherSearch.test.tsx` (create)

---

- [ ] **Step 4.1 — Write failing tests**

Create `tests/components/ResearcherSearch.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResearcherSearch } from '../../src/components/ResearcherSearch'
import { useAppStore } from '../../src/store/appStore'
import type { GraphData } from '../../src/lib/types'

const mockGraph: GraphData = {
  nodes: [
    {
      id: 'p1', title: 'Planetary Boundaries', year: 2009,
      authors: [{ authorId: 'A1', name: 'Johan Rockström' }],
      focusArea: 'Environmental science', tldr: '', clusterId: 0, citationCount: 100,
    },
    {
      id: 'p2', title: 'Resilience Thinking', year: 2010,
      authors: [{ authorId: 'A1', name: 'Johan Rockström' }],
      focusArea: 'Environmental science', tldr: '', clusterId: 0, citationCount: 50,
    },
    {
      id: 'p3', title: 'Urban Governance', year: 2015,
      authors: [{ authorId: 'A2', name: 'Carl Folke' }],
      focusArea: 'Sociology', tldr: '', clusterId: 1, citationCount: 30,
    },
  ],
  edges: [],
  clusters: [
    { id: 0, label: 'Environmental science', summary: '', color: '#16A34A', paperIds: ['p1', 'p2'] },
    { id: 1, label: 'Sociology', summary: '', color: '#DB2777', paperIds: ['p3'] },
  ],
  generatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => { useAppStore.setState({ selectedAuthorId: null }) })

describe('ResearcherSearch', () => {
  it('renders the input', () => {
    render(<ResearcherSearch graph={mockGraph} />)
    expect(screen.getByPlaceholderText('Search researcher…')).toBeInTheDocument()
  })

  it('shows author suggestions after 2 characters', async () => {
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'Jo')
    expect(screen.getByText('Johan Rockström')).toBeInTheDocument()
  })

  it('does not show suggestions for 1 character', async () => {
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'J')
    expect(screen.queryByText('Johan Rockström')).not.toBeInTheDocument()
  })

  it('sets selectedAuthorId in store when author is clicked', async () => {
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'Jo')
    await user.click(screen.getByText('Johan Rockström'))
    expect(useAppStore.getState().selectedAuthorId).toBe('A1')
  })

  it('clears selectedAuthorId when × button is clicked after selecting', async () => {
    // Select an author first so query is populated and the × button appears
    const user = userEvent.setup()
    render(<ResearcherSearch graph={mockGraph} />)
    await user.type(screen.getByPlaceholderText('Search researcher…'), 'Jo')
    await user.click(screen.getByText('Johan Rockström'))
    expect(useAppStore.getState().selectedAuthorId).toBe('A1')

    // Now click the × clear button
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(useAppStore.getState().selectedAuthorId).toBeNull()
  })
})
```

- [ ] **Step 4.2 — Run test to verify it fails**

```
npm run test:run -- --reporter=verbose tests/components/ResearcherSearch.test.tsx
```

Expected: FAIL — component does not exist.

- [ ] **Step 4.3 — Create `src/components/ResearcherSearch.tsx`**

```tsx
import { useState, useMemo } from 'react'
import type { GraphData } from '../lib/types'
import { useAppStore } from '../store/appStore'

interface AuthorEntry {
  authorId: string
  name: string
  paperCount: number
}

export function ResearcherSearch({ graph }: { graph: GraphData }) {
  const { selectedAuthorId, setSelectedAuthorId } = useAppStore()
  const [query, setQuery] = useState('')

  // Deduplicate authors across all papers
  const authors = useMemo<AuthorEntry[]>(() => {
    const map = new Map<string, AuthorEntry>()
    for (const node of graph.nodes) {
      for (const a of node.authors) {
        const entry = map.get(a.authorId)
        if (entry) {
          entry.paperCount++
        } else {
          map.set(a.authorId, { authorId: a.authorId, name: a.name, paperCount: 1 })
        }
      }
    }
    return [...map.values()].sort((a, b) => b.paperCount - a.paperCount)
  }, [graph])

  const suggestions = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return authors.filter(a => a.name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, authors])

  const selectedAuthor = useMemo(
    () => selectedAuthorId ? authors.find(a => a.authorId === selectedAuthorId) : null,
    [selectedAuthorId, authors]
  )

  function selectAuthor(a: AuthorEntry) {
    setSelectedAuthorId(a.authorId)
    setQuery(a.name)
  }

  function clear() {
    setQuery('')
    setSelectedAuthorId(null)
  }

  return (
    <div className="px-4 py-2 border-b border-gray-700 bg-gray-900">
      <p className="text-xs font-semibold text-gray-300 mb-1">Researcher Explorer</p>
      <div className="flex gap-2 items-start">
        <div className="relative flex-1 max-w-xs">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value) setSelectedAuthorId(null) }}
            placeholder="Search researcher…"
            className="w-full bg-gray-700 text-white text-xs px-2 py-1.5 rounded border border-gray-600"
          />
          {suggestions.length > 0 && !selectedAuthorId && (
            <div className="absolute z-10 top-full left-0 right-0 mt-0.5 bg-gray-600 rounded shadow-lg">
              {suggestions.map(a => (
                <button
                  key={a.authorId}
                  onClick={() => selectAuthor(a)}
                  className="block w-full text-left text-xs px-3 py-1.5 hover:bg-gray-500 text-white truncate"
                >
                  {a.name}
                  <span className="ml-2 text-gray-400">{a.paperCount} papers</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedAuthorId && (
          <button
            onClick={clear}
            className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
          >
            ×
          </button>
        )}
        {selectedAuthor && (
          <span className="text-xs text-gray-400 self-center">
            {selectedAuthor.paperCount} papers highlighted
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4.4 — Run test to verify it passes**

```
npm run test:run -- --reporter=verbose tests/components/ResearcherSearch.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 4.5 — Write failing test for ClusterPanel author view**

Add to `tests/components/ClusterPanel.test.tsx` (append after existing tests):

```tsx
it('shows author cluster breakdown when selectedAuthorId is set', () => {
  useAppStore.setState({ selectedAuthorId: 'A_TEST' })
  const graphWithAuthor: GraphData = {
    ...mockGraph,
    nodes: [{
      ...mockGraph.nodes[0],
      authors: [{ authorId: 'A_TEST', name: 'Test Researcher' }],
      clusterId: 0,
    }],
  }
  render(<ClusterPanel graph={graphWithAuthor} />)
  expect(screen.getByText('Test Researcher')).toBeInTheDocument()
  expect(screen.getByText('1 papers in the network')).toBeInTheDocument()
  expect(screen.getByText('Cluster 1')).toBeInTheDocument()
})
```

Also update the `beforeEach` in that file to reset `selectedAuthorId`:

```ts
beforeEach(() => {
  useAppStore.setState({ selectedPaper: null, selectedCluster: null, selectedAuthorId: null })
})
```

Run to confirm it fails:

```
npm run test:run -- --reporter=verbose tests/components/ClusterPanel.test.tsx
```

Expected: FAIL — `selectedAuthorId` not in store yet (at this point store is already updated from Task 3 Step 3.3, so it will actually compile; the test will fail because the author-view render branch doesn't exist yet in ClusterPanel).

- [ ] **Step 4.6 — Add author view to `src/components/ClusterPanel.tsx`**

Add an "author view" that shows when `selectedAuthorId` is set. Insert this block at the top of the `ClusterPanel` function body, before the `selectedPaper` check:

```tsx
// Author view: show cluster breakdown for the selected author
if (selectedAuthorId) {
  const authorPapers = graph.nodes.filter(n =>
    n.authors.some(a => a.authorId === selectedAuthorId)
  )
  const authorName = authorPapers[0]?.authors.find(a => a.authorId === selectedAuthorId)?.name ?? 'Unknown'

  // Count papers per cluster
  const clusterCounts = new Map<number, number>()
  for (const p of authorPapers) {
    clusterCounts.set(p.clusterId, (clusterCounts.get(p.clusterId) ?? 0) + 1)
  }

  const clusterById = new Map(graph.clusters.map(c => [c.id, c]))

  return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <button
        onClick={() => setSelectedAuthorId(null)}
        className="text-xs text-gray-400 hover:text-white mb-3"
      >
        ← All clusters
      </button>
      <h2 className="font-semibold text-white mb-1 text-sm">{authorName}</h2>
      <p className="text-gray-400 text-xs mb-4">{authorPapers.length} papers in the network</p>
      <p className="text-xs font-semibold text-gray-300 mb-2">Research clusters:</p>
      <ul className="space-y-1">
        {[...clusterCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([clusterId, count]) => {
            const cluster = clusterById.get(clusterId)
            if (!cluster) return null
            return (
              <li
                key={clusterId}
                onClick={() => setSelectedCluster(cluster)}
                className="cursor-pointer p-2 rounded hover:bg-gray-700 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
                <span className="text-xs text-gray-300 flex-1 truncate">{cluster.label}</span>
                <span className="text-xs text-gray-500">{count}</span>
              </li>
            )
          })}
      </ul>
    </aside>
  )
}
```

Also add `selectedAuthorId, setSelectedAuthorId` to the destructured store values at the top of `ClusterPanel`.

Full updated `ClusterPanel.tsx`:

```tsx
import { useAppStore } from '../store/appStore'
import type { GraphData } from '../lib/types'

export function ClusterPanel({ graph }: { graph: GraphData }) {
  const {
    selectedPaper, selectedCluster, selectedAuthorId,
    setSelectedPaper, setSelectedCluster, setSelectedAuthorId,
    hiddenClusterIds, toggleClusterVisibility,
  } = useAppStore()

  // Author view
  if (selectedAuthorId) {
    const authorPapers = graph.nodes.filter(n =>
      n.authors.some(a => a.authorId === selectedAuthorId)
    )
    const authorName = authorPapers[0]?.authors.find(a => a.authorId === selectedAuthorId)?.name ?? 'Unknown'
    const clusterCounts = new Map<number, number>()
    for (const p of authorPapers) {
      clusterCounts.set(p.clusterId, (clusterCounts.get(p.clusterId) ?? 0) + 1)
    }
    const clusterById = new Map(graph.clusters.map(c => [c.id, c]))

    return (
      <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
        <button onClick={() => setSelectedAuthorId(null)} className="text-xs text-gray-400 hover:text-white mb-3">
          ← All clusters
        </button>
        <h2 className="font-semibold text-white mb-1 text-sm">{authorName}</h2>
        <p className="text-gray-400 text-xs mb-4">{authorPapers.length} papers in the network</p>
        <p className="text-xs font-semibold text-gray-300 mb-2">Research clusters:</p>
        <ul className="space-y-1">
          {[...clusterCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([clusterId, count]) => {
              const cluster = clusterById.get(clusterId)
              if (!cluster) return null
              return (
                <li key={clusterId} onClick={() => setSelectedCluster(cluster)}
                    className="cursor-pointer p-2 rounded hover:bg-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
                  <span className="text-xs text-gray-300 flex-1 truncate">{cluster.label}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </li>
              )
            })}
        </ul>
      </aside>
    )
  }

  if (selectedPaper) return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <button onClick={() => setSelectedPaper(null)} className="text-xs text-gray-400 hover:text-white mb-3">← Back</button>
      <h2 className="font-semibold text-white mb-1 text-sm leading-tight">{selectedPaper.title}</h2>
      <p className="text-gray-400 text-xs mb-2">{selectedPaper.year} · {selectedPaper.focusArea}</p>
      {selectedPaper.tldr && <p className="text-gray-300 text-sm mb-3">{selectedPaper.tldr}</p>}
      <p className="text-xs text-gray-400">Citations: {selectedPaper.citationCount ?? 0}</p>
      {selectedPaper.externalUrl && (
        <a href={selectedPaper.externalUrl} target="_blank" rel="noopener noreferrer"
           className="mt-3 block text-indigo-400 hover:text-indigo-300 text-xs">
          View on OpenAlex →
        </a>
      )}
    </aside>
  )

  if (selectedCluster) {
    const papers = graph.nodes.filter(n => selectedCluster.paperIds.includes(n.id))
    return (
      <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
        <button onClick={() => setSelectedCluster(null)} className="text-xs text-gray-400 hover:text-white mb-3">← All clusters</button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCluster.color }} />
          <h2 className="font-semibold text-white text-sm">{selectedCluster.label}</h2>
        </div>
        <p className="text-gray-300 text-sm mb-4">{selectedCluster.summary || 'No summary yet.'}</p>
        <p className="text-xs text-gray-500 mb-2">{papers.length} papers</p>
        <ul className="space-y-1">
          {papers.slice(0, 15).map(p => (
            <li key={p.id} onClick={() => setSelectedPaper(p)}
                className="cursor-pointer text-xs text-gray-300 hover:text-white p-2 rounded hover:bg-gray-700 leading-tight">
              {p.title} ({p.year})
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  return (
    <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <h2 className="font-semibold text-white mb-3 text-sm">Research Clusters</h2>
      <ul className="space-y-2">
        {graph.clusters
          .slice()
          .sort((a, b) => b.paperIds.length - a.paperIds.length)
          .map(c => {
            const hidden = hiddenClusterIds.includes(c.id)
            return (
              <li key={c.id} className={`p-3 rounded border border-gray-700 ${hidden ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <button
                    onClick={() => setSelectedCluster(c)}
                    className="text-sm font-medium text-white text-left hover:underline flex-1 truncate"
                  >
                    {c.label}
                  </button>
                  <span className="text-xs text-gray-400 shrink-0">{c.paperIds.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleClusterVisibility(c.id) }}
                    aria-label={hidden ? `Show ${c.label}` : `Hide ${c.label}`}
                    className="text-gray-500 hover:text-white text-xs ml-1 shrink-0"
                    title={hidden ? 'Show' : 'Hide'}
                  >
                    {hidden ? '◉' : '◎'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{c.summary}</p>
              </li>
            )
          })}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 4.7 — Update `src/App.tsx` (final)**

Replace the `PathFinder` import with `ResearcherSearch` and apply the colour logic from Task 2 if not already done. Final `App.tsx`:

```tsx
import { useGraphData } from './hooks/useGraphData'
import { CitationGraph } from './components/CitationGraph'
import { ClusterPanel } from './components/ClusterPanel'
import { ResearcherSearch } from './components/ResearcherSearch'
import { SearchBar } from './components/SearchBar'
import { resolveConceptColor, SRC_CONCEPTS } from './lib/conceptColors'

export default function App() {
  const { data, loading, error } = useGraphData()

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-sm">
      Loading citation network…
    </div>
  )

  if (error || !data) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400 text-sm">
      <span>
        Error loading graph. Run <code className="mx-1 px-1 bg-gray-800 rounded">npm run pipeline</code> first.
        {error && <span className="ml-2 text-gray-500">({error.message})</span>}
      </span>
    </div>
  )

  const configColors: Record<string, string> = { 'Other': '#6B7280' }
  data.clusters.forEach(c => {
    const base = c.label.replace(/ \(\d+\)$/, '')
    if (!configColors[base]) configColors[base] = c.color
  })

  const focusAreaColors: Record<string, string> = {}
  const allAreas = new Set(data.nodes.map(n => n.focusArea))
  allAreas.forEach(area => {
    focusAreaColors[area] = resolveConceptColor(area, configColors)
  })
  focusAreaColors['Other'] = '#6B7280'

  const legendAreas = [...allAreas].filter(a => SRC_CONCEPTS.has(a)).sort()
  if ([...allAreas].some(a => !SRC_CONCEPTS.has(a))) legendAreas.push('Other')

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <header className="px-4 py-2 border-b border-gray-700 flex items-center gap-4">
        <h1 className="font-bold text-lg">SRC Citation Graph</h1>
        <span className="text-sm text-gray-400">
          {data.nodes.length} papers · {data.edges.length} citations
        </span>
      </header>
      <ResearcherSearch graph={data} />
      <SearchBar focusAreas={legendAreas} focusAreaColors={focusAreaColors} />
      <main className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <CitationGraph graph={data} focusAreaColors={focusAreaColors} />
        </div>
        <ClusterPanel graph={data} />
      </main>
    </div>
  )
}
```

- [ ] **Step 4.8 — Run full test suite**

```
npm run test:run
```

Expected: all tests pass (30+).

- [ ] **Step 4.9 — Delete the now-unused PathFinder files**

Run from the project root (`C:\Users\raja4291\OneDrive - Stockholm University\Documents\Claude Code\projects\src-citation-graph`):

```bash
rm src/components/PathFinder.tsx src/hooks/useShortestPath.ts
```

Check that nothing else imports them:

```bash
grep -r "PathFinder\|useShortestPath" src/ tests/
```

Expected: no output.

- [ ] **Step 4.10 — Final test run + build**

```
npm run test:run && npm run build
```

Expected: all tests pass, build succeeds with no TypeScript errors.

- [ ] **Step 4.11 — Commit and push**

```bash
git add -A
git commit -m "feat: researcher explorer replaces citation path finder

- ResearcherSearch: autocomplete by author name, highlights papers in graph
- ClusterPanel: author view shows cluster distribution per researcher
- PathFinder + useShortestPath removed (unused)
- App.tsx wired to ResearcherSearch"

git push
```
