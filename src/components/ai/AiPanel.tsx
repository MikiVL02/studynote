import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Square, FileText } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { streamAI } from '../../lib/ai'
import { extractTextFromJSON } from '../../lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

export function AiPanel() {
  const { toggleAiPanel, notes, activeNoteId } = useAppStore()
  const activeNote = notes.find(n => n.id === activeNoteId)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const noteContent = activeNote
    ? `标题：${activeNote.title}\n\n${extractTextFromJSON(activeNote.content)}`
    : ''

  const send = async (text: string) => {
    if (!text.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const assistantMsg: Message = { role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamAI(
        {
          type: 'chat',
          noteContent,
          messages: messages.concat(userMsg),
          userMessage: userMsg.content,
        },
        (chunk) => {
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content + chunk,
            }
            return next
          })
        },
        controller.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: '❌ 请求失败，请检查 API Key 和网络连接。' }
          return next
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const summarize = () => {
    if (!noteContent) return
    send('请为当前笔记生成一份简洁的摘要。')
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  return (
    <div
      className="flex flex-col h-full shrink-0"
      style={{ width: 320, borderLeft: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={15} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>AI 助手</span>
        </div>
        <button onClick={toggleAiPanel} className="toolbar-btn" title="关闭">
          <X size={15} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={summarize}
          disabled={!activeNote || streaming}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            color: activeNote ? 'var(--text)' : 'var(--text-faint)',
            cursor: activeNote ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={e => { if (activeNote) e.currentTarget.style.background = 'var(--accent-subtle)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
        >
          <FileText size={13} style={{ color: 'var(--accent)' }} />
          摘要当前笔记
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Sparkles size={28} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {activeNote ? '向 AI 提问，或点击上方按钮生成摘要' : '请先打开一篇笔记'}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-muted)',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined,
              }}
            >
              {msg.content}
              {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                <span className="ai-cursor" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-3 py-2 shrink-0 flex items-end gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder={activeNote ? '向 AI 提问…' : '请先打开笔记'}
          disabled={!activeNote}
          rows={1}
          className="flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            maxHeight: 120,
            lineHeight: 1.5,
          }}
        />
        {streaming ? (
          <button
            onClick={stop}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
            style={{ background: '#ef4444', color: '#fff' }}
            title="停止"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || !activeNote}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
            style={{
              background: input.trim() && activeNote ? 'var(--accent)' : 'var(--bg-muted)',
              color: input.trim() && activeNote ? '#fff' : 'var(--text-faint)',
            }}
            title="发送"
          >
            <Send size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
