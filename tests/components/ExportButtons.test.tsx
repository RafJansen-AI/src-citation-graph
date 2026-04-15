import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportButtons } from '../../src/components/ExportButtons'
import { downloadFile } from '../../src/lib/export'
import type { Paper } from '../../src/lib/types'

vi.mock('../../src/lib/export', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/lib/export')>()
  return { ...actual, downloadFile: vi.fn() }
})

function makePaper(id: string): Paper {
  return {
    id,
    title: 'Test Paper',
    year: 2020,
    authors: [{ authorId: 'A1', name: 'Author One' }],
    focusArea: 'Other',
    tldr: '',
    clusterId: 0,
    citationCount: 10,
    externalUrl: 'https://doi.org/10.1/test',
  }
}

describe('ExportButtons', () => {
  it('renders nothing when papers array is empty', () => {
    const { container } = render(<ExportButtons papers={[]} label="Test" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders BibTeX and Markdown buttons when papers are present', () => {
    render(<ExportButtons papers={[makePaper('p1')]} label="Test List" />)
    expect(screen.getByRole('button', { name: /bibtex/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /markdown/i })).toBeInTheDocument()
  })

  it('calls downloadFile with .bib filename on BibTeX click', async () => {
    const user = userEvent.setup()
    render(<ExportButtons papers={[makePaper('p1')]} label="My Cluster" />)
    await user.click(screen.getByRole('button', { name: /bibtex/i }))
    expect(downloadFile).toHaveBeenCalledWith(
      expect.stringContaining('@article'),
      expect.stringMatching(/\.bib$/),
      'text/plain',
    )
  })

  it('calls downloadFile with .md filename containing label on Markdown click', async () => {
    const user = userEvent.setup()
    render(<ExportButtons papers={[makePaper('p1')]} label="My Cluster" />)
    await user.click(screen.getByRole('button', { name: /markdown/i }))
    expect(downloadFile).toHaveBeenCalledWith(
      expect.stringContaining('# My Cluster'),
      expect.stringMatching(/\.md$/),
      'text/markdown',
    )
  })
})
