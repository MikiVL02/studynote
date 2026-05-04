import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Sparkles, Square, FileText, GripHorizontal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '../../stores/appStore'
import { streamAI } from '../../lib/ai'
import { extractTextFromJSON } from '../../lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }
type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const DEFAULT_W = 360
const DEFAULT_H = 520
const MIN_W = 280
const MIN_H = 320
const MAX_W = 720
const MAX_H = 900
const HANDLE = 6 // resize handle thickness px

const RESIZE_HANDLES: { dir: ResizeDir; cursor: string; style: React.CSSProperties }[] = [
  { dir: 'n',  cursor: 'ns-resize',   style: { top: 0, left: HANDLE, right: HANDLE, height: HANDLE } },
  { dir: 's',  cursor: 'ns-resize',   style: { bottom: 0, left: HANDLE, right: HANDLE, height: HANDLE } },
  { dir: 'e',  cursor: 'ew-resize',   style: { right: 0, top: HANDLE, bottom: HANDLE, width: HANDLE } },
  { dir: 'w',  cursor: 'ew-resize',   style: { left: 0, top: HANDLE, bottom: HANDLE, width: HANDLE } },
  { dir: 'nw', cursor: 'nwse-resize', style: { top: 0, left: 0, width: HANDLE * 2, height: HANDLE * 2 } },
  { dir: 'ne', cursor: 'nesw-resize', style: { top: 0, right: 0, width: HANDLE * 2, height: HANDLE * 2 } },
  { dir: 'sw', cursor: 'nesw-resize', style: { bottom: 0, left: 0, width: HANDLE * 2, height: HANDLE * 2 } },
  { dir: 'se', cursor: 'nwse-resize', style: { bottom: 0, right: 0, width: HANDLE * 2, height: HANDLE * 2 } },
]

export function AiPanel() {
  const { toggleAiPanel, notes, activeNoteId } = useAppStore()
  const activeNote = notes.find(n => n.id === activeNoteId)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - DEFAULT_W - 24,
    y: window.innerHeight - DEFAULT_H - 24,
  }))
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })

  // refs for drag/resize so callbacks don't go stale
  const posRef = useRef(pos)
  const sizeRef = useRef(size)
  useEffect(() => { posRef.current = pos }, [pos])
  useEffect(() => { sizeRef.current = size }, [size])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const { x: origX, y: origY } = posRef.current
    const { w, h } = sizeRef.current

    const onMove = (ev: MouseEvent) => {
      const nextX = Math.max(0, Math.min(window.innerWidth - w, origX + ev.clientX - startX))
      const nextY = Math.max(0, Math.min(window.innerHeight - h, origY + ev.clientY - startY))
      setPos({ x: nextX, y: nextY })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const onResizeStart = useCallback((e: React.MouseEvent, dir: ResizeDir) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX, startY = e.clientY
    const { x: origX, y: origY } = posRef.current
    const { w: origW, h: origH } = sizeRef.current

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      let newX = origX, newY = origY, newW = origW, newH = origH

      if (dir.includes('e')) newW = Math.max(MIN_W, Math.min(MAX_W, origW + dx))
      if (dir.includes('s')) newH = Math.max(MIN_H, Math.min(MAX_H, origH + dy))
      if (dir.includes('w')) {
        newW = Math.max(MIN_W, Math.min(MAX_W, origW - dx))
        newX = origX + origW - newW
      }
      if (dir.includes('n')) {
        newH = Math.max(MIN_H, Math.min(MAX_H, origH - dy))
        newY = origY + origH - newH
      }

      setPos({ x: Math.max(0, newX), y: Math.max(0, newY) })
      setSize({ w: newW, h: newH })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const noteContent = activeNote
    ? `标题：${activeNote.title}\n\n${extractTextFromJSON(activeNote.content)}`
    : ''

  const send = async (text: string) => {
    if (!text.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamAI(
        { type: 'chat', noteContent, messages: messages.concat(userMsg), userMessage: userMsg.content },
        (chunk) => {
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + chunk }
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

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      {/* Resize handles */}
      {RESIZE_HANDLES.map(({ dir, cursor, style }) => (
        <div
          key={dir}
          onMouseDown={e => onResizeStart(e, dir)}
          style={{ position: 'absolute', zIndex: 10, cursor, ...style }}
        />
      ))}

      {/* Header / drag handle */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          borderBottom: '1px solid var(--border)',
          cursor: 'grab',
          userSelect: 'none',
          background: 'var(--bg-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={13} style={{ color: 'var(--text-faint)' }} />
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>AI 助手</span>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={toggleAiPanel}
          className="toolbar-btn"
          title="关闭"
        >
          <X size={15} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => send('请为当前笔记生成一份简洁的摘要。')}
          disabled={!activeNote || streaming}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
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
              className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-muted)',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined,
              }}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
                      li: ({children}) => <li className="mb-0.5">{children}</li>,
                      pre: ({children}) => (
                        <pre className="rounded-lg p-3 my-2 overflow-x-auto text-xs" style={{background:'var(--bg-muted)'}}>
                          {children}
                        </pre>
                      ),
                      code: ({className, children}) => (
                        <code className={`px-1 rounded text-xs ${className ?? ''}`} style={{background:'var(--bg-muted)'}}>{children}</code>
                      ),
                      strong: ({children}) => <strong style={{color:'var(--text)'}}>{children}</strong>,
                    }}
                  >{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
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
          onChange={e => {
            setInput(e.target.value)
            const el = textareaRef.current
            if (el) {
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
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
            overflow: 'auto',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {streaming ? (
          <button
            onClick={() => abortRef.current?.abort()}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: '#ef4444', color: '#fff' }}
            title="停止"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || !activeNote}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl"
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
