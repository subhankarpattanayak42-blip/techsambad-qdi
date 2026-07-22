import { useState } from 'react'

export default function SearchPanel({ segments, codes, documents, onSelectDocument }) {
  const [query, setQuery] = useState('')
  const [filterCode, setFilterCode] = useState('')

  const results = segments.filter(s => {
    const matchText = !query || s.text.toLowerCase().includes(query.toLowerCase())
    const matchCode = !filterCode || s.codeId === filterCode
    return matchText && matchCode
  })

  const codeMap = Object.fromEntries(codes.map(c => [c.id, c]))
  const docMap = Object.fromEntries(documents.map(d => [d.id, d]))

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-gray-50 flex flex-col gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search segments…"
          className="w-full text-sm border rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-400" />
        <select value={filterCode} onChange={e => setFilterCode(e.target.value)}
          className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400">
          <option value="">All codes</option>
          {codes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {results.length === 0 && <p className="text-xs text-gray-400 text-center mt-8">No results found.</p>}
        {results.map(seg => {
          const code = codeMap[seg.codeId]
          const doc = docMap[seg.documentId]
          return (
            <div key={seg.id} className="mb-2 p-2 bg-white rounded border border-gray-200 hover:border-blue-300 cursor-pointer transition"
              onClick={() => onSelectDocument(seg.documentId)}>
              <div className="flex items-center gap-2 mb-1">
                {code && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: code.color }}>{code.name}</span>}
                <span className="text-[10px] text-gray-400 truncate">{doc?.name}</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">"{seg.text}"</p>
              {seg.memo && <p className="text-[10px] text-gray-400 mt-1 italic">📝 {seg.memo}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
