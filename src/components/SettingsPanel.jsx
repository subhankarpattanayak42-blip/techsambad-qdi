import { useState } from 'react'

export default function SettingsPanel() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('qdi_claude_api_key') || '')
  const [saved, setSaved] = useState(false)

  function save() {
    localStorage.setItem('qdi_claude_api_key', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Settings</h2>
      <div className="bg-white rounded-lg border p-4 max-w-md">
        <h3 className="font-semibold text-gray-800 mb-1 text-sm">✨ Claude API Key</h3>
        <p className="text-xs text-gray-500 mb-3">Required for AI-assisted code suggestions. Your key is stored locally in your browser only — never sent to any server other than Anthropic.</p>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-ant-…"
          className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-3 font-mono"
        />
        <button onClick={save} className="bg-[#00335B] text-white text-sm px-4 py-2 rounded hover:bg-blue-800 transition">
          {saved ? '✓ Saved!' : 'Save Key'}
        </button>
        <p className="text-xs text-gray-400 mt-3">Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">console.anthropic.com</a></p>
      </div>

      <div className="bg-white rounded-lg border p-4 max-w-md mt-4">
        <h3 className="font-semibold text-gray-800 mb-1 text-sm">ℹ️ About TechSambad QDI</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          TechSambad QDI (Qualitative Data Intelligence) is a browser-based qualitative data analysis tool inspired by QDA Miner. All your data is stored locally in your browser — nothing is uploaded to any server.<br/><br/>
          Built by Subhankar Pattanayak · Powered by Claude AI
        </p>
      </div>
    </div>
  )
}
