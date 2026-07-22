import { openDB } from 'idb'

const DB_NAME = 'techsambad-qdi'
const DB_VERSION = 2

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('projects', { keyPath: 'id' })
        const docs = db.createObjectStore('documents', { keyPath: 'id' })
        docs.createIndex('projectId', 'projectId')
        const codes = db.createObjectStore('codes', { keyPath: 'id' })
        codes.createIndex('projectId', 'projectId')
        const segs = db.createObjectStore('segments', { keyPath: 'id' })
        segs.createIndex('projectId', 'projectId')
        segs.createIndex('documentId', 'documentId')
        segs.createIndex('codeId', 'codeId')
      }
      if (oldVersion < 2) {
        // memos store: attach to segment, document, or project
        const memos = db.createObjectStore('memos', { keyPath: 'id' })
        memos.createIndex('projectId', 'projectId')
        memos.createIndex('segmentId', 'segmentId')
        memos.createIndex('documentId', 'documentId')
      }
    },
  })
}

export function uid() {
  return crypto.randomUUID()
}
