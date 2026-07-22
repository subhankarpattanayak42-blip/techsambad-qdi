import { useState } from 'react'

const DEFAULT_MODEL = 'deepseek/deepseek-chat'

const SUGGESTED_MODELS = [
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (Latest) — Default' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 0324 (Free)' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' },
  { id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
]

export default function SettingsPanel() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('qdi_openrouter_api_key') || '')
  const [model, setModel] = useState(localStorage.getItem('qdi_openrouter_model') || DEFAULT_MODEL)
  const [saved, setSaved] = useState(false)

  function save() {
    localStorage.setItem('qdi_openrouter_api_key', apiKey)
    localStorage.setItem('qdi_openrouter_model', model)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Settings</h2>

      <div className="bg-white rounded-lg border p-4 max-w-md">
        <h3 className="font-semibold text-gray-800 mb-1 text-sm">✨ AI Code Suggestions</h3>
        <p className="text-xs text-gray-500 mb-3">
          Powered by <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">OpenRouter</a>.
          Your key is stored locally in your browser only — never sent to any server other than OpenRouter.
        </p>

        <label className="text-xs font-semibold text-gray-600 block mb-1">OpenRouter API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-or-…"
          className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-3 font-mono"
        />

        <label className="text-xs font-semibold text-gray-600 block mb-1">Model</label>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-1">
          {SUGGESTED_MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
          {!SUGGESTED_MODELS.find(m => m.id === model) && (
            <option value={model}>{model}</option>
          )}
        </select>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="Or type any OpenRouter model ID…"
          className="w-full border rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-300 mb-3 font-mono text-gray-500"
        />

        <button onClick={save} className="bg-[#00335B] text-white text-sm px-4 py-2 rounded hover:bg-blue-800 transition">
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>

        <p className="text-xs text-gray-400 mt-3">
          Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">openrouter.ai/keys</a>
        </p>
      </div>

      <div className="bg-white rounded-lg border p-4 max-w-md mt-4">
        <h3 className="font-semibold text-gray-800 mb-1 text-sm">ℹ️ About TechSambad QDI</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          TechSambad QDI (Qualitative Data Intelligence) is a browser-based qualitative data analysis tool inspired by QDA Miner.
          All your data is stored locally in your browser — nothing is uploaded to any server.<br /><br />
          Built by Subhankar Pattanayak · AI powered by OpenRouter
        </p>
      </div>
    </div>
  )
}
