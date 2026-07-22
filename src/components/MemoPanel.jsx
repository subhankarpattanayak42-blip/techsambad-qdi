import { useState } from 'react'

export const MEMO_TYPES = [
  { type: 'Reflection', color: '#818CF8', bg: '#EEF2FF', label: '🪞 Reflection', desc: 'Personal insight or interpretation' },
  { type: 'Review', color: '#F59E0B', bg: '#FFFBEB', label: '🔍 Review', desc: 'Analytical comment or critique' },
  { type: 'Note', color: '#10B981', bg: '#ECFDF5', label: '📝 Note', desc: 'General observation or reminder' },
  { type: 'Question', color: '#EF4444', bg: '#FEF2F2', label: '❓ Question', desc: 'Something to investigate further' },
  { type: 'Summary', color: '#0EA5E9', bg: '#F0F9FF', label: '📋 Summary', desc: 'Synthesis or conclusion' },
]

export function getMemoStyle(type) {
  return MEMO_TYPES.find(m => m.type === type) || MEMO_TYPES[2]
}

export default function MemoPanel({ memos, segments, documents, codes, onAddMemo, onUpdateMemo, onDeleteMemo, activeDocId }) {
  const [form, setForm] = useState({ content: '', type: 'Note', scope: 'document' })
  const [editId, setEditId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [filterType, setFilterType] = useState('')

  const docMemos = memos.filter(m => {
    if (filterType && m.type !== filterType) return false
    if (activeDocId) return m.documentId === activeDocId || m.segmentId && segments.find(s => s.id === m.segmentId && s.documentId === activeDocId)
    return true
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function handleAdd() {
    if (!form.content.trim()) return
    const attachTo = activeDocId ? { documentId: activeDocId } : {}
    onAddMemo(form.content.trim(), form.type, attachTo)
    setForm(f => ({ ...f, content: '' }))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Memo type legend */}
      <div className="px-3 pt-3 pb-2 border-b bg-gray-50">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Memo Types</div>
        <div className="flex flex-wrap gap-1 mb-3">
          {MEMO_TYPES.map(m => (
            <button key={m.type}
              onClick={() => setFilterType(filterType === m.type ? '' : m.type)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition ${filterType === m.type ? 'opacity-100 shadow' : 'opacity-60 hover:opacity-100'}`}
              style={{ backgroundColor: m.bg, color: m.color, borderColor: m.color }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Add memo form */}
        <div className="flex gap-1 mb-1">
          {MEMO_TYPES.map(m => (
            <button key={m.type}
              onClick={() => setForm(f => ({ ...f, type: m.type }))}
              title={m.type}
              className={`w-5 h-5 rounded-full border-2 transition flex-shrink-0 ${form.type === m.type ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: m.color }} />
          ))}
          <span className="text-xs text-gray-500 ml-1 self-center">{getMemoStyle(form.type).label}</span>
        </div>
        <textarea
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAdd() }}
          placeholder={`Write a ${form.type.toLowerCase()} memo… (Ctrl+Enter to save)`}
          rows={3}
          className="w-full text-xs border rounded p-2 outline-none focus:ring-2 resize-none mb-1"
          style={{ focusBorderColor: getMemoStyle(form.type).color }}
        />
        <button onClick={handleAdd}
          className="w-full text-xs text-white py-1 rounded font-semibold transition"
          style={{ backgroundColor: getMemoStyle(form.type).color }}>
          + Add {form.type} Memo
        </button>
      </div>

      {/* Memo list */}
      <div className="flex-1 overflow-y-auto p-2">
        {docMemos.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-6">No memos yet.<br />Write one above.</p>
        )}
        {docMemos.map(memo => {
          const style = getMemoStyle(memo.type)
          const linkedSeg = segments.find(s => s.id === memo.segmentId)
          const linkedDoc = documents.find(d => d.id === memo.documentId)
          return (
            <div key={memo.id} className="mb-2 rounded-lg border p-2.5 text-xs"
              style={{ backgroundColor: style.bg, borderColor: style.color + '60' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: style.color, color: 'white' }}>
                  {style.label}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(memo.id); setEditContent(memo.content) }}
                    className="text-[10px] hover:underline" style={{ color: style.color }}>✏</button>
                  <button onClick={() => onDeleteMemo(memo.id)}
                    className="text-[10px] text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>

              {editId === memo.id ? (
                <div>
                  <textarea autoFocus value={editContent} onChange={e => setEditContent(e.target.value)}
                    rows={3} className="w-full text-xs border rounded p-1 outline-none resize-none mb-1" />
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setEditId(null)} className="text-[10px] text-gray-500 hover:underline">Cancel</button>
                    <button onClick={() => { onUpdateMemo(memo.id, { content: editContent }); setEditId(null) }}
                      className="text-[10px] text-white px-2 py-0.5 rounded" style={{ backgroundColor: style.color }}>Save</button>
                  </div>
                </div>
              ) : (
                <p className="leading-relaxed text-gray-800 whitespace-pre-wrap">{memo.content}</p>
              )}

              <div className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1">
                {linkedSeg && <span className="bg-white px-1.5 py-0.5 rounded border truncate max-w-[120px]" title={linkedSeg.text}>📌 "{linkedSeg.text.slice(0, 25)}…"</span>}
                {linkedDoc && !linkedSeg && <span className="bg-white px-1.5 py-0.5 rounded border">📄 {linkedDoc.name}</span>}
                <span className="ml-auto">{new Date(memo.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
