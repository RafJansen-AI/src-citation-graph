# SRC Citation Graph

Interactive citation network for Stockholm Resilience Centre researchers (~160 staff).
Visualizes publication relationships as a force-directed graph with AI-powered cluster summaries.

## Features

- Force-directed citation graph — nodes = papers, edges = citations between SRC papers
- Colored by research focus area (Sustainability, Economics, Governance, …)
- AI-generated summaries of research clusters (Claude API)
- Shortest citation path finder between any two papers
- Paper/author text search with live node filtering
- Click any node to see paper details; click clusters in the sidebar to explore themes

## Setup

```bash
git clone https://github.com/RafJansen-AI/src-citation-graph
cd src-citation-graph
npm install
cp .env.example .env    # add ANTHROPIC_API_KEY; SEMANTIC_SCHOLAR_API_KEY is optional
```

### Configure institution

Edit `data/config.json` — set `institutionName` to exactly match OpenAlex's name for the
institution (default: `"Stockholm Resilience Centre"`). The `conceptColors` map controls
node colors by OpenAlex concept. No researcher list needed — all authors and papers are
discovered automatically.

### Run the data pipeline

```bash
npm run pipeline
```

This runs three stages in sequence. The fetch stage uses OpenAlex (free, no key needed)
and typically completes in **5-15 minutes** depending on publication count:

```bash
npm run fetch-data         # OpenAlex: auto-discovers institution works + builds citation graph
npm run detect-clusters    # community detection → assigns cluster IDs + concept-derived colors
npm run summarize-clusters # calls Claude API to write cluster narrative summaries
```

The pipeline is resumable — `summarize-clusters` skips clusters already summarized.
Add `OPENALEX_EMAIL` to `.env` for polite-pool access (higher rate limits, optional).

### Start dev server

```bash
npm run dev    # http://localhost:5173
```

The app shows an error screen if `public/data/graph.json` doesn't exist yet — run the pipeline first.

### Run tests

```bash
npm run test:run
```

### Production build

```bash
npm run build  # outputs to dist/
```

Deploy `dist/` as a static site (Netlify, GitHub Pages, Render static site).
`public/data/graph.json` is included in the build automatically — commit it before deploying.

## Updating data

Re-run `npm run pipeline` periodically (suggested: monthly, or before annual reports).
Commit the refreshed `public/data/graph.json` to deploy the update.

## Architecture

```
scripts/
  fetchData.ts          # orchestrates OpenAlex fetch (institution → works → graph.json)
  openAlex.ts           # typed OpenAlex API client with cursor pagination
  buildGraph.ts         # constructs graph JSON from OpenAlex work objects
  detectClusters.ts     # Louvain community detection
  summarizeClusters.ts  # Claude API cluster summaries

src/
  lib/types.ts          # shared TypeScript interfaces
  lib/graphAlgorithms.ts # BFS shortest path, Louvain
  hooks/useGraphData.ts  # loads graph.json
  hooks/useShortestPath.ts
  store/appStore.ts     # Zustand state
  components/
    CitationGraph.tsx   # react-force-graph canvas
    ClusterPanel.tsx    # right sidebar
    PathFinder.tsx      # shortest path UI
    SearchBar.tsx       # filter + legend

data/
  config.json           # institution name + concept→color map (committed)

public/data/
  graph.json            # pipeline output (gitignored, ~10MB)
```
