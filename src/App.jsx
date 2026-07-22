import { useState } from 'react'
import './index.css'
import Layout from './components/Layout'
import DocumentUploader from './components/DocumentUploader'
import DocumentViewer from './components/DocumentViewer'
import CodeManager from './components/CodeManager'
import SearchPanel from './components/SearchPanel'
import AnalysisPanel from './components/AnalysisPanel'
import ExportPanel from './components/ExportPanel'
import SettingsPanel from './components/SettingsPanel'
import { useProject } from './hooks/useProject'

const NAV = [
  { id: 'documents', label: '📄 Documents' },
  { id: 'codes', label: '🏷 Codes' },
  { id: 'search', label: '🔍 Search' },
  { id: 'analysis', label: '📊 Analysis' },
  { id: 'export', label: '⬇ Export' },
  { id: 'settings', label: '⚙ Settings' },
]

export default function App() {
  const [view, setView] = useState('documents')
  const [activeDocId, setActiveDocId] = useState(null)
  const [selectedCodeId, setSelectedCodeId] = useState(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const {
    projects, activeProject, documents, codes, segments,
    createProject, deleteProject, openProject,
    addDocument, deleteDocument,
    addCode, updateCode, deleteCode,
    addSegment, updateSegment, deleteSegment,
  } = useProject()

  const activeDoc = documents.find(d => d.id === activeDocId) || null

  async function handleUpload(file, text) {
    const doc = await addDocument(file, text)
    setActiveDocId(doc.id)
    setView('documents')
  }

  // Attach createCode helper to addSegment so DocumentViewer can create codes inline
  addSegment.__createCode = addCode

  // Project home screen
  if (!activeProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00335B] to-[#007DB8] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-[480px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#00335B] rounded-xl flex items-center justify-center text-[#F0AB00] font-black text-sm">QDI</div>
            <div>
              <h1 className="text-xl font-bold text-[#00335B]">TechSambad QDI</h1>
              <p className="text-xs text-gray-500">Qualitative Data Intelligence</p>
            </div>
          </div>

          <h2 className="font-semibold text-gray-700 mb-3 text-sm">Your Projects</h2>
          {projects.length === 0 && <p className="text-sm text-gray-400 mb-4">No projects yet. Create one to get started.</p>}
          <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 cursor-pointer group transition"
                onClick={() => openProject(p)}>
                <div className="w-8 h-8 bg-[#00335B] rounded-lg flex items-center justify-center text-[#F0AB00] text-xs font-bold flex-shrink-0">
                  {p.name.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id) }}
                  className="hidden group-hover:block text-red-400 hover:text-red-600 text-xs px-1">✕</button>
              </div>
            ))}
          </div>

          {showNewProject ? (
            <div className="flex gap-2">
              <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newProjectName.trim()) { createProject(newProjectName.trim()); setShowNewProject(false); setNewProjectName('') } if (e.key === 'Escape') setShowNewProject(false) }}
                placeholder="Project name…" className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => { if (newProjectName.trim()) { createProject(newProjectName.trim()); setShowNewProject(false); setNewProjectName('') }}}
                className="bg-[#00335B] text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">Create</button>
            </div>
          ) : (
            <button onClick={() => setShowNewProject(true)}
              className="w-full bg-[#00335B] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800 transition">
              + New Project
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Layout
      header={
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white opacity-90">{activeProject.name}</span>
          <span className="text-xs text-blue-200">{documents.length} docs · {codes.length} codes · {segments.length} segments</span>
          <button onClick={() => { setActiveDocId(null); openProject.__close?.() || window.location.reload() }}
            className="ml-auto text-xs text-blue-200 hover:text-white border border-blue-400/30 px-2 py-0.5 rounded hover:bg-blue-800/30 transition">
            ← Projects
          </button>
        </div>
      }
      sidebar={
        <div className="flex flex-col h-full">
          <div className="px-3 pt-4 pb-2">
            <p className="text-[10px] text-blue-300 uppercase tracking-widest mb-2">Navigation</p>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                className={`w-full text-left text-xs px-3 py-2 rounded mb-0.5 transition font-medium ${view === n.id ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
                {n.label}
              </button>
            ))}
          </div>
          {view === 'documents' && (
            <div className="px-3 mt-4 flex-1 overflow-y-auto">
              <p className="text-[10px] text-blue-300 uppercase tracking-widest mb-2">Documents</p>
              {documents.map(d => (
                <button key={d.id} onClick={() => setActiveDocId(d.id)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded mb-0.5 truncate transition group flex items-center gap-1 ${activeDocId === d.id ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
                  <span className="flex-1 truncate">📄 {d.name}</span>
                  <span onClick={e => { e.stopPropagation(); if (confirm(`Delete "${d.name}"?`)) { deleteDocument(d.id); if (activeDocId === d.id) setActiveDocId(null) }}}
                    className="hidden group-hover:block text-red-300 hover:text-red-100 text-[10px]">✕</span>
                </button>
              ))}
            </div>
          )}
        </div>
      }
    >
      {view === 'documents' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden">
            {documents.length === 0 || !activeDoc ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                {documents.length === 0 && (
                  <div className="w-full max-w-md">
                    <DocumentUploader onUpload={handleUpload} />
                  </div>
                )}
                {documents.length > 0 && !activeDoc && (
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">👈</div>
                    <p className="text-sm">Select a document from the sidebar</p>
                    <div className="mt-6 max-w-xs"><DocumentUploader onUpload={handleUpload} /></div>
                  </div>
                )}
              </div>
            ) : (
              <DocumentViewer
                document={activeDoc}
                segments={segments}
                codes={codes}
                onAddSegment={addSegment}
                onDeleteSegment={deleteSegment}
                onUpdateSegment={updateSegment}
              />
            )}
            {documents.length > 0 && activeDoc && (
              <div className="p-3 border-t bg-gray-50 flex-shrink-0">
                <DocumentUploader onUpload={handleUpload} />
              </div>
            )}
          </div>
          {/* Code manager side panel */}
          <div className="w-52 border-l bg-white flex flex-col overflow-hidden flex-shrink-0">
            <CodeManager
              codes={codes}
              segments={segments}
              onAddCode={addCode}
              onUpdateCode={updateCode}
              onDeleteCode={deleteCode}
              onSelectCode={setSelectedCodeId}
              selectedCodeId={selectedCodeId}
            />
          </div>
        </div>
      )}
      {view === 'codes' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r bg-white"><CodeManager codes={codes} segments={segments} onAddCode={addCode} onUpdateCode={updateCode} onDeleteCode={deleteCode} onSelectCode={setSelectedCodeId} selectedCodeId={selectedCodeId} /></div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
              {selectedCodeId ? `Segments: ${codes.find(c => c.id === selectedCodeId)?.name}` : 'All Coded Segments'}
            </h2>
            {(selectedCodeId ? segments.filter(s => s.codeId === selectedCodeId) : segments).map(seg => {
              const code = codes.find(c => c.id === seg.codeId)
              const doc = documents.find(d => d.id === seg.documentId)
              return (
                <div key={seg.id} className="bg-white rounded-lg border p-3 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {code && <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: code.color }}>{code.name}</span>}
                    <span className="text-[10px] text-gray-400">{doc?.name}</span>
                  </div>
                  <p className="text-sm text-gray-700">"{seg.text}"</p>
                  {seg.memo && <p className="text-xs text-gray-400 mt-1 italic">📝 {seg.memo}</p>}
                </div>
              )
            })}
            {segments.length === 0 && <p className="text-sm text-gray-400 text-center mt-12">No segments coded yet.</p>}
          </div>
        </div>
      )}
      {view === 'search' && <SearchPanel segments={segments} codes={codes} documents={documents} onSelectDocument={id => { setActiveDocId(id); setView('documents') }} />}
      {view === 'analysis' && <AnalysisPanel segments={segments} codes={codes} documents={documents} />}
      {view === 'export' && <ExportPanel project={activeProject} segments={segments} codes={codes} documents={documents} />}
      {view === 'settings' && <SettingsPanel />}
    </Layout>
  )
}
