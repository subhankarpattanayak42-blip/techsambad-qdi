import { useState, useMemo } from 'react'
import { exportRetrievalXLSX } from '../utils/export'
import { MEMO_TYPES } from './MemoPanel'

const MODES = [
  { id: 'code', label: '🏷 By Code / Theme' },
  { id: 'keyword', label: '🔤 By Keyword' },
  { id: 'cooccurrence', label: '🔗 Co-occurrence' },
  { id: 'sequence', label: '⏩ Sequence' },
  { id: 'memo', label: '🪞 By Memo Type' },
]

export default function RetrievalPanel({ segments, codes, documents, memos, onAddSegment, onUpdateSegment }) {
  const [mode, setMode] = useState('code')

  // By Code
  const [selectedCodes, setSelectedCodes] = useState([])

  // By Keyword
  const [keyword, setKeyword] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)

  // Co-occurrence
  const [coCode1, setCoCode1] = useState('')
  const [coCode2, setCoCode2] = useState('')
  const [coScope, setCoScope] = useState('document')
  const [coProximity, setCoProximity] = useState(200)

  // Sequence
  const [seqCode1, setSeqCode1] = useState('')
  const [seqCode2, setSeqCode2] = useState('')

  // Memo type
  const [memoType, setMemoType] = useState('')

  // Auto-coding
  const [checkedRows, setCheckedRows] = useState(new Set())
  const [targetCodeId, setTargetCodeId] = useState('')
  const [assignStatus, setAssignStatus] = useState(null) // null | 'assigning' | 'done'

  const codeMap = useMemo(() => Object.fromEntries(codes.map(c => [c.id, c])), [codes])
  const docMap = useMemo(() => Object.fromEntries(documents.map(d => [d.id, d])), [documents])

  function getCodeLabel(code) {
    if (!code) return ''
    const parent = code.parentId ? codeMap[code.parentId] : null
    return parent ? `${parent.name} › ${code.name}` : code.name
  }

  // ── Results computation ──────────────────────────────────────────────────

  const results = useMemo(() => {
    setCheckedRows(new Set())
    setAssignStatus(null)

    if (mode === 'code') {
      if (!selectedCodes.length) return []
      const allIds = new Set()
      for (const id of selectedCodes) {
        allIds.add(id)
        codes.filter(c => c.parentId === id).forEach(c => allIds.add(c.id))
      }
      return segments
        .filter(s => allIds.has(s.codeId))
        .map(s => toRow(s))
    }

    if (mode === 'keyword') {
      if (!keyword.trim()) return []
      return documents.flatMap(doc => {
        const text = doc.text || ''
        const matches = []
        const flags = 'g' + (caseSensitive ? '' : 'i')
        let pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        if (wholeWord) pattern = `\\b${pattern}\\b`
        const re = new RegExp(pattern, flags)
        let m
        while ((m = re.exec(text)) !== null) {
          const start = Math.max(0, m.index - 80)
          const end = Math.min(text.length, m.index + m[0].length + 80)
          matches.push({
            // rowId unique per keyword hit
            segId: `kw_${doc.id}_${m.index}`,
            docId: doc.id,
            docName: doc.name,
            codeName: '—',
            text: (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : ''),
            // store exact match boundaries for segment creation
            exactText: m[0],
            exactStart: m.index,
            exactEnd: m.index + m[0].length,
            start: m.index,
            end: m.index + m[0].length,
            highlight: m[0],
            memoType: '', memoContent: '',
            isKeywordHit: true,
          })
        }
        return matches
      })
    }

    if (mode === 'cooccurrence') {
      if (!coCode1 || !coCode2 || coCode1 === coCode2) return []
      const segs1 = segments.filter(s => s.codeId === coCode1)
      const segs2 = segments.filter(s => s.codeId === coCode2)
      const rows = []
      if (coScope === 'document') {
        const docs1 = new Set(segs1.map(s => s.documentId))
        const docs2 = new Set(segs2.map(s => s.documentId))
        const sharedDocs = [...docs1].filter(id => docs2.has(id))
        for (const docId of sharedDocs) {
          const d1 = segs1.filter(s => s.documentId === docId)
          const d2 = segs2.filter(s => s.documentId === docId)
          for (const s of [...d1, ...d2]) rows.push(toRow(s))
        }
      } else {
        for (const s1 of segs1) {
          for (const s2 of segs2.filter(s => s.documentId === s1.documentId)) {
            const dist = Math.min(Math.abs(s1.start - s2.end), Math.abs(s2.start - s1.end))
            if (dist <= coProximity) {
              rows.push(toRow(s1))
              rows.push(toRow(s2))
            }
          }
        }
      }
      const seen = new Set()
      return rows.filter(r => { const k = r.segId; if (seen.has(k)) return false; seen.add(k); return true })
    }

    if (mode === 'sequence') {
      if (!seqCode1 || !seqCode2 || seqCode1 === seqCode2) return []
      const rows = []
      for (const doc of documents) {
        const docSegs = segments.filter(s => s.documentId === doc.id).sort((a, b) => a.start - b.start)
        const s1segs = docSegs.filter(s => s.codeId === seqCode1)
        const s2segs = docSegs.filter(s => s.codeId === seqCode2)
        for (const s1 of s1segs) {
          const following = s2segs.filter(s2 => s2.start > s1.end)
          if (following.length) {
            rows.push({ ...toRow(s1), sequenceRole: `A: ${codeMap[seqCode1]?.name}` })
            rows.push({ ...toRow(following[0]), sequenceRole: `B: ${codeMap[seqCode2]?.name}` })
          }
        }
      }
      return rows
    }

    if (mode === 'memo') {
      if (!memoType) return []
      const filtered = memos.filter(m => m.type === memoType)
      return filtered.map(m => {
        const seg = m.segmentId ? segments.find(s => s.id === m.segmentId) : null
        const doc = m.documentId ? docMap[m.documentId] : (seg ? docMap[seg.documentId] : null)
        const code = seg ? codeMap[seg.codeId] : null
        return {
          segId: m.id,
          docId: seg?.documentId || m.documentId,
          docName: doc?.name || '—',
          codeName: code ? getCodeLabel(code) : '—',
          text: seg?.text || '(project-level memo)',
          start: seg?.start,
          end: seg?.end,
          memoType: m.type,
          memoContent: m.content,
          codeColor: code?.color,
        }
      })
    }

    return []
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedCodes, keyword, caseSensitive, wholeWord, coCode1, coCode2, coScope, coProximity, seqCode1, seqCode2, memoType, segments, codes, documents, memos])

  function toRow(s) {
    const code = codeMap[s.codeId]
    const doc = docMap[s.documentId]
    const segMemo = memos.find(m => m.segmentId === s.id)
    return {
      segId: s.id,
      docId: s.documentId,
      docName: doc?.name || '—',
      codeName: code ? getCodeLabel(code) : '—',
      text: s.text,
      start: s.start,
      end: s.end,
      memoType: segMemo?.type || '',
      memoContent: segMemo?.content || '',
      codeColor: code?.color,
    }
  }

  // Frequency summary
  const freqSummary = useMemo(() => {
    const map = {}
    for (const r of results) {
      map[r.codeName] = (map[r.codeName] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [results])

  function toggleCode(id) {
    setSelectedCodes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // ── Checkbox logic ───────────────────────────────────────────────────────

  const allChecked = results.length > 0 && checkedRows.size === results.length
  const someChecked = checkedRows.size > 0 && !allChecked

  function toggleAll() {
    if (allChecked) {
      setCheckedRows(new Set())
    } else {
      setCheckedRows(new Set(results.map((_, i) => i)))
    }
  }

  function toggleRow(i) {
    setCheckedRows(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  // ── Auto-assign logic ────────────────────────────────────────────────────

  async function handleAssignToCode() {
    if (!targetCodeId || checkedRows.size === 0) return
    setAssignStatus('assigning')

    const selected = [...checkedRows].map(i => results[i])

    for (const row of selected) {
      if (row.isKeywordHit) {
        // Create a new segment from the keyword match
        await onAddSegment(row.docId, row.exactText, targetCodeId, row.exactStart, row.exactEnd)
      } else {
        // Re-code existing segment
        await onUpdateSegment(row.segId, { codeId: targetCodeId })
      }
    }

    setAssignStatus('done')
    setCheckedRows(new Set())
    setTimeout(() => setAssignStatus(null), 2500)
  }

  const themes = codes.filter(c => !c.parentId)

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-50">
      {/* Left: query builder */}
      <div className="w-64 border-r bg-white flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-3 border-b">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Retrieval Mode</p>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`w-full text-left text-xs px-3 py-2 rounded mb-0.5 transition font-medium ${mode === m.id ? 'bg-[#00335B] text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="p-3 flex-1">
          {/* By Code */}
          {mode === 'code' && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Select codes / themes:</p>
              <button onClick={() => setSelectedCodes(codes.map(c => c.id))}
                className="text-[10px] text-blue-600 hover:underline mb-2 block">Select all</button>
              {themes.map(theme => (
                <div key={theme.id}>
                  <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <input type="checkbox" checked={selectedCodes.includes(theme.id)} onChange={() => toggleCode(theme.id)} className="rounded" />
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: theme.color }} />
                    <span className="text-xs font-semibold text-gray-800 truncate">{theme.name}</span>
                  </label>
                  {codes.filter(c => c.parentId === theme.id).map(sub => (
                    <label key={sub.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1 pl-6">
                      <input type="checkbox" checked={selectedCodes.includes(sub.id)} onChange={() => toggleCode(sub.id)} className="rounded" />
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                      <span className="text-xs text-gray-600 truncate">└ {sub.name}</span>
                    </label>
                  ))}
                </div>
              ))}
              {codes.length === 0 && <p className="text-xs text-gray-400">No codes yet.</p>}
            </div>
          )}

          {/* By Keyword */}
          {mode === 'keyword' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-600">Search term:</p>
              <input value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="Enter keyword or phrase…"
                className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-400" />
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
                Case sensitive
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={wholeWord} onChange={e => setWholeWord(e.target.checked)} />
                Whole word only
              </label>
            </div>
          )}

          {/* Co-occurrence */}
          {mode === 'cooccurrence' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-600">Code A:</p>
              <select value={coCode1} onChange={e => setCoCode1(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400">
                <option value="">Select code…</option>
                {codes.map(c => <option key={c.id} value={c.id}>{getCodeLabel(c)}</option>)}
              </select>
              <p className="text-xs font-bold text-gray-600">Code B:</p>
              <select value={coCode2} onChange={e => setCoCode2(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400">
                <option value="">Select code…</option>
                {codes.filter(c => c.id !== coCode1).map(c => <option key={c.id} value={c.id}>{getCodeLabel(c)}</option>)}
              </select>
              <p className="text-xs font-bold text-gray-600 mt-1">Scope:</p>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="radio" checked={coScope === 'document'} onChange={() => setCoScope('document')} />
                Same document
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="radio" checked={coScope === 'proximity'} onChange={() => setCoScope('proximity')} />
                Within {coProximity} characters
              </label>
              {coScope === 'proximity' && (
                <input type="number" value={coProximity} onChange={e => setCoProximity(Number(e.target.value))}
                  min={50} max={2000} step={50}
                  className="w-full text-xs border rounded px-2 py-1 outline-none" />
              )}
            </div>
          )}

          {/* Sequence */}
          {mode === 'sequence' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 mb-1">Find documents where Code A appears <strong>before</strong> Code B.</p>
              <p className="text-xs font-bold text-gray-600">Code A (appears first):</p>
              <select value={seqCode1} onChange={e => setSeqCode1(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400">
                <option value="">Select code…</option>
                {codes.map(c => <option key={c.id} value={c.id}>{getCodeLabel(c)}</option>)}
              </select>
              <p className="text-xs font-bold text-gray-600">Code B (appears after):</p>
              <select value={seqCode2} onChange={e => setSeqCode2(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400">
                <option value="">Select code…</option>
                {codes.filter(c => c.id !== seqCode1).map(c => <option key={c.id} value={c.id}>{getCodeLabel(c)}</option>)}
              </select>
            </div>
          )}

          {/* By Memo Type */}
          {mode === 'memo' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-600">Memo type:</p>
              {MEMO_TYPES.map(m => (
                <label key={m.type} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-gray-50 rounded px-1">
                  <input type="radio" checked={memoType === m.type} onChange={() => setMemoType(m.type)} />
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-xs text-gray-700">{m.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results toolbar */}
        <div className="px-4 py-2 border-b bg-white flex items-center gap-3 flex-shrink-0 flex-wrap">
          <span className="text-sm font-bold text-gray-800">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          {freqSummary.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {freqSummary.slice(0, 6).map(([name, count]) => (
                <span key={name} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                  {name}: {count}
                </span>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <button
              onClick={() => exportRetrievalXLSX(results, mode)}
              className="ml-auto text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 font-semibold flex items-center gap-1">
              ⬇ Export Excel
            </button>
          )}
        </div>

        {/* Auto-coding toolbar — shown when rows are checked */}
        {checkedRows.size > 0 && (
          <div className="px-4 py-2 border-b bg-amber-50 flex items-center gap-3 flex-shrink-0 flex-wrap">
            <span className="text-xs font-semibold text-amber-800">
              {checkedRows.size} row{checkedRows.size !== 1 ? 's' : ''} selected
            </span>
            <select
              value={targetCodeId}
              onChange={e => setTargetCodeId(e.target.value)}
              className="text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-400 min-w-[160px]">
              <option value="">Assign to code…</option>
              {codes.map(c => (
                <option key={c.id} value={c.id}>{getCodeLabel(c)}</option>
              ))}
            </select>
            <button
              onClick={handleAssignToCode}
              disabled={!targetCodeId || assignStatus === 'assigning'}
              className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              {assignStatus === 'assigning' ? '⏳ Assigning…' : '🏷 Assign to Code'}
            </button>
            {assignStatus === 'done' && (
              <span className="text-xs text-green-700 font-semibold">✅ Done! Segments coded.</span>
            )}
            <button onClick={() => setCheckedRows(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Clear selection</button>
          </div>
        )}

        {/* Quotation matrix table */}
        <div className="flex-1 overflow-auto">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-8">
              <div className="text-5xl mb-3">🔎</div>
              <p className="text-sm font-medium">No results yet</p>
              <p className="text-xs mt-1 max-w-xs">
                {mode === 'code' && 'Select one or more codes on the left to retrieve their segments'}
                {mode === 'keyword' && 'Type a keyword to search across all documents'}
                {mode === 'cooccurrence' && 'Select two codes to find where they co-occur'}
                {mode === 'sequence' && 'Select two codes to find where A appears before B'}
                {mode === 'memo' && 'Select a memo type to retrieve annotated segments'}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-[#00335B] text-white">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={el => { if (el) el.indeterminate = someChecked }}
                      onChange={toggleAll}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-3 py-2 font-semibold w-32">Document</th>
                  <th className="text-left px-3 py-2 font-semibold w-36">Code / Theme</th>
                  {mode === 'sequence' && <th className="text-left px-3 py-2 font-semibold w-20">Role</th>}
                  <th className="text-left px-3 py-2 font-semibold">Segment Text</th>
                  {mode === 'memo' && <th className="text-left px-3 py-2 font-semibold w-32">Memo</th>}
                  <th className="text-left px-3 py-2 font-semibold w-20">Position</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const memoStyle = r.memoType ? MEMO_TYPES.find(m => m.type === r.memoType) : null
                  const isChecked = checkedRows.has(i)
                  return (
                    <tr key={r.segId + i}
                      onClick={() => toggleRow(i)}
                      className={`border-b cursor-pointer transition ${isChecked ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}`}>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleRow(i)} className="rounded cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 text-gray-500 truncate max-w-[8rem]">{r.docName}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: r.codeColor || '#e5e7eb', color: '#1f2937' }}>
                          {r.codeName}
                        </span>
                      </td>
                      {mode === 'sequence' && (
                        <td className="px-3 py-2 text-[10px] font-bold text-purple-700">{r.sequenceRole}</td>
                      )}
                      <td className="px-3 py-2 text-gray-800 leading-relaxed">
                        {mode === 'keyword' && r.highlight ? (
                          <span dangerouslySetInnerHTML={{
                            __html: r.text.replace(
                              new RegExp(r.highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                              m => `<mark class="bg-yellow-200 rounded px-0.5">${m}</mark>`
                            )
                          }} />
                        ) : (
                          `"${r.text}"`
                        )}
                      </td>
                      {mode === 'memo' && (
                        <td className="px-3 py-2">
                          {memoStyle && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ backgroundColor: memoStyle.bg, color: memoStyle.color }}>
                              {memoStyle.label}
                            </span>
                          )}
                          <p className="text-gray-500 mt-0.5 text-[10px] line-clamp-2">{r.memoContent}</p>
                        </td>
                      )}
                      <td className="px-3 py-2 text-gray-400 tabular-nums">
                        {r.start != null ? `${r.start}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
