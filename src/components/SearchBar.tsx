import { useAppStore } from '../store/appStore'

interface Props {
  focusAreas: string[]
  focusAreaColors: Record<string, string>
}

export function SearchBar({ focusAreas, focusAreaColors }: Props) {
  const { searchQuery, setSearchQuery } = useAppStore()

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-700 bg-gray-800">
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
             placeholder="Filter papers or authors…"
             className="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600 w-56" />
      <div className="flex flex-wrap gap-3">
        {focusAreas.map(area => (
          <span key={area} className="flex items-center gap-1 text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: focusAreaColors[area] }} />
            {area}
          </span>
        ))}
      </div>
    </div>
  )
}
