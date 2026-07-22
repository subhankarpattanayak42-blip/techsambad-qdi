import { useState, useRef, useEffect } from 'react'
import { useAI } from '../hooks/useAI'

const COLORS = ['#FCD34D','#86EFAC','#93C5FD','#F9A8D4','#A5B4FC','#6EE7B7','#FCA5A5','#67E8F9','#D8B4FE','#FB923C']

export default function DocumentViewer({ document, segments, codes, onAddSegment, onDeleteSegment, onUpdateSegment }) {
  const [popup, setPopup] = useState(null)
  const [newCodeName, setNewCodeName] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [memoEdit, setMemoEdit] = useState(null)
  const containerRef = useRef()
  const { suggestCodes } = useAI()

  useEffect(() => { setPopup(null); setAiSuggestions([]) }, [document?.id])

  function handleMouseUp() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) return
    const range = sel.getRangeAt(0)
    const text = sel.toString().trim()
    if (!text || text.length < 3) return
    const rect = range.getBoundingClientRect()
    setPopup({ text, rect, start: getOffset(containerRef.current, range.startContainer, range.startOffset), end: getOffset(containerRef.current, range.endContainer, range.endOffset) })
    setAiSuggestions([])
    sel.removeAllRanges()
  }

  function getOffset(root, node, offset) {
    let pos = 0
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      if (walker.currentNode === node) return pos + offset
      pos += walker.currentNode.textContent.length
    }
    return pos
  }

  async function handleAISuggest() {
    if (!popup) return
    setAiLoading(true)
    try {
      const suggestions = await suggestCodes(popup.text, codes)
      setAiSuggestions(suggestions)
    } catch (e) {
      alert(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function assignCode(codeId) {
    onAddSegment(document.id, popup.text, codeId, popup.start, popup.end)
    setPopup(null); setNewCodeName('')
  }

  async function createAndAssign() {
    if (!newCodeName.trim()) return
    const color = COLORS[codes.length % COLORS.length]
    const code = await onAddSegment.__createCode(newCodeName.trim(), color)
    onAddSegment(document.id, popup.text, code.id, popup.start, popup.end)
    setPopup(null); setNewCodeName('')
  }

  function renderText() {
    if (!document) return null
    const text = document.text || ''
    const docSegs = segments.filter(s => s.documentId === document.id).sort((a, b) => a.start - b.start)
    if (!docSegs.length) return <span>{text}</span>

    const parts = []
    let cursor = 0
    for (const seg of docSegs) {
      const s = Math.max(0, seg.start), e = Math.min(text.length, seg.end)
      if (s > cursor) parts.push(<span key={`t${cursor}`}>{text.slice(cursor, s)}</span>)
      const code = codes.find(c => c.id === seg.codeId)
      parts.push(
        <span
          key={seg.id}
          className="highlight-segment relative group"
          style={{ backgroundColor: code?.color || '#FCD34D', opacity: 0.85 }}
          title={`${code?.name || 'Unknown'}: ${seg.memo || 'no memo'}`}
        >
          {text.slice(s, e)}
          <span className="hidden group-hover:flex absolute bottom-full left-0 z-50 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs min-w-36 flex-col gap-1">
            <span className="font-bold text-gray-800">{code?.name}</span>
            {seg.memo && <span className="text-gray-500 italic">{seg.memo}</span>}
            <span
              className="text-blue-600 cursor-pointer hover:underline"
              onClick={e => { e.stopPropagation(); setMemoEdit(seg) }}
            >✏ Edit memo</span>
            <span
              className="text-red-500 cursor-pointer hover:underline"
              onClick={e => { e.stopPropagation(); onDeleteSegment(seg.id) }}
            >✕ Remove</span>
          </span>
        </span>
      )
      cursor = e
    }
    if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>)
    return parts
  }

  if (!document) return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <div className="text-center"><div className="text-5xl mb-3">📄</div><p>Select a document to view</p></div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b bg-white flex items-center gap-2">
        <span className="font-semibold text-gray-800 text-sm">{document.name}</span>
        <span className="text-xs text-gray-400">{segments.filter(s => s.documentId === document.id).length} coded segments</span>
      </div>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto p-6 text-sm leading-7 text-gray-800 whitespace-pre-wrap select-text font-serif bg-white"
      >
        {renderText()}
      </div>

      {/* Code assignment popup */}
      {popup && (
        <div className="code-popup" style={{ top: Math.min(popup.rect.bottom + 8, window.innerHeight - 280), left: Math.min(popup.rect.left, window.innerWidth - 240) }}>
          <div className="text-xs font-bold text-gray-700 mb-2">"{popup.text.slice(0, 60)}{popup.text.length > 60 ? '…' : ''}"</div>
          <div className="text-xs text-gray-500 mb-2 font-semibold">Assign a code:</div>
          <div className="max-h-32 overflow-y-auto mb-2 flex flex-col gap-1">
            {codes.map(c => (
              <button key={c.id} onClick={() => assignCode(c.id)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 text-left text-xs">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            ))}
          </div>
          <div className="border-t pt-2 mb-2">
            <div className="flex gap-1">
              <input value={newCodeName} onChange={e => setNewCodeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createAndAssign()}
                placeholder="New code name…" className="flex-1 text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400" />
              <button onClick={createAndAssign} className="text-xs bg-[#00335B] text-white px-2 py-1 rounded hover:bg-blue-800">+ Add</button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <button onClick={handleAISuggest} disabled={aiLoading}
              className="text-xs text-purple-600 font-semibold hover:underline disabled:opacity-50">
              {aiLoading ? '⏳ Asking AI…' : '✨ AI Suggest'}
            </button>
            <button onClick={() => setPopup(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {aiSuggestions.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <div className="text-xs font-bold text-purple-700 mb-1">AI suggestions:</div>
              {aiSuggestions.map((s, i) => (
                <button key={i} onClick={() => {
                  const existing = codes.find(c => c.name.toLowerCase() === s.code.toLowerCase())
                  if (existing) assignCode(existing.id)
                  else { setNewCodeName(s.code) }
                  setAiSuggestions([])
                }} className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-purple-50 mb-0.5">
                  <span className="font-semibold text-purple-800">{s.code}</span>
                  <span className="text-gray-500 ml-1">— {s.reason}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Memo edit modal */}
      {memoEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-96 shadow-xl">
            <h3 className="font-bold text-gray-800 mb-1 text-sm">Edit Memo</h3>
            <p className="text-xs text-gray-500 mb-3 italic">"{memoEdit.text.slice(0, 80)}"</p>
            <textarea
              defaultValue={memoEdit.memo}
              id="memo-input"
              rows={4}
              className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Add a memo or note for this segment…"
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setMemoEdit(null)} className="text-sm text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={() => {
                onUpdateSegment(memoEdit.id, { memo: document.getElementById('memo-input').value })
                setMemoEdit(null)
              }} className="text-sm bg-[#00335B] text-white px-4 py-1 rounded hover:bg-blue-800">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
