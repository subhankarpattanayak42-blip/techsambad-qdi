import { useState, useEffect } from 'react'
import { getDB, uid } from '../utils/db'

export function useProject() {
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [codes, setCodes] = useState([])
  const [segments, setSegments] = useState([])
  const [memos, setMemos] = useState([])

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    const db = await getDB()
    const all = await db.getAll('projects')
    setProjects(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  async function openProject(project) {
    const db = await getDB()
    const [docs, cds, segs, mms] = await Promise.all([
      db.getAllFromIndex('documents', 'projectId', project.id),
      db.getAllFromIndex('codes', 'projectId', project.id),
      db.getAllFromIndex('segments', 'projectId', project.id),
      db.getAllFromIndex('memos', 'projectId', project.id),
    ])
    setActiveProject(project)
    setDocuments(docs)
    setCodes(cds)
    setSegments(segs)
    setMemos(mms)
  }

  async function createProject(name) {
    const db = await getDB()
    const project = { id: uid(), name, createdAt: new Date().toISOString() }
    await db.put('projects', project)
    await loadProjects()
    await openProject(project)
  }

  async function deleteProject(id) {
    const db = await getDB()
    await db.delete('projects', id)
    const [docs, cds, segs, mms] = await Promise.all([
      db.getAllFromIndex('documents', 'projectId', id),
      db.getAllFromIndex('codes', 'projectId', id),
      db.getAllFromIndex('segments', 'projectId', id),
      db.getAllFromIndex('memos', 'projectId', id),
    ])
    await Promise.all([
      ...docs.map(d => db.delete('documents', d.id)),
      ...cds.map(c => db.delete('codes', c.id)),
      ...segs.map(s => db.delete('segments', s.id)),
      ...mms.map(m => db.delete('memos', m.id)),
    ])
    if (activeProject?.id === id) {
      setActiveProject(null); setDocuments([]); setCodes([]); setSegments([]); setMemos([])
    }
    await loadProjects()
  }

  async function addDocument(file, text) {
    const db = await getDB()
    const doc = { id: uid(), projectId: activeProject.id, name: file.name, text, createdAt: new Date().toISOString() }
    await db.put('documents', doc)
    setDocuments(prev => [...prev, doc])
    return doc
  }

  async function deleteDocument(id) {
    const db = await getDB()
    await db.delete('documents', id)
    const segs = await db.getAllFromIndex('segments', 'documentId', id)
    await Promise.all(segs.map(s => db.delete('segments', s.id)))
    setDocuments(prev => prev.filter(d => d.id !== id))
    setSegments(prev => prev.filter(s => s.documentId !== id))
  }

  // parentId optional — null = top-level theme, set = sub-theme
  async function addCode(name, color, parentId = null) {
    const db = await getDB()
    const code = { id: uid(), projectId: activeProject.id, name, color, parentId, createdAt: new Date().toISOString() }
    await db.put('codes', code)
    setCodes(prev => [...prev, code])
    return code
  }

  async function updateCode(id, updates) {
    const db = await getDB()
    const code = await db.get('codes', id)
    const updated = { ...code, ...updates }
    await db.put('codes', updated)
    setCodes(prev => prev.map(c => c.id === id ? updated : c))
  }

  async function deleteCode(id) {
    const db = await getDB()
    await db.delete('codes', id)
    // Also delete child codes
    const children = codes.filter(c => c.parentId === id)
    await Promise.all(children.map(c => db.delete('codes', c.id)))
    const segs = await db.getAllFromIndex('segments', 'codeId', id)
    await Promise.all(segs.map(s => db.delete('segments', s.id)))
    setCodes(prev => prev.filter(c => c.id !== id && c.parentId !== id))
    setSegments(prev => prev.filter(s => s.codeId !== id))
  }

  async function addSegment(documentId, text, codeId, start, end) {
    const db = await getDB()
    const seg = { id: uid(), projectId: activeProject.id, documentId, text, codeId, start, end, createdAt: new Date().toISOString() }
    await db.put('segments', seg)
    setSegments(prev => [...prev, seg])
    return seg
  }

  async function updateSegment(id, updates) {
    const db = await getDB()
    const seg = await db.get('segments', id)
    const updated = { ...seg, ...updates }
    await db.put('segments', updated)
    setSegments(prev => prev.map(s => s.id === id ? updated : s))
  }

  async function deleteSegment(id) {
    const db = await getDB()
    await db.delete('segments', id)
    // Also delete memos attached to this segment
    const segMemos = await db.getAllFromIndex('memos', 'segmentId', id)
    await Promise.all(segMemos.map(m => db.delete('memos', m.id)))
    setSegments(prev => prev.filter(s => s.id !== id))
    setMemos(prev => prev.filter(m => m.segmentId !== id))
  }

  // Memos: type = 'Reflection' | 'Review' | 'Note' | 'Question' | 'Summary'
  // attachTo: { segmentId } or { documentId } or {} (project-level)
  async function addMemo(content, type, attachTo = {}) {
    const db = await getDB()
    const memo = {
      id: uid(),
      projectId: activeProject.id,
      content,
      type,
      segmentId: attachTo.segmentId || null,
      documentId: attachTo.documentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.put('memos', memo)
    setMemos(prev => [...prev, memo])
    return memo
  }

  async function updateMemo(id, updates) {
    const db = await getDB()
    const memo = await db.get('memos', id)
    const updated = { ...memo, ...updates, updatedAt: new Date().toISOString() }
    await db.put('memos', updated)
    setMemos(prev => prev.map(m => m.id === id ? updated : m))
  }

  async function deleteMemo(id) {
    const db = await getDB()
    await db.delete('memos', id)
    setMemos(prev => prev.filter(m => m.id !== id))
  }

  return {
    projects, activeProject, documents, codes, segments, memos,
    createProject, deleteProject, openProject,
    addDocument, deleteDocument,
    addCode, updateCode, deleteCode,
    addSegment, updateSegment, deleteSegment,
    addMemo, updateMemo, deleteMemo,
  }
}
