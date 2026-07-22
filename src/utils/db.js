import { openDB } from 'idb'

const DB_NAME = 'techsambad-qdi'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('documents')) {
        const docs = db.createObjectStore('documents', { keyPath: 'id' })
        docs.createIndex('projectId', 'projectId')
      }
      if (!db.objectStoreNames.contains('codes')) {
        const codes = db.createObjectStore('codes', { keyPath: 'id' })
        codes.createIndex('projectId', 'projectId')
      }
      if (!db.objectStoreNames.contains('segments')) {
        const segs = db.createObjectStore('segments', { keyPath: 'id' })
        segs.createIndex('projectId', 'projectId')
        segs.createIndex('documentId', 'documentId')
        segs.createIndex('codeId', 'codeId')
      }
    },
  })
}

export function uid() {
  return crypto.randomUUID()
}
