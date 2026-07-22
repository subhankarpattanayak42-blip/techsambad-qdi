import { useState } from 'react'

const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash'

export function useAI() {
  const [loading, setLoading] = useState(false)

  async function suggestCodes(selectedText, existingCodes) {
    const apiKey = localStorage.getItem('qdi_openrouter_api_key')
    if (!apiKey) throw new Error('No API key set. Please add your OpenRouter API key in Settings.')

    const model = localStorage.getItem('qdi_openrouter_model') || DEFAULT_MODEL

    setLoading(true)
    try {
      const codeList = existingCodes.map(c => c.name).join(', ') || 'none yet'
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://subhankarpattanayak42-blip.github.io/techsambad-qdi/',
          'X-Title': 'TechSambad QDI',
        },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are a qualitative data analysis assistant. A researcher has selected the following text segment:\n\n"${selectedText}"\n\nExisting codes in their project: ${codeList}\n\nSuggest 3 qualitative codes for this segment. Prefer existing codes if they fit. Format your response as a JSON array of objects: [{"code": "Code Name", "reason": "brief reason"}]. Return ONLY the JSON array, no other text.`
          }]
        })
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error.message)
      const raw = data.choices[0].message.content.trim()
      const match = raw.match(/\[[\s\S]*\]/)
      return match ? JSON.parse(match[0]) : []
    } finally {
      setLoading(false)
    }
  }

  return { suggestCodes, loading }
}
