import { useState } from 'react'

export function useAI() {
  const [loading, setLoading] = useState(false)

  async function suggestCodes(selectedText, existingCodes) {
    const apiKey = localStorage.getItem('qdi_claude_api_key')
    if (!apiKey) throw new Error('No API key set. Please add your Claude API key in Settings.')

    setLoading(true)
    try {
      const codeList = existingCodes.map(c => c.name).join(', ') || 'none yet'
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are a qualitative data analysis assistant. A researcher has selected the following text segment:\n\n"${selectedText}"\n\nExisting codes in their project: ${codeList}\n\nSuggest 3 qualitative codes for this segment. Prefer existing codes if they fit. Format your response as a JSON array of objects: [{"code": "Code Name", "reason": "brief reason"}]. Return ONLY the JSON array, no other text.`
          }]
        })
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error.message)
      const raw = data.content[0].text.trim()
      const match = raw.match(/\[[\s\S]*\]/)
      return match ? JSON.parse(match[0]) : []
    } finally {
      setLoading(false)
    }
  }

  return { suggestCodes, loading }
}
