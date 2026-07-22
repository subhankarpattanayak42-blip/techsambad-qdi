import { useState } from 'react'

const DEFAULT_MODEL = 'deepseek/deepseek-chat'

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
            content: `You are an expert qualitative data analyst. A researcher has selected this text segment for coding:\n\n"${selectedText}"\n\nExisting codes in their project (for reference only): ${codeList}\n\nYour task: Suggest 3 qualitative codes that BEST capture the meaning, theme, or concept in the selected text. \n- ONLY reuse an existing code if it is a genuinely strong fit for this specific text.\n- Otherwise, create NEW, precise code names that reflect what this text is actually about.\n- Codes should be specific and descriptive (e.g. "Knowledge Gap", "Resistance to Change", "Cost Justification") — not generic.\n- Do NOT just list the existing codes back.\n\nRespond ONLY with a JSON array: [{"code": "Code Name", "reason": "one sentence why this fits"}]`
          }]
        })
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error.message)
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('Model returned an empty response. Try again or switch to a different model in Settings.')
      const raw = content.trim()
      const match = raw.match(/\[[\s\S]*\]/)
      return match ? JSON.parse(match[0]) : []
    } finally {
      setLoading(false)
    }
  }

  return { suggestCodes, loading }
}
