import type { Paper } from './types'

function sanitizeKey(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
}

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

export function toBibtex(papers: Paper[]): string {
  if (papers.length === 0) return ''
  return papers.map(p => {
    const firstAuthor = p.authors[0]?.name ?? 'Unknown'
    const lastName = firstAuthor.split(' ').pop() ?? firstAuthor
    const key = `${sanitizeKey(lastName)}${p.year}`
    const authors = p.authors.map(a => a.name).join(' and ')
    const doi = p.externalUrl?.startsWith('https://doi.org/')
      ? p.externalUrl.replace('https://doi.org/', '')
      : null

    return [
      `@article{${key},`,
      `  author = {${escapeLatex(authors)}},`,
      `  title = {${escapeLatex(p.title)}},`,
      `  year = {${p.year}},`,
      doi ? `  doi = {${doi}},` : null,
      `  note = {Stockholm Resilience Centre}`,
      `}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}

export function toMarkdown(papers: Paper[], listTitle: string): string {
  const lines = [`# ${listTitle}`, '']
  for (const p of papers) {
    const shownAuthors = p.authors.slice(0, 3).map(a => a.name).join(', ')
    const suffix = p.authors.length > 3 ? ' et al.' : ''
    lines.push(`- **${p.title}** (${p.year})`)
    lines.push(`  ${shownAuthors}${suffix}`)
    if (p.externalUrl) lines.push(`  ${p.externalUrl}`)
    lines.push('')
  }
  return lines.join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
