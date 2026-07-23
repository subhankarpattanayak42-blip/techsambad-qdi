import { useState, useRef, useEffect } from 'react'
import { useAI } from '../hooks/useAI'

const PRESET_COLORS = ['#FCD34D','#86EFAC','#93C5FD','#F9A8D4','#A5B4FC','#6EE7B7','#FCA5A5','#67E8F9','#D8B4FE','#FB923C','#A3E635','#F472B6','#34D399','#60A5FA','#FBBF24']

export default function DocumentViewer({ document: doc, segments, codes, onAddSegment, onDeleteSegment, onUpdateSegment, onAddCode, pendingSelection, onSelectionChange }) {
  const [memoEdit, setMemoEdit] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiError, setAiError] = useState(null)
  const containerRef = useRef()
  const { suggestCodes, loading: aiLoading } = useAI()

  useEffect(() => { onSelectionChange(null) }, [doc?.id])

  // Clear AI suggestions when selection changes
  useEffect(() => {
    if (!pendingSelection) {
      setAiSuggestions([])
      setAiError(null)
    }
  }, [pendingSelection])

  function handleMouseUp() {
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const text = sel.toString().trim()
      if (!text || text.length < 2) return

      let start = 0, end = 0
      try {
        const range = sel.getRangeAt(0)
        const rStart = window.document.createRange()
        rStart.setStart(containerRef.current, 0)
        rStart.setEnd(range.startContainer, range.startOffset)
        start = rStart.toString().length
        const rEnd = window.document.createRange()
        rEnd.setStart(containerRef.current, 0)
        rEnd.setEnd(range.endContainer, range.endOffset)
        end = rEnd.toString().length
      } catch { end = start + text.length }

      onSelectionChange({ text, start, end })
    }, 10)
  }

  const [quickMemo, setQuickMemo] = useState(null) // { segId, text, codeName, color }

  function assignCode(codeId, codeName, color) {
    if (!pendingSelection) return
    const seg = onAddSegment(doc.id, pendingSelection.text, codeId, pendingSelection.start, pendingSelection.end)
    onSelectionChange(null)
    window.getSelection()?.removeAllRanges()
    setAiSuggestions([])
    // Open quick memo prompt — seg is a promise, handle accordingly
    Promise.resolve(seg).then(s => {
      setQuickMemo({ segId: s.id, text: pendingSelection.text, codeName, color })
    })
  }

  useEffect(() => {
    if (onSelectionChange.__setAssign) onSelectionChange.__setAssign(assignCode)
  })

  async function handleAISuggest() {
    if (!pendingSelection) return
    setAiError(null)
    setAiSuggestions([])
    try {
      const suggestions = await suggestCodes(pendingSelection.text, codes)
      setAiSuggestions(suggestions)
    } catch (e) {
      setAiError(e.message)
    }
  }

  async function applyAISuggestion(suggestion) {
    // Find existing code by name (case-insensitive)
    let existing = codes.find(c => c.name.toLowerCase() === suggestion.code.toLowerCase())
    if (!existing) {
      // Pick a colour not already used
      const usedColors = new Set(codes.map(c => c.color))
      const color = PRESET_COLORS.find(c => !usedColors.has(c)) || PRESET_COLORS[codes.length % PRESET_COLORS.length]
      existing = await onAddCode(suggestion.code, color, null)
    }
    assignCode(existing.id, existing.name, existing.color)
    setAiSuggestions([])
  }

  function renderText() {
    if (!doc) return null
    const text = doc.text || ''
    const isHtml = text.trimStart().startsWith('<')
    const docSegs = segments.filter(s => s.documentId === doc.id).sort((a, b) => a.start - b.start)

    if (isHtml) {
      // For HTML docs, inject placeholder markers then replace with React elements
      // Step 1: inject unique placeholders into the HTML string
      let html = text
      const segOrder = []
      for (const seg of docSegs) {
        const code = codes.find(c => c.id === seg.codeId)
        const color = code?.color || '#FCD34D'
        const placeholder = `__SEG_${seg.id}__`
        const escapedText = seg.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const re = new RegExp(escapedText, 'g')
        if (html.includes(seg.text)) {
          html = html.replace(re, `<span data-seg="${seg.id}" style="background:${color};border-radius:3px;padding:1px 2px;cursor:pointer;">${seg.text}</span>`)
          segOrder.push(seg.id)
        }
      }

      // Step 2: render HTML and attach click handler via event delegation
      return (
        <div
          className="docx-content"
          dangerouslySetInnerHTML={{ __html: html }}
          onClick={e => {
            const el = e.target.closest('[data-seg]')
            if (!el) return
            const segId = el.getAttribute('data-seg')
            const seg = docSegs.find(s => s.id === segId)
            if (seg) setMemoEdit(seg)
          }}
        />
      )
    }

    // Plain text — render with coded segment highlights
    if (!docSegs.length) return <span>{text}</span>
    const parts = []
    let cursor = 0
    for (const seg of docSegs) {
      const s = Math.max(0, seg.start), e = Math.min(text.length, seg.end)
      if (s >= e) continue
      if (s > cursor) parts.push(<span key={`t${cursor}`}>{text.slice(cursor, s)}</span>)
      const code = codes.find(c => c.id === seg.codeId)
      parts.push(
        <span key={seg.id} className="highlight-segment relative group"
          style={{ backgroundColor: code?.color || '#FCD34D', borderRadius: 3, padding: '1px 0' }}>
          {text.slice(s, e)}
          <span className="hidden group-hover:flex absolute bottom-full left-0 z-50 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs min-w-40 flex-col gap-1 pointer-events-auto whitespace-normal">
            <span className="font-bold text-gray-800">{code?.name || 'Unknown'}</span>
            {seg.memo && <span className="text-gray-500 italic">{seg.memo}</span>}
            <button className="text-blue-600 hover:underline text-left"
              onClick={ev => { ev.stopPropagation(); setMemoEdit(seg) }}>✏ Edit memo</button>
            <button className="text-red-500 hover:underline text-left"
              onClick={ev => { ev.stopPropagation(); onDeleteSegment(seg.id) }}>✕ Remove</button>
          </span>
        </span>
      )
      cursor = e
    }
    if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>)
    return parts
  }

  if (!doc) return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <div className="text-center"><div className="text-5xl mb-3">📄</div><p>Select a document from the sidebar</p></div>
    </div>
  )

  const hasApiKey = !!localStorage.getItem('qdi_openrouter_api_key')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="px-3 py-2 border-b bg-white flex items-center gap-2 flex-shrink-0 flex-wrap min-h-[40px]">
        <span className="text-xs font-semibold text-gray-600 truncate">{doc.name}</span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-400">{segments.filter(s => s.documentId === doc.id).length} segments</span>

        {pendingSelection ? (
          <>
            <span className="ml-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold">
              "{pendingSelection.text.slice(0, 30)}{pendingSelection.text.length > 30 ? '…' : ''}" — click a code →
            </span>
            {hasApiKey && (
              <button
                onClick={handleAISuggest}
                disabled={aiLoading}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 transition">
                {aiLoading ? '⏳ Thinking…' : '✨ AI Suggest'}
              </button>
            )}
          </>
        ) : (
          <span className="ml-auto text-xs text-gray-400">Select text, then click a code →</span>
        )}
      </div>

      {/* AI Suggestions bar */}
      {aiSuggestions.length > 0 && (
        <div className="px-3 py-2 border-b bg-purple-50 flex items-start gap-2 flex-shrink-0 flex-wrap">
          <span className="text-xs font-semibold text-purple-700 self-center">✨ AI suggests:</span>
          {aiSuggestions.map((s, i) => (
            <button key={i}
              onClick={() => applyAISuggestion(s)}
              title={s.reason}
              className="text-xs bg-white border border-purple-300 text-purple-800 px-2.5 py-1 rounded-full hover:bg-purple-100 transition font-medium">
              {s.code}
            </button>
          ))}
          <button onClick={() => setAiSuggestions([])}
            className="text-xs text-gray-400 hover:text-gray-600 ml-auto self-center">✕</button>
        </div>
      )}

      {/* AI error */}
      {aiError && (
        <div className="px-3 py-2 border-b bg-red-50 flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-red-600">{aiError}</span>
          <button onClick={() => setAiError(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">✕</button>
        </div>
      )}

      {/* Flash */}

      {/* Text */}
      <div ref={containerRef} onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto p-6 text-sm leading-8 text-gray-800 whitespace-pre-wrap font-serif bg-white cursor-text select-text">
        {renderText()}
      </div>

      {/* Memo modal */}
      {memoEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-96 shadow-xl">
            <h3 className="font-bold text-gray-800 mb-1 text-sm">Segment Options</h3>
            <p className="text-xs text-gray-500 mb-1">Code: <strong>{codes.find(c => c.id === memoEdit.codeId)?.name || '—'}</strong></p>
            <p className="text-xs text-gray-500 mb-3 italic">"{memoEdit.text.slice(0, 80)}{memoEdit.text.length > 80 ? '…' : ''}"</p>
            <textarea autoFocus defaultValue={memoEdit.memo} id="qdi-memo-input" rows={4}
              className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Add a note about this segment…" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { onDeleteSegment(memoEdit.id); setMemoEdit(null) }}
                className="text-sm text-red-500 px-3 py-1 hover:bg-red-50 rounded border border-red-200">✕ Remove</button>
              <div className="flex-1" />
              <button onClick={() => setMemoEdit(null)} className="text-sm text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={() => {
                const val = window.document.getElementById('qdi-memo-input')?.value || ''
                onUpdateSegment(memoEdit.id, { memo: val })
                setMemoEdit(null)
              }} className="text-sm bg-[#00335B] text-white px-4 py-1 rounded hover:bg-blue-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick memo modal — appears immediately after code assignment */}
      {quickMemo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-96 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: quickMemo.color }} />
              <h3 className="font-bold text-gray-800 text-sm">Add Memo for <span style={{ color: quickMemo.color }}>{quickMemo.codeName}</span></h3>
            </div>
            <p className="text-xs text-gray-400 mb-3 italic">"{quickMemo.text.slice(0, 80)}{quickMemo.text.length > 80 ? '…' : ''}"</p>

            {/* Memo type selector */}
            <div className="flex gap-2 mb-2 flex-wrap">
              {['Reflection','Review','Note','Question','Summary'].map(type => {
                const colors = { Reflection:'#818CF8', Review:'#F59E0B', Note:'#10B981', Question:'#EF4444', Summary:'#0EA5E9' }
                const bgs = { Reflection:'#EEF2FF', Review:'#FFFBEB', Note:'#ECFDF5', Question:'#FEF2F2', Summary:'#F0F9FF' }
                const isSelected = (quickMemo.memoType || 'Note') === type
                return (
                  <button key={type}
                    onClick={() => setQuickMemo(q => ({ ...q, memoType: type }))}
                    className="text-xs px-2 py-0.5 rounded-full border font-semibold transition"
                    style={{ backgroundColor: isSelected ? colors[type] : bgs[type], color: isSelected ? 'white' : colors[type], borderColor: colors[type] }}>
                    {type}
                  </button>
                )
              })}
            </div>

            <textarea
              autoFocus
              id="qdi-quick-memo-input"
              rows={3}
              placeholder="Write your memo here… (optional)"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) {
                const val = window.document.getElementById('qdi-quick-memo-input')?.value || ''
                if (val.trim()) onUpdateSegment(quickMemo.segId, { memo: val })
                setQuickMemo(null)
              }}}
              className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setQuickMemo(null)}
                className="text-sm text-gray-500 px-3 py-1.5 hover:bg-gray-100 rounded">Skip</button>
              <button onClick={() => {
                const val = window.document.getElementById('qdi-quick-memo-input')?.value || ''
                if (val.trim()) onUpdateSegment(quickMemo.segId, { memo: val })
                setQuickMemo(null)
              }} className="text-sm bg-[#00335B] text-white px-4 py-1.5 rounded hover:bg-blue-800 font-semibold">
                Save Memo
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Ctrl+Enter to save · Skip to code without memo</p>
          </div>
        </div>
      )}
    </div>
  )
}
