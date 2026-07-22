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

// Export retrieval results to Excel using xlsx
export async function exportRetrievalXLSX(results, title) {
  const XLSX = (await import('xlsx')).default
  const wb = XLSX.utils.book_new()

  // Sheet 1 — Quotation Matrix
  const matrixRows = [['Document', 'Code / Theme', 'Segment Text', 'Position', 'Memo Type', 'Memo']]
  for (const r of results) {
    matrixRows.push([
      r.docName || '',
      r.codeName || '',
      r.text || '',
      r.start != null ? `${r.start}–${r.end}` : '',
      r.memoType || '',
      r.memoContent || '',
    ])
  }
  const ws1 = XLSX.utils.aoa_to_sheet(matrixRows)
  ws1['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Quotation Matrix')

  // Sheet 2 — Frequency table
  const freqMap = {}
  for (const r of results) {
    freqMap[r.codeName] = (freqMap[r.codeName] || 0) + 1
  }
  const freqRows = [['Code / Theme', 'Segment Count']]
  for (const [code, count] of Object.entries(freqMap).sort((a, b) => b[1] - a[1])) {
    freqRows.push([code, count])
  }
  const ws2 = XLSX.utils.aoa_to_sheet(freqRows)
  ws2['!cols'] = [{ wch: 30 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Frequency Table')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  download(new Uint8Array(buf), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `QDI_Retrieval_${title}_${new Date().toISOString().slice(0,10)}.xlsx`)
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
