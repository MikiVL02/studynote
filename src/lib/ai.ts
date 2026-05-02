export type AIStreamRequest = {
  type: 'continue' | 'polish' | 'summarize' | 'translate' | 'chat'
  noteContent: string
  selection?: string
  messages?: { role: 'user' | 'assistant'; content: string }[]
  userMessage?: string
}

export async function streamAI(
  payload: AIStreamRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(`AI request failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data) as { delta?: string; error?: string }
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.delta) onChunk(parsed.delta)
      } catch {
        // ignore malformed lines
      }
    }
  }
}
