import { useState } from 'react'

const PRESET_COLORS = ['#FCD34D','#86EFAC','#93C5FD','#F9A8D4','#A5B4FC','#6EE7B7','#FCA5A5','#67E8F9','#D8B4FE','#FB923C','#A3E635','#F472B6','#34D399','#60A5FA','#FBBF24']

export default function CodeManager({ codes, segments, onAddCode, onUpdateCode, onDeleteCode, onAssign, pendingSelection }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [addingSubOf, setAddingSubOf] = useState(null)
  const [subName, setSubName] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [editCode, setEditCode] = useState(null) // code object being edited

  const themes = codes.filter(c => !c.parentId)
  const subOf = (parentId) => codes.filter(c => c.parentId === parentId)

  function handleAddTheme() {
    if (!newName.trim()) return
    onAddCode(newName.trim(), newColor, null)
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

  function saveEdit() {
    if (!editCode?.name?.trim()) return
    onUpdateCode(editCode.id, { name: editCode.name, color: editCode.color, parentId: editCode.parentId })
    setEditCode(null)
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
          className={`flex items-center gap-2 px-3 py-2 rounded mb-1 group transition border-2 ${
            canAssign
              ? 'border-blue-400 bg-blue-50 cursor-pointer hover:bg-blue-100 shadow-sm'
              : 'border-transparent hover:bg-gray-100 cursor-default'
          }`}
          style={{ paddingLeft: `${12 + depth * 18}px` }}
        >
          {/* Collapse toggle */}
          {children.length > 0 ? (
            <button onClick={e => { e.stopPropagation(); toggleCollapse(code.id) }}
              className="text-gray-400 hover:text-gray-700 w-4 text-xs flex-shrink-0">
              {isCollapsed ? '▶' : '▼'}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          <span className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300"
            style={{ backgroundColor: code.color }} />

          <span className={`flex-1 truncate text-sm ${depth === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
            {depth > 0 && <span className="text-gray-300 mr-1">└</span>}
            {code.name}
          </span>

          <span className="text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 text-xs flex-shrink-0 font-medium">{count}</span>

          {!canAssign && (
            <div className="hidden group-hover:flex gap-1 flex-shrink-0 ml-1">
              {depth === 0 && (
                <button title="Add sub-theme"
                  onClick={e => { e.stopPropagation(); setAddingSubOf(code.id); setSubName('') }}
                  className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded font-semibold">+sub</button>
              )}
              <button onClick={e => { e.stopPropagation(); setEditCode({ ...code }) }}
                className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-0.5 rounded font-semibold">Edit</button>
              <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${code.name}"${children.length ? ' and its sub-themes' : ''}?`)) onDeleteCode(code.id) }}
                className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-2 py-0.5 rounded font-semibold">Del</button>
            </div>
          )}
        </div>

        {/* Inline sub-theme input */}
        {addingSubOf === code.id && (
          <div className="flex gap-1 mb-1 px-2" style={{ paddingLeft: `${28 + depth * 18}px` }}>
            <input autoFocus value={subName} onChange={e => setSubName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSub(code.id, code.color); if (e.key === 'Escape') setAddingSubOf(null) }}
              placeholder="Sub-theme name…"
              className="flex-1 text-sm border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-green-400" />
            <button onClick={() => handleAddSub(code.id, code.color)}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">+</button>
            <button onClick={() => setAddingSubOf(null)}
              className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        )}

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
        <div className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold text-center leading-relaxed">
          Click a code to tag:<br />
          <span className="font-normal opacity-90 text-xs">"{pendingSelection.text.slice(0, 35)}{pendingSelection.text.length > 35 ? '…' : ''}"</span>
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
              className={`w-5 h-5 rounded-full border-2 transition ${newColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex gap-1">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTheme()}
            placeholder="New theme…"
            className="flex-1 text-sm border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400" />
          <button onClick={handleAddTheme}
            className="text-sm bg-[#00335B] text-white px-3 py-1.5 rounded hover:bg-blue-800 font-semibold">+</button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Hover a theme → <strong>+sub</strong> to add sub-theme · <strong>Edit</strong> to modify</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {codes.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-4">No codes yet.<br />Create a theme above.</p>
        )}
        {themes.map(code => <CodeRow key={code.id} code={code} depth={0} />)}
      </div>

      {/* Edit Modal */}
      {editCode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-80 shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-4 text-base">Edit Code</h3>

            {/* Name */}
            <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
            <input
              autoFocus
              value={editCode.name}
              onChange={e => setEditCode(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && saveEdit()}
              className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-3"
            />

            {/* Colour */}
            <label className="text-xs font-semibold text-gray-600 block mb-1">Colour</label>
            <div className="flex gap-1 flex-wrap mb-3">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setEditCode(prev => ({ ...prev, color: c }))}
                  className={`w-6 h-6 rounded-full border-2 transition ${editCode.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>

            {/* Parent — only show if this is a sub-theme OR we want to promote/demote */}
            <label className="text-xs font-semibold text-gray-600 block mb-1">Parent Theme</label>
            <select
              value={editCode.parentId || ''}
              onChange={e => setEditCode(prev => ({ ...prev, parentId: e.target.value || null }))}
              className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4">
              <option value="">— None (top-level theme)</option>
              {themes.filter(t => t.id !== editCode.id).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditCode(null)}
                className="text-sm text-gray-500 px-4 py-2 rounded hover:bg-gray-100">Cancel</button>
              <button onClick={saveEdit}
                className="text-sm bg-[#00335B] text-white px-4 py-2 rounded hover:bg-blue-800 font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
