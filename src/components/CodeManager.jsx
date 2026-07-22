import { useState } from 'react'

const PRESET_COLORS = ['#FCD34D','#86EFAC','#93C5FD','#F9A8D4','#A5B4FC','#6EE7B7','#FCA5A5','#67E8F9','#D8B4FE','#FB923C','#A3E635','#F472B6']

export default function CodeManager({ codes, segments, onAddCode, onUpdateCode, onDeleteCode, onSelectCode, selectedCodeId }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  function handleAdd() {
    if (!newName.trim()) return
    onAddCode(newName.trim(), newColor)
    setNewName('')
    setNewColor(PRESET_COLORS[codes.length % PRESET_COLORS.length])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-gray-50">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Codes ({codes.length})</div>
        <div className="flex gap-1 flex-wrap mb-2">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition ${newColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex gap-1">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="New code…" className="flex-1 text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400" />
          <button onClick={handleAdd} className="text-xs bg-[#00335B] text-white px-2 py-1 rounded hover:bg-blue-800">+</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {codes.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">No codes yet.<br/>Create one above.</p>}
        {codes.map(code => {
          const count = segments.filter(s => s.codeId === code.id).length
          return (
            <div key={code.id}
              onClick={() => onSelectCode(selectedCodeId === code.id ? null : code.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mb-0.5 text-xs group transition ${selectedCodeId === code.id ? 'bg-blue-100 ring-1 ring-blue-400' : 'hover:bg-gray-100'}`}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: code.color }} />
              {editId === code.id ? (
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onBlur={() => { onUpdateCode(code.id, { name: editName }); setEditId(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') { onUpdateCode(code.id, { name: editName }); setEditId(null) } }}
                  className="flex-1 border rounded px-1 py-0.5 text-xs outline-none"
                  onClick={e => e.stopPropagation()} />
              ) : (
                <span className="flex-1 font-medium text-gray-800 truncate">{code.name}</span>
              )}
              <span className="text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
              <div className="hidden group-hover:flex gap-1">
                <button onClick={e => { e.stopPropagation(); setEditId(code.id); setEditName(code.name) }}
                  className="text-blue-500 hover:text-blue-700 text-[10px]">✏</button>
                <button onClick={e => { e.stopPropagation(); if (confirm(`Delete code "${code.name}"?`)) onDeleteCode(code.id) }}
                  className="text-red-400 hover:text-red-600 text-[10px]">✕</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
