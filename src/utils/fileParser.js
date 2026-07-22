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
    pages.push(content.items.map(item => item.str).join(' '))
  }
  return pages.join('\n\n')
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
