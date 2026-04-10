const BASE = 'https://api.semanticscholar.org/graph/v1'
const PAPER_FIELDS = 'paperId,title,year,authors,tldr,citationCount,externalIds'

export class SemanticScholarClient {
  readonly minInterval: number
  private apiKey: string | undefined
  private lastRequest = 0

  constructor(apiKey?: string) {
    this.apiKey = apiKey
    this.minInterval = apiKey ? 100 : 1000
  }

  private get headers(): Record<string, string> {
    return this.apiKey ? { 'x-api-key': this.apiKey } : {}
  }

  private async throttle(): Promise<void> {
    const wait = this.minInterval - (Date.now() - this.lastRequest)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    this.lastRequest = Date.now()
  }

  authorSearchUrl(name: string): string {
    return `${BASE}/author/search?query=${encodeURIComponent(name)}&fields=authorId,name,affiliations,paperCount&limit=5`
  }

  extractPaperId(paper: { paperId: string }): string {
    return paper.paperId
  }

  async searchAuthor(name: string): Promise<any[]> {
    await this.throttle()
    const res = await fetch(this.authorSearchUrl(name), { headers: this.headers })
    if (!res.ok) throw new Error(`Author search ${res.status}: ${name}`)
    return (await res.json()).data ?? []
  }

  async getAuthorPapers(authorId: string, limit = 200): Promise<any[]> {
    await this.throttle()
    const url = `${BASE}/author/${authorId}/papers?fields=${PAPER_FIELDS}&limit=${limit}`
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) throw new Error(`Author papers ${res.status}: ${authorId}`)
    return (await res.json()).data ?? []
  }

  async getPaperCitingPapers(paperId: string, limit = 500): Promise<string[]> {
    await this.throttle()
    const url = `${BASE}/paper/${paperId}/citations?fields=paperId&limit=${limit}`
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) throw new Error(`Citations ${res.status}: ${paperId}`)
    const data = (await res.json()).data ?? []
    return data.map((c: any) => c.citingPaper?.paperId).filter(Boolean)
  }
}
