import { toBibtex, toMarkdown, downloadFile } from '../lib/export'
import type { Paper } from '../lib/types'

interface Props {
  papers: Paper[]
  label: string
}

export function ExportButtons({ papers, label }: Props) {
  if (papers.length === 0) return null

  const slug = label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  return (
    <div className="flex gap-2 mb-3">
      <button
        aria-label="Export BibTeX"
        onClick={() => downloadFile(toBibtex(papers), `src-${slug}.bib`, 'text/plain')}
        className="text-xs px-2 py-1 rounded border cursor-pointer"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
          background: 'var(--bg-elevated)',
        }}
      >
        ↓ BibTeX
      </button>
      <button
        aria-label="Export Markdown"
        onClick={() => downloadFile(toMarkdown(papers, label), `src-${slug}.md`, 'text/markdown')}
        className="text-xs px-2 py-1 rounded border cursor-pointer"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
          background: 'var(--bg-elevated)',
        }}
      >
        ↓ Markdown
      </button>
    </div>
  )
}
