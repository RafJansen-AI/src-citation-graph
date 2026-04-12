const BASE = 'https://api.openalex.org'
const WORK_FIELDS = [
  'id', 'title', 'publication_year', 'authorships',
  'abstract_inverted_index', 'concepts', 'cited_by_count',
  'ids', 'referenced_works',
].join(',')

export interface OAWork {
  id: string
  title: string | null
  publication_year: number | null
  authorships: Array<{ author: { id: string; display_name: string } }>
  abstract_inverted_index: Record<string, number[]> | null
  concepts: Array<{ display_name: string; level: number; score: number }>
  cited_by_count: number
  ids: { doi?: string }
  referenced_works: string[]
}

export interface OAInstitution {
  id: string
  display_name: string
  ror: string
}

export class OpenAlexClient {
  private email: string | undefined

  constructor(email?: string) {
    this.email = email ?? process.env.OPENALEX_EMAIL
  }

  private polite(url: string): string {
    if (!this.email) return url
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}mailto=${encodeURIComponent(this.email)}`
  }

  private async get(url: string): Promise<any> {
    const res = await fetch(this.polite(url))
    if (!res.ok) throw new Error(`OpenAlex ${res.status}: ${url}`)
    return res.json()
  }

  institutionSearchUrl(name: string): string {
    return `${BASE}/institutions?search=${encodeURIComponent(name)}&per_page=1`
  }

  async findInstitution(name: string): Promise<OAInstitution | null> {
    const data = await this.get(this.institutionSearchUrl(name))
    return data.results?.[0] ?? null
  }

  async *getInstitutionWorks(institutionId: string): AsyncGenerator<OAWork> {
    let cursor: string | null = '*'
    let fetched = 0

    while (cursor) {
      const url = `${BASE}/works?filter=authorships.institutions.id:${institutionId}&select=${WORK_FIELDS}&per_page=200&cursor=${cursor}`
      const data = await this.get(url)
      const works: OAWork[] = data.results ?? []
      for (const w of works) yield w
      fetched += works.length
      process.stdout.write(`\r  fetched ${fetched} works…`)
      cursor = data.meta?.next_cursor ?? null
    }
    process.stdout.write('\n')
  }

  // ── Static helpers (pure, easily testable) ─────────────────────────────

  static workId(oaId: string): string {
    return oaId.split('/').pop() ?? oaId
  }

  static reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
    if (!invertedIndex) return ''
    const positions: string[] = []
    for (const [word, locs] of Object.entries(invertedIndex)) {
      for (const pos of locs) positions[pos] = word
    }
    return positions.filter(Boolean).join(' ')
  }

  static topConcept(concepts: OAWork['concepts']): string {
    const level0 = concepts.filter(c => c.level === 0).sort((a, b) => b.score - a.score)
    return level0[0]?.display_name ?? 'Other'
  }
}
