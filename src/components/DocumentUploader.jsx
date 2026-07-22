import { useRef } from 'react'
import { parseFile } from '../utils/fileParser'

export default function DocumentUploader({ onUpload }) {
  const inputRef = useRef()

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      try {
        const text = await parseFile(file)
        onUpload(file, text)
      } catch (e) {
        alert(`Could not parse ${file.name}: ${e.message}`)
      }
    }
  }

  function onDrop(e) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => inputRef.current.click()}
      className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
    >
      <div className="text-3xl mb-2">📄</div>
      <p className="text-sm text-gray-600 font-medium">Drop files here or click to upload</p>
      <p className="text-xs text-gray-400 mt-1">Supports TXT, PDF, DOCX, XLSX</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".txt,.pdf,.docx,.xlsx,.xls"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
