import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'txt') {
    return await file.text()
  }
  if (ext === 'pdf') {
    return await parsePDF(file)
  }
  if (ext === 'docx') {
    return await parseDOCX(file)
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return await parseExcel(file)
  }
  throw new Error(`Unsupported file type: .${ext}`)
}

async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []

  // pdf.js returns text items in reading order, with `hasEOL` marking line ends
  // and `width`/`transform[4]` giving each glyph's horizontal geometry. Using
  // that order plus geometric gap detection is far more robust than bucketing
  // by Y position alone, which MERGES text columns (left+right of a two-column
  // page share the same Y) and jumbles words. Preserving reading order keeps
  // multi-column, tables, and mixed-layout PDFs readable.
  const GAP_THRESHOLD = 1.5 // points — larger means a real word boundary

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    const lines = []
    let buf = ''
    let prevRight = null

    for (const item of content.items) {
      if (item.str === undefined) continue
      let str = item.str.trim()
      const right = item.transform[4] + (item.width || 0)

      if (!str) {
        // Empty item — just a structural/EOL marker
        if (item.hasEOL && buf) { lines.push(buf.replace(/\s+$/, '')); buf = '' }
        continue
      }

      // Word boundary: if this item starts noticeably to the right of the end
      // of the previous one, the PDF has a gap between them -> insert a space.
      if (prevRight !== null && item.transform[4] - prevRight > GAP_THRESHOLD) {
        str = ' ' + str
      }

      buf += str
      prevRight = right

      if (item.hasEOL) { lines.push(buf.replace(/\s+$/, '')); buf = ''; prevRight = null }
    }
    if (buf) lines.push(buf.replace(/\s+$/, ''))

    pages.push(lines.join('\n'))
  }
  return pages.join('\n\n--- Page Break ---\n\n')
}

async function parseDOCX(file) {
  const mammoth = (await import('mammoth')).default
  const arrayBuffer = await file.arrayBuffer()
  // Use convertToHtml to preserve tables, headings, bold etc.
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return result.value
}

async function parseExcel(file) {
  const XLSX = (await import('xlsx')).default
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const lines = []
  for (const sheetName of workbook.SheetNames) {
    lines.push(`=== Sheet: ${sheetName} ===`)
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    for (const row of rows) {
      lines.push(row.map(cell => String(cell)).join('\t'))
    }
    lines.push('')
  }
  return lines.join('\n')
}
