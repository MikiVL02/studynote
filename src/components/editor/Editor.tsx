import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/extension-bubble-menu'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Image } from '@tiptap/extension-image'
import { createLowlight, common } from 'lowlight'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Highlighter, List, ListOrdered, Quote,
  Heading1, Heading2, Heading3, Minus, CheckSquare, Table as TableIcon,
  Type, Star, ImageIcon, Maximize2, Minimize2, Hash, X,
  Sparkles, Zap, Wand2, FileText as FileTextIcon, Square,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { countWords } from '../../lib/utils'
import { streamAI } from '../../lib/ai'
import { WelcomeView } from './WelcomeView'

const lowlight = createLowlight(common)

// Slash command items
const SLASH_ITEMS = [
  { label: '正文', desc: '普通段落', icon: <Type size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().setParagraph().run() },
  { label: '标题 1', desc: '大标题', icon: <Heading1 size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().setHeading({ level: 1 }).run() },
  { label: '标题 2', desc: '中标题', icon: <Heading2 size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().setHeading({ level: 2 }).run() },
  { label: '标题 3', desc: '小标题', icon: <Heading3 size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().setHeading({ level: 3 }).run() },
  { label: '无序列表', desc: '• 项目', icon: <List size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleBulletList().run() },
  { label: '有序列表', desc: '1. 项目', icon: <ListOrdered size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleOrderedList().run() },
  { label: '任务列表', desc: '☑ 待办', icon: <CheckSquare size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleTaskList().run() },
  { label: '引用', desc: '引用文本', icon: <Quote size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleBlockquote().run() },
  { label: '代码块', desc: '含语法高亮', icon: <Code size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleCodeBlock().run() },
  { label: '图片', desc: '插入图片 URL', icon: <ImageIcon size={14} />, action: (e: ReturnType<typeof useEditor>) => {
    const url = window.prompt('图片地址（URL）')
    if (url) e?.chain().focus().setImage({ src: url }).run()
  }},
  { label: '分割线', desc: '水平线', icon: <Minus size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().setHorizontalRule().run() },
  { label: '表格', desc: '插入表格', icon: <TableIcon size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
]

type SlashItem = typeof SLASH_ITEMS[0]

function SlashMenu({ items, selectedIndex, onSelect }: {
  items: SlashItem[]
  selectedIndex: number
  onSelect: (item: SlashItem) => void
}) {
  return (
    <div className="slash-menu">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`slash-menu-item ${i === selectedIndex ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item) }}
        >
          <div className="slash-menu-item-icon">{item.icon}</div>
          <div>
            <div className="slash-menu-item-label">{item.label}</div>
            <div className="slash-menu-item-desc">{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Editor() {
  const { activeNoteId, notes, updateNote, toggleStar, focusMode, toggleFocusMode, toggleAiPanel, aiPanelOpen } = useAppStore()
  const activeNote = notes.find(n => n.id === activeNoteId)

  const [title, setTitle] = useState(activeNote?.title ?? '')
  const [wordCount, setWordCount] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [tagInput, setTagInput] = useState('')

  // AI continue state
  const [aiContinuing, setAiContinuing] = useState(false)
  const aiAbortRef = useRef<AbortController | null>(null)

  // AI modal state
  const [aiModal, setAiModal] = useState<{
    type: 'polish' | 'summarize'
    from: number
    to: number
    selection: string
    result: string
    streaming: boolean
  } | null>(null)
  const aiModalAbortRef = useRef<AbortController | null>(null)

  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 })
  const slashStartPos = useRef<number | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(false)

  const filteredSlash = SLASH_ITEMS.filter(item =>
    item.label.toLowerCase().includes(slashQuery.toLowerCase())
  )

  // Exit focus mode with Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) toggleFocusMode()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focusMode, toggleFocusMode])

  const scheduleNoteSave = useCallback((content: string, wc: number) => {
    if (!activeNoteId || isLoadingRef.current) return
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      await updateNote(activeNoteId, { content, wordCount: wc })
      setSaveStatus('saved')
    }, 1000)
  }, [activeNoteId, updateNote])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder: '开始写作，或输入 / 呼出命令菜单…' }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Link.configure({ openOnClick: false }),
      BubbleMenu.configure({ pluginKey: 'bubbleMenu' }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ allowBase64: true }),
    ],
    content: activeNote?.content ? JSON.parse(activeNote.content) : '',
    onUpdate({ editor: ed }) {
      if (isLoadingRef.current) return
      const json = JSON.stringify(ed.getJSON())
      const text = ed.getText()
      const wc = countWords(text)
      setWordCount(wc)
      scheduleNoteSave(json, wc)
      checkSlashCommand(ed)
    },
    editorProps: {
      handleKeyDown(_view, event) {
        if (slashOpen) {
          if (event.key === 'ArrowDown') {
            setSlashIndex(i => (i + 1) % filteredSlash.length)
            return true
          }
          if (event.key === 'ArrowUp') {
            setSlashIndex(i => (i - 1 + filteredSlash.length) % filteredSlash.length)
            return true
          }
          if (event.key === 'Enter') {
            const item = filteredSlash[slashIndex]
            if (item && editor) executeSlash(item)
            return true
          }
          if (event.key === 'Escape') {
            setSlashOpen(false)
            return true
          }
        }
        return false
      },
      // Support drag-and-drop image files
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const file = files[0]
        if (!file.type.startsWith('image/')) return false
        event.preventDefault()
        const reader = new FileReader()
        reader.onload = () => {
          if (editor && typeof reader.result === 'string') {
            editor.chain().focus().setImage({ src: reader.result }).run()
          }
        }
        reader.readAsDataURL(file)
        return true
      },
      // Support paste image
      handlePaste(_view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (!file) continue
            event.preventDefault()
            const reader = new FileReader()
            reader.onload = () => {
              if (editor && typeof reader.result === 'string') {
                editor.chain().focus().setImage({ src: reader.result }).run()
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
    },
  })

  function checkSlashCommand(ed: NonNullable<ReturnType<typeof useEditor>>) {
    const { state } = ed
    const { selection } = state
    const { $from } = selection
    const textBefore = $from.nodeBefore?.text ?? ''
    const slashIdx = textBefore.lastIndexOf('/')

    if (slashIdx >= 0) {
      const query = textBefore.slice(slashIdx + 1)
      if (!query.includes(' ')) {
        if (slashStartPos.current === null) {
          slashStartPos.current = $from.pos - textBefore.length + slashIdx
        }
        setSlashQuery(query)
        setSlashIndex(0)

        const coords = ed.view.coordsAtPos($from.pos)
        const editorEl = ed.view.dom.closest('.editor-scroll')
        if (editorEl) {
          const rect = editorEl.getBoundingClientRect()
          setSlashPos({ top: coords.bottom - rect.top + 4, left: coords.left - rect.left })
        }
        setSlashOpen(true)
        return
      }
    }
    setSlashOpen(false)
    slashStartPos.current = null
  }

  function executeSlash(item: SlashItem) {
    if (!editor) return
    const startPos = slashStartPos.current
    if (startPos !== null) {
      const { state, dispatch } = editor.view
      const { from } = state.selection
      const tr = state.tr.delete(startPos, from)
      dispatch(tr)
    }
    item.action(editor)
    setSlashOpen(false)
    slashStartPos.current = null
  }

  useEffect(() => {
    if (!editor || !activeNote) return
    isLoadingRef.current = true
    const content = activeNote.content
      ? JSON.parse(activeNote.content)
      : { type: 'doc', content: [{ type: 'paragraph' }] }
    editor.commands.setContent(content)
    setTitle(activeNote.title)
    setWordCount(activeNote.wordCount)
    setSaveStatus('saved')
    setSlashOpen(false)
    setTagInput('')
    setTimeout(() => { isLoadingRef.current = false }, 100)
  }, [activeNoteId, editor])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!activeNoteId) return
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      updateNote(activeNoteId, { title: val })
    }, 500)
  }

  const handleAiContinue = async () => {
    if (!editor || !activeNote) return
    if (aiContinuing) { aiAbortRef.current?.abort(); return }
    const controller = new AbortController()
    aiAbortRef.current = controller
    setAiContinuing(true)
    try {
      await streamAI(
        { type: 'continue', noteContent: editor.getText() },
        (chunk) => { editor.commands.insertContent(chunk) },
        controller.signal,
      )
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    } finally {
      setAiContinuing(false)
      aiAbortRef.current = null
    }
  }

  const handleAiAction = async (type: 'polish' | 'summarize', from: number, to: number) => {
    if (!editor || !activeNote) return
    const selection = editor.state.doc.textBetween(from, to, '\n')
    const controller = new AbortController()
    aiModalAbortRef.current = controller
    setAiModal({ type, from, to, selection, result: '', streaming: true })
    try {
      await streamAI(
        { type, noteContent: editor.getText(), selection },
        (chunk) => {
          setAiModal(prev => prev ? { ...prev, result: prev.result + chunk } : null)
        },
        controller.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setAiModal(prev => prev ? { ...prev, result: '❌ 请求失败', streaming: false } : null)
        return
      }
    }
    setAiModal(prev => prev ? { ...prev, streaming: false } : null)
  }

  if (!activeNote || activeNoteId === '__welcome__') {
    return <WelcomeView />
  }

  const readingTime = Math.max(1, Math.ceil(wordCount / 250))

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full" style={{ background: 'var(--bg)' }}>
      {/* Title row */}
      <div className="px-12 pt-10 pb-0 max-w-3xl mx-auto w-full">
        <div className="flex items-start gap-2">
          <input
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="无标题"
            className="flex-1 bg-transparent outline-none text-3xl font-bold min-w-0"
            style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
          />
          <button
            onClick={handleAiContinue}
            title={aiContinuing ? '停止续写' : 'AI 续写'}
            className="toolbar-btn shrink-0 mt-2"
          >
            {aiContinuing
              ? <Square size={14} fill="currentColor" style={{ color: 'var(--accent)' }} />
              : <Zap size={14} style={{ color: 'var(--text-faint)' }} />}
          </button>
          <button
            onClick={toggleAiPanel}
            title="AI 助手"
            className="toolbar-btn shrink-0 mt-2"
          >
            <Sparkles size={14} style={{ color: aiPanelOpen ? 'var(--accent)' : 'var(--text-faint)' }} />
          </button>
          <button
            onClick={() => activeNoteId && toggleStar(activeNoteId)}
            title={activeNote.starred ? '取消收藏' : '收藏'}
            className="toolbar-btn shrink-0 mt-2"
          >
            <Star
              size={16}
              fill={activeNote.starred ? '#f59e0b' : 'none'}
              style={{ color: activeNote.starred ? '#f59e0b' : 'var(--text-faint)' }}
            />
          </button>
          <button
            onClick={toggleFocusMode}
            title={focusMode ? '退出专注模式 (Esc)' : '专注模式'}
            className="toolbar-btn shrink-0 mt-2"
          >
            {focusMode
              ? <Minimize2 size={15} style={{ color: 'var(--accent)' }} />
              : <Maximize2 size={15} style={{ color: 'var(--text-faint)' }} />}
          </button>
        </div>
      </div>

      {/* Tag row */}
      <div className="px-12 pb-2 max-w-3xl mx-auto w-full">
        <div className="flex items-center flex-wrap gap-1.5 min-h-[26px]">
          {activeNote.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              <Hash size={10} />
              {tag}
              <button
                onMouseDown={e => { e.preventDefault(); updateNote(activeNoteId!, { tags: activeNote.tags.filter(t => t !== tag) }, { silent: true }) }}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const val = tagInput.trim()
                if (val && !activeNote.tags.includes(val)) {
                  updateNote(activeNoteId!, { tags: [...activeNote.tags, val] }, { silent: true })
                }
                setTagInput('')
              } else if (e.key === 'Backspace' && tagInput === '' && activeNote.tags.length > 0) {
                updateNote(activeNoteId!, { tags: activeNote.tags.slice(0, -1) }, { silent: true })
              }
            }}
            placeholder={activeNote.tags.length === 0 ? '添加标签…' : '+'}
            className="bg-transparent outline-none text-xs"
            style={{ color: 'var(--text-muted)', minWidth: 60, width: tagInput.length * 8 + 60 }}
          />
        </div>
      </div>

      {/* Floating toolbar */}
      {editor && (
        <div style={{ position: 'fixed', zIndex: 100, pointerEvents: 'none' }}>
          <FloatingToolbar editor={editor} onPolish={handleAiAction.bind(null, 'polish')} onSummarize={handleAiAction.bind(null, 'summarize')} />
        </div>
      )}

      {/* Editor scroll */}
      <div className="flex-1 overflow-y-auto editor-scroll relative px-12 pt-4 pb-4">
        <div className="max-w-3xl mx-auto w-full relative">
          <EditorContent editor={editor} />

          {slashOpen && filteredSlash.length > 0 && (
            <div className="absolute z-50" style={{ top: slashPos.top, left: Math.max(0, slashPos.left) }}>
              <SlashMenu items={filteredSlash} selectedIndex={slashIndex} onSelect={executeSlash} />
            </div>
          )}
        </div>
      </div>

      {/* AI Result Modal */}
      {aiModal && (
        <AiResultModal
          type={aiModal.type}
          result={aiModal.result}
          streaming={aiModal.streaming}
          onInsert={() => {
            if (editor) {
              editor.chain().focus().insertContentAt({ from: aiModal.from, to: aiModal.to }, aiModal.result).run()
            }
            setAiModal(null)
          }}
          onDiscard={() => {
            aiModalAbortRef.current?.abort()
            setAiModal(null)
          }}
        />
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-12 py-2 text-xs shrink-0"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-faint)', background: 'var(--bg)' }}
      >
        <span>{wordCount} 字 · 约 {readingTime} 分钟阅读</span>
        <span style={{ color: saveStatus === 'saved' ? 'var(--text-faint)' : 'var(--accent)' }}>
          {saveStatus === 'saving' ? '保存中…' : saveStatus === 'unsaved' ? '未保存' : '已自动保存'}
        </span>
      </div>
    </div>
  )
}

function FloatingToolbar({ editor, onPolish, onSummarize }: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  onPolish: (from: number, to: number) => void
  onSummarize: (from: number, to: number) => void
}) {
  const [visible, setVisible] = useState(false)
  const [selRange, setSelRange] = useState({ from: 0, to: 0 })
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const update = () => {
      const { state, view } = editor
      const { selection } = state
      if (selection.empty) { setVisible(false); return }
      const { from, to } = selection
      setSelRange({ from, to })
      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)
      const top = Math.min(start.top, end.top) - 48
      const left = (start.left + end.left) / 2 - 110
      setPos({ top: Math.max(8, top), left: Math.max(8, left) })
      setVisible(true)
    }
    editor.on('selectionUpdate', update)
    editor.on('blur', () => setVisible(false))
    return () => { editor.off('selectionUpdate', update) }
  }, [editor])

  if (!visible) return null

  return (
    <div className="floating-toolbar" style={{ position: 'fixed', top: pos.top, left: pos.left, pointerEvents: 'auto', zIndex: 100 }}>
      <ToolbarBtn title="粗体" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={13} /></ToolbarBtn>
      <ToolbarBtn title="斜体" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={13} /></ToolbarBtn>
      <ToolbarBtn title="下划线" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={13} /></ToolbarBtn>
      <ToolbarBtn title="删除线" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={13} /></ToolbarBtn>
      <ToolbarBtn title="行内代码" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={13} /></ToolbarBtn>
      <ToolbarBtn title="高亮" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={13} /></ToolbarBtn>
      <div className="toolbar-divider" />
      <ToolbarBtn title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={13} /></ToolbarBtn>
      <ToolbarBtn title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={13} /></ToolbarBtn>
      <div className="toolbar-divider" />
      <ToolbarBtn title="引用" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={13} /></ToolbarBtn>
      <div className="toolbar-divider" />
      <ToolbarBtn title="AI 润色" active={false} onClick={() => onPolish(selRange.from, selRange.to)}><Wand2 size={13} style={{ color: 'var(--accent)' }} /></ToolbarBtn>
      <ToolbarBtn title="AI 摘要" active={false} onClick={() => onSummarize(selRange.from, selRange.to)}><FileTextIcon size={13} style={{ color: 'var(--accent)' }} /></ToolbarBtn>
    </div>
  )
}

function ToolbarBtn({ children, active, title, onClick }: {
  children: React.ReactNode; active: boolean; title?: string; onClick: () => void
}) {
  return (
    <button title={title} onMouseDown={(e) => { e.preventDefault(); onClick() }} className={`toolbar-btn ${active ? 'active' : ''}`}>
      {children}
    </button>
  )
}

function AiResultModal({ type, result, streaming, onInsert, onDiscard }: {
  type: 'polish' | 'summarize'
  result: string
  streaming: boolean
  onInsert: () => void
  onDiscard: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onDiscard}
    >
      <div
        className="rounded-2xl shadow-2xl flex flex-col"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 520, maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {type === 'polish' ? 'AI 润色结果' : 'AI 摘要结果'}
            </span>
          </div>
          <button onClick={onDiscard} className="toolbar-btn"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
          {result || <span style={{ color: 'var(--text-faint)' }}>生成中…</span>}
          {streaming && <span className="ai-cursor" />}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onDiscard} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            取消
          </button>
          <button
            onClick={onInsert}
            disabled={!result || streaming}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: result && !streaming ? 'var(--accent)' : 'var(--bg-muted)', color: result && !streaming ? '#fff' : 'var(--text-faint)' }}
          >
            {type === 'polish' ? '替换选中内容' : '插入摘要'}
          </button>
        </div>
      </div>
    </div>
  )
}
