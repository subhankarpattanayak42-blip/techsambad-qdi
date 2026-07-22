import { exportCSV, exportJSON } from '../utils/export'

export default function ExportPanel({ project, segments, codes, documents }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Export</h2>
      <div className="grid grid-cols-1 gap-4 max-w-md">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-800 mb-1 text-sm">📊 Export as CSV</h3>
          <p className="text-xs text-gray-500 mb-3">All coded segments with code name, document, and memo. Opens in Excel.</p>
          <button onClick={() => exportCSV(segments, codes, documents)}
            className="w-full bg-[#00335B] text-white text-sm py-2 rounded hover:bg-blue-800 transition">
            Download CSV
          </button>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-800 mb-1 text-sm">💾 Export as JSON</h3>
          <p className="text-xs text-gray-500 mb-3">Full project backup — documents, codes, and all segments. Use to restore later.</p>
          <button onClick={() => exportJSON(project, documents, codes, segments)}
            className="w-full bg-gray-700 text-white text-sm py-2 rounded hover:bg-gray-800 transition">
            Download JSON
          </button>
        </div>
      </div>
    </div>
  )
}
