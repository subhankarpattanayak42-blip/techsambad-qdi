import { useState } from 'react'

const PRESET_COLORS = ['#FCD34D','#86EFAC','#93C5FD','#F9A8D4','#A5B4FC','#6EE7B7','#FCA5A5','#67E8F9','#D8B4FE','#FB923C','#A3E635','#F472B6']

export default function CodeManager({ codes, segments, onAddCode, onUpdateCode, onDeleteCode, onAssign, pendingSelection }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [addingSubOf, setAddingSubOf] = useState(null) // parentId when adding sub-theme
  const [subName, setSubName] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const themes = codes.filter(c => !c.parentId)
  const subOf = (parentId) => codes.filter(c => c.parentId === parentId)

  function handleAddTheme() {
    if (!newName.trim()) return
    const color = newColor || PRESET_COLORS[codes.length % PRESET_COLORS.length]
    onAddCode(newName.trim(), color, null)
    setNewName('')
  }

  function handleAddSub(parentId, parentColor) {
    if (!subName.trim()) return
    onAddCode(subName.trim(), parentColor, parentId)
    setSubName('')
    setAddingSubOf(null)
  }

  function toggleCollapse(id) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function CodeRow({ code, depth = 0 }) {
    const count = segments.filter(s => s.codeId === code.id).length
    const children = subOf(code.id)
    const isCollapsed = collapsed[code.id]
    const canAssign = !!pendingSelection

    return (
      <div>
        <div
          onClick={() => canAssign && onAssign(code.id, code.name, code.color)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded mb-0.5 text-xs group transition border-2 ${
            canAssign
              ? 'border-blue-400 bg-blue-50 cursor-pointer hover:bg-blue-100 shadow-sm'
              : 'border-transparent hover:bg-gray-100 cursor-default'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {/* Collapse toggle */}
          {children.length > 0 ? (
            <button onClick={e => { e.stopPropagation(); toggleCollapse(code.id) }}
              className="text-gray-400 hover:text-gray-700 w-3 text-[10px] flex-shrink-0">
              {isCollapsed ? '▶' : '▼'}
            </button>
          ) : (
            <span className="w-3 flex-shrink-0" />
          )}

          <span className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
            style={{ backgroundColor: code.color }} />

          {editId === code.id ? (
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              onBlur={() => { onUpdateCode(code.id, { name: editName }); setEditId(null) }}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdateCode(code.id, { name: editName }); setEditId(null) } }}
              className="flex-1 border rounded px-1 py-0.5 text-xs outline-none"
              onClick={e => e.stopPropagation()} />
          ) : (
            <span className={`flex-1 truncate ${depth === 0 ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
              {depth > 0 && <span className="text-gray-300 mr-1">└</span>}
              {code.name}
            </span>
          )}

          <span className="text-gray-400 bg-gray-100 rounded-full px-1.5 text-[10px] flex-shrink-0">{count}</span>

          {!canAssign && (
            <div className="hidden group-hover:flex gap-1 flex-shrink-0">
              {depth === 0 && (
                <button title="Add sub-theme"
                  onClick={e => { e.stopPropagation(); setAddingSubOf(code.id); setSubName('') }}
                  className="text-green-500 hover:text-green-700 text-[10px] font-bold">+sub</button>
              )}
              <button onClick={e => { e.stopPropagation(); setEditId(code.id); setEditName(code.name) }}
                className="text-blue-500 hover:text-blue-700 text-[10px]">✏</button>
              <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${code.name}"${children.length ? ' and its sub-themes' : ''}?`)) onDeleteCode(code.id) }}
                className="text-red-400 hover:text-red-600 text-[10px]">✕</button>
            </div>
          )}
        </div>

        {/* Inline sub-theme input */}
        {addingSubOf === code.id && (
          <div className="flex gap-1 mb-1" style={{ paddingLeft: `${24 + depth * 16}px` }}>
            <input autoFocus value={subName} onChange={e => setSubName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSub(code.id, code.color); if (e.key === 'Escape') setAddingSubOf(null) }}
              placeholder="Sub-theme name…"
              className="flex-1 text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-green-400" />
            <button onClick={() => handleAddSub(code.id, code.color)}
              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">+</button>
            <button onClick={() => setAddingSubOf(null)}
              className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
          </div>
        )}

        {/* Children */}
        {!isCollapsed && children.map(child => (
          <CodeRow key={child.id} code={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pending selection banner */}
      {pendingSelection && (
        <div className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold text-center leading-relaxed">
          Click a code to tag:<br />
          <span className="font-normal opacity-90">"{pendingSelection.text.slice(0, 35)}{pendingSelection.text.length > 35 ? '…' : ''}"</span>
        </div>
      )}

      {/* Add theme */}
      <div className="p-3 border-b bg-gray-50">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
          {pendingSelection ? '👇 Click to assign:' : `Codes (${codes.length})`}
        </div>
        <div className="flex gap-1 flex-wrap mb-2">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)}
              className={`w-4 h-4 rounded-full border-2 transition ${newColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex gap-1">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTheme()}
            placeholder="New theme…"
            className="flex-1 text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400" />
          <button onClick={handleAddTheme}
            className="text-xs bg-[#00335B] text-white px-2 py-1 rounded hover:bg-blue-800">+</button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Hover a theme → click <strong>+sub</strong> to add a sub-theme</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {codes.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">No codes yet.<br />Create a theme above.</p>
        )}
        {themes.map(code => <CodeRow key={code.id} code={code} depth={0} />)}
      </div>
    </div>
  )
}
