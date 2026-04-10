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

### Populate researcher roster

Edit `data/researchers.json` with SRC's full staff list. The `focusArea` field must
match a key in the `focusAreas` color map at the top of that file. The current file
has 10 representative entries — replace with the full ~160 researchers.

### Run the data pipeline

```bash
npm run pipeline
```

This runs three stages in sequence (~2-4 hours for 160 researchers at the free API rate;
~20 minutes with a Semantic Scholar API key):

```bash
npm run fetch-data         # fetches papers + citations → public/data/graph.json
npm run detect-clusters    # detects research clusters via community detection
npm run summarize-clusters # calls Claude API to write cluster narrative summaries
```

The pipeline is resumable — `summarize-clusters` skips clusters already summarized.

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
  fetchData.ts          # orchestrates Semantic Scholar API fetch
  semanticScholar.ts    # typed API client with rate limiting
  buildGraph.ts         # constructs graph JSON from raw API data
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
  researchers.json      # SRC researcher roster (committed)

public/data/
  graph.json            # pipeline output (gitignored, ~10MB)
```
