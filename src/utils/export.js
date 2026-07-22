export function exportCSV(segments, codes, documents) {
  const codeMap = Object.fromEntries(codes.map(c => [c.id, c.name]))
  const docMap = Object.fromEntries(documents.map(d => [d.id, d.name]))
  const header = ['Segment Text', 'Code', 'Document', 'Memo', 'Created At']
  const rows = segments.map(s => [
    `"${(s.text || '').replace(/"/g, '""')}"`,
    `"${codeMap[s.codeId] || ''}"`,
    `"${docMap[s.documentId] || ''}"`,
    `"${(s.memo || '').replace(/"/g, '""')}"`,
    s.createdAt || '',
  ])
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  download(csv, 'text/csv', 'qdi-export.csv')
}

export function exportJSON(project, documents, codes, segments) {
  const data = { project, documents, codes, segments, exportedAt: new Date().toISOString() }
  download(JSON.stringify(data, null, 2), 'application/json', 'qdi-project.json')
}

function download(content, type, filename) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
