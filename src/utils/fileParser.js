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
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })

    // Group text items into lines by their Y position
    const lineMap = {}
    for (const item of content.items) {
      if (!item.str) continue
      // Round Y to nearest 2px to group items on the same line
      const y = Math.round((viewport.height - item.transform[5]) / 2) * 2
      if (!lineMap[y]) lineMap[y] = []
      lineMap[y].push({ x: item.transform[4], str: item.str })
    }

    // Sort lines top-to-bottom, items left-to-right within each line
    const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => a - b)
    const lines = sortedYs.map(y => {
      const items = lineMap[y].sort((a, b) => a.x - b.x)
      return items.map(it => it.str).join('  ')
    })

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
