import { useEffect, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import WordCloud from 'wordcloud'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function AnalysisPanel({ segments, codes, documents }) {
  const wcRef = useRef()

  const codeFreq = codes.map(c => ({
    name: c.name,
    color: c.color,
    count: segments.filter(s => s.codeId === c.id).length
  })).sort((a, b) => b.count - a.count)

  useEffect(() => {
    if (!wcRef.current) return
    const allText = segments.map(s => s.text).join(' ')
    const wordCounts = {}
    allText.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
      if (w.length > 3) wordCounts[w] = (wordCounts[w] || 0) + 1
    })
    const list = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 80)
    if (list.length) WordCloud(wcRef.current, { list, gridSize: 8, weightFactor: 6, fontFamily: 'system-ui', color: () => `hsl(${Math.random()*360},60%,45%)`, rotateRatio: 0.3, backgroundColor: '#f9fafb' })
  }, [segments])

  const chartData = {
    labels: codeFreq.map(c => c.name),
    datasets: [{
      label: 'Segments coded',
      data: codeFreq.map(c => c.count),
      backgroundColor: codeFreq.map(c => c.color),
      borderRadius: 4,
    }]
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Analysis</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Documents', value: documents.length, icon: '📄' },
          { label: 'Codes', value: codes.length, icon: '🏷' },
          { label: 'Segments', value: segments.length, icon: '✂️' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border p-3 text-center">
            <div className="text-2xl">{s.icon}</div>
            <div className="text-2xl font-bold text-[#00335B]">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {codeFreq.length > 0 && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="text-xs font-bold text-gray-600 uppercase mb-3">Code Frequency</h3>
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
        </div>
      )}

      {/* Word cloud */}
      {segments.length > 0 && (
        <div className="bg-gray-50 rounded-lg border p-4">
          <h3 className="text-xs font-bold text-gray-600 uppercase mb-3">Word Cloud (coded text)</h3>
          <canvas ref={wcRef} width={600} height={250} className="w-full rounded" />
        </div>
      )}

      {segments.length === 0 && (
        <div className="text-center text-gray-400 mt-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm">No coded segments yet.<br/>Start coding text to see analysis.</p>
        </div>
      )}
    </div>
  )
}
