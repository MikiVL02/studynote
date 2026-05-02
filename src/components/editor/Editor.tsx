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
import { WelcomeView } from './WelcomeView'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Highlighter, List, ListOrdered, Quote,
  Heading1, Heading2, Heading3, Minus, CheckSquare, Table as TableIcon,
  Type, Star,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { countWords } from '../../lib/utils'

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
  { label: '代码块', desc: '多行代码', icon: <Code size={14} />, action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleCodeBlock().run() },
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
  const { activeNoteId, notes, updateNote, toggleStar } = useAppStore()
  const activeNote = notes.find(n => n.id === activeNoteId)

  const [title, setTitle] = useState(activeNote?.title ?? '')
  const [wordCount, setWordCount] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')

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
      StarterKit,
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

  if (!activeNote || activeNoteId === '__welcome__') {
    return <WelcomeView />
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full" style={{ background: 'var(--bg)' }}>
      {/* Title */}
      <div className="px-12 pt-10 pb-0 max-w-3xl mx-auto w-full">
        <div className="flex items-start gap-3">
          <input
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="无标题"
            className="flex-1 bg-transparent outline-none text-3xl font-bold min-w-0"
            style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
          />
          <button
            onClick={() => activeNoteId && toggleStar(activeNoteId)}
            title={activeNote.starred ? '取消收藏' : '收藏'}
            className="toolbar-btn shrink-0 mt-2"
            style={{ width: 28, height: 28 }}
          >
            <Star
              size={16}
              fill={activeNote.starred ? '#f59e0b' : 'none'}
              style={{ color: activeNote.starred ? '#f59e0b' : 'var(--text-faint)' }}
            />
          </button>
        </div>
      </div>

      {/* Floating bubble menu rendered via portal */}
      {editor && (
        <div
          id="bubble-menu-portal"
          style={{
            position: 'fixed',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <FloatingToolbar editor={editor} />
        </div>
      )}

      {/* Editor scroll */}
      <div className="flex-1 overflow-y-auto editor-scroll relative px-12 pt-4 pb-4">
        <div className="max-w-3xl mx-auto w-full relative">
          <EditorContent editor={editor} />

          {slashOpen && filteredSlash.length > 0 && (
            <div
              className="absolute z-50"
              style={{ top: slashPos.top, left: Math.max(0, slashPos.left) }}
            >
              <SlashMenu
                items={filteredSlash}
                selectedIndex={slashIndex}
                onSelect={executeSlash}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-12 py-2 text-xs shrink-0"
        style={{
          borderTop: '1px solid var(--border)',
          color: 'var(--text-faint)',
          background: 'var(--bg)',
        }}
      >
        <span>{wordCount} 字</span>
        <span style={{ color: saveStatus === 'saved' ? 'var(--text-faint)' : 'var(--accent)' }}>
          {saveStatus === 'saving' ? '保存中…' : saveStatus === 'unsaved' ? '未保存' : '已自动保存'}
        </span>
      </div>
    </div>
  )
}

function FloatingToolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const update = () => {
      const { state, view } = editor
      const { selection } = state
      if (selection.empty) { setVisible(false); return }
      const { from, to } = selection
      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)
      const top = Math.min(start.top, end.top) - 48
      const left = (start.left + end.left) / 2 - 100
      setPos({ top: Math.max(8, top), left: Math.max(8, left) })
      setVisible(true)
    }
    editor.on('selectionUpdate', update)
    editor.on('blur', () => setVisible(false))
    return () => {
      editor.off('selectionUpdate', update)
    }
  }, [editor])

  if (!visible) return null

  return (
    <div
      className="floating-toolbar"
      style={{ position: 'fixed', top: pos.top, left: pos.left, pointerEvents: 'auto', zIndex: 100 }}
    >
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
    </div>
  )
}

function ToolbarBtn({ children, active, title, onClick }: {
  children: React.ReactNode
  active: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`toolbar-btn ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  )
}
