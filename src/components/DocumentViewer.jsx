import { useState, useRef, useEffect } from 'react'

export default function DocumentViewer({ document: doc, segments, codes, onAddSegment, onDeleteSegment, onUpdateSegment, pendingSelection, onSelectionChange }) {
  const [memoEdit, setMemoEdit] = useState(null)
  const [flash, setFlash] = useState(null)
  const containerRef = useRef()

  useEffect(() => { onSelectionChange(null) }, [doc?.id])

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

      // Keep selection visible and notify parent
      onSelectionChange({ text, start, end })
    }, 10)
  }

  function assignCode(codeId, codeName, color) {
    if (!pendingSelection) return
    onAddSegment(doc.id, pendingSelection.text, codeId, pendingSelection.start, pendingSelection.end)
    onSelectionChange(null)
    window.getSelection()?.removeAllRanges()
    setFlash({ text: pendingSelection.text.slice(0, 40), codeName })
    setTimeout(() => setFlash(null), 2500)
  }

  // Expose assignCode so parent (CodeManager) can call it
  useEffect(() => {
    if (onSelectionChange.__setAssign) onSelectionChange.__setAssign(assignCode)
  })

  function renderText() {
    if (!doc) return null
    const text = doc.text || ''
    const docSegs = segments.filter(s => s.documentId === doc.id).sort((a, b) => a.start - b.start)
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="px-3 py-2 border-b bg-white flex items-center gap-2 flex-shrink-0 min-h-[36px]">
        <span className="text-xs font-semibold text-gray-600 truncate">{doc.name}</span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-400">{segments.filter(s => s.documentId === doc.id).length} segments</span>
        {pendingSelection ? (
          <span className="ml-auto text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold animate-pulse">
            "{pendingSelection.text.slice(0, 30)}{pendingSelection.text.length > 30 ? '…' : ''}" — now click a code →
          </span>
        ) : (
          <span className="ml-auto text-xs text-gray-400">Select text, then click a code in the right panel →</span>
        )}
      </div>

      {/* Flash */}
      {flash && (
        <div className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium flex-shrink-0">
          ✓ Tagged "{flash.text}{flash.text?.length >= 40 ? '…' : ''}" → <strong>{flash.codeName}</strong>
        </div>
      )}

      {/* Text */}
      <div ref={containerRef} onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto p-6 text-sm leading-8 text-gray-800 whitespace-pre-wrap font-serif bg-white cursor-text select-text">
        {renderText()}
      </div>

      {/* Memo modal */}
      {memoEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-96 shadow-xl">
            <h3 className="font-bold text-gray-800 mb-1 text-sm">Edit Memo</h3>
            <p className="text-xs text-gray-500 mb-3 italic">"{memoEdit.text.slice(0, 80)}"</p>
            <textarea autoFocus defaultValue={memoEdit.memo} id="qdi-memo-input" rows={4}
              className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Add a note…" />
            <div className="flex gap-2 mt-3 justify-end">
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
    </div>
  )
}
