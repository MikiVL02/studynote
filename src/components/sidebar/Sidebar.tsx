import { useState, useRef, useEffect } from 'react'
import {
  Search, Plus, Star, FileText, Folder, FolderOpen,
  ChevronRight, ChevronDown,
  Trash2, Edit2, Moon, Sun, FolderPlus, Hash, BookOpen,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { formatDate } from '../../lib/utils'
import type { Folder as FolderType, Note } from '../../db'

export function Sidebar() {
  const {
    notes, folders, activeNoteId, activeFolderId, searchQuery,
    theme, createNote, createFolder, deleteNote, deleteFolder,
    updateFolder, setActiveNote, setActiveFolder, setSearch,
    toggleTheme, toggleStar, filteredNotes,
  } = useAppStore()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderInput, setNewFolderInput] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    type: 'note' | 'folder'
    id: string
    x: number
    y: number
  } | null>(null)

  const editInputRef = useRef<HTMLInputElement>(null)
  const newFolderRef = useRef<HTMLInputElement>(null)
  const displayed = filteredNotes()

  useEffect(() => {
    if (editingFolderId && editInputRef.current) editInputRef.current.focus()
  }, [editingFolderId])

  useEffect(() => {
    if (creatingFolder && newFolderRef.current) newFolderRef.current.focus()
  }, [creatingFolder])

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const toggleFolder = (id: string) => {
    setExpandedFolders(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleRenameFolder = async (id: string) => {
    if (!newFolderName.trim()) return
    await updateFolder(id, { name: newFolderName.trim() })
    setEditingFolderId(null)
  }

  const handleCreateFolder = async () => {
    if (!newFolderInput.trim()) { setCreatingFolder(false); return }
    await createFolder(newFolderInput.trim())
    setNewFolderInput('')
    setCreatingFolder(false)
  }

  const handleNewNote = async () => {
    const folderId = typeof activeFolderId === 'string' && activeFolderId !== 'all' && activeFolderId !== 'starred'
      ? activeFolderId
      : null
    await createNote(folderId)
  }

  const rootFolders = folders.filter(f => f.parentId === null)

  return (
    <aside
      className="flex flex-col h-full shrink-0 border-r"
      style={{
        width: 260,
        background: 'var(--bg-subtle)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>我的笔记</span>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="toolbar-btn" title={theme === 'light' ? '暗色模式' : '亮色模式'}>
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button onClick={handleNewNote} className="toolbar-btn" title="新建笔记">
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
        >
          <Search size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索笔记…"
            className="bg-transparent outline-none text-sm w-full"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Nav shortcuts */}
      <nav className="px-2 space-y-0.5">
        <NavItem icon={<BookOpen size={14} />} label="使用指南" active={activeNoteId === '__welcome__'} onClick={() => setActiveNote('__welcome__')} />
        <NavItem icon={<FileText size={14} />} label="所有笔记" count={notes.length} active={activeFolderId === 'all' && activeNoteId !== '__welcome__'} onClick={() => { setActiveFolder('all'); if (activeNoteId === '__welcome__') setActiveNote(null) }} />
        <NavItem icon={<Star size={14} />} label="收藏" count={notes.filter(n => n.starred).length} active={activeFolderId === 'starred'} onClick={() => { setActiveFolder('starred'); if (activeNoteId === '__welcome__') setActiveNote(null) }} />
      </nav>

      {/* Folders section */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>文件夹</span>
        <button onClick={() => setCreatingFolder(true)} className="toolbar-btn" title="新建文件夹">
          <FolderPlus size={13} />
        </button>
      </div>

      <div className="px-2 space-y-0.5">
        {rootFolders.map(folder => (
          <FolderItem
            key={folder.id}
            folder={folder}
            depth={0}
            expanded={expandedFolders.has(folder.id)}
            active={activeFolderId === folder.id}
            editing={editingFolderId === folder.id}
            editValue={newFolderName}
            editRef={editInputRef}
            onToggle={() => toggleFolder(folder.id)}
            onClick={() => setActiveFolder(folder.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ type: 'folder', id: folder.id, x: e.clientX, y: e.clientY })
            }}
            onEditChange={setNewFolderName}
            onEditBlur={() => handleRenameFolder(folder.id)}
            onEditKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameFolder(folder.id)
              if (e.key === 'Escape') setEditingFolderId(null)
            }}
          />
        ))}

        {creatingFolder && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
            <Folder size={14} style={{ color: 'var(--accent)' }} />
            <input
              ref={newFolderRef}
              value={newFolderInput}
              onChange={e => setNewFolderInput(e.target.value)}
              onBlur={handleCreateFolder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderInput('') }
              }}
              placeholder="文件夹名称"
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: 'var(--text)' }}
            />
          </div>
        )}
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto mt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-3 py-2 flex items-center sticky top-0 z-10" style={{ background: 'var(--bg-subtle)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
            笔记{displayed.length > 0 ? ` (${displayed.length})` : ''}
          </span>
        </div>
        <div className="px-2 pb-3 space-y-0.5">
          {displayed.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--text-faint)' }}>
              <FileText size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">暂无笔记</p>
            </div>
          )}
          {displayed.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              active={activeNoteId === note.id}
              onClick={() => setActiveNote(note.id)}
              onDelete={() => deleteNote(note.id)}
              onToggleStar={() => toggleStar(note.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ type: 'note', id: note.id, x: e.clientX, y: e.clientY })
              }}
            />
          ))}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg py-1 shadow-xl"
          style={{ top: contextMenu.y, left: contextMenu.x, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 160 }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.type === 'folder' && (
            <>
              <CtxItem icon={<Edit2 size={13} />} label="重命名" onClick={() => {
                const f = folders.find(f => f.id === contextMenu.id)
                if (f) { setNewFolderName(f.name); setEditingFolderId(contextMenu.id) }
                setContextMenu(null)
              }} />
              <CtxItem icon={<Trash2 size={13} />} label="删除文件夹" danger onClick={async () => { await deleteFolder(contextMenu.id); setContextMenu(null) }} />
            </>
          )}
          {contextMenu.type === 'note' && (
            <CtxItem icon={<Trash2 size={13} />} label="删除笔记" danger onClick={async () => { await deleteNote(contextMenu.id); setContextMenu(null) }} />
          )}
        </div>
      )}
    </aside>
  )
}

function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors"
      style={{ background: active ? 'var(--accent-subtle)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: active ? 500 : 400 }}>
      {icon}
      <span className="flex-1">{label}</span>
      {(count !== undefined && count > 0) && (
        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}>{count}</span>
      )}
    </button>
  )
}

function FolderItem({ folder, depth, expanded, active, editing, editValue, editRef, onToggle, onClick, onContextMenu, onEditChange, onEditBlur, onEditKeyDown }: {
  folder: FolderType; depth: number; expanded: boolean; active: boolean; editing: boolean
  editValue: string; editRef: React.RefObject<HTMLInputElement | null>
  onToggle: () => void; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void
  onEditChange: (v: string) => void; onEditBlur: () => void; onEditKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <div
      className="flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer text-sm"
      style={{ paddingLeft: 8 + depth * 16, background: active ? 'var(--accent-subtle)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)' }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <button onClick={e => { e.stopPropagation(); onToggle() }} className="toolbar-btn" style={{ width: 16, height: 16, flexShrink: 0 }}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {expanded
        ? <FolderOpen size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        : <Folder size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      {editing ? (
        <input ref={editRef} value={editValue} onChange={e => onEditChange(e.target.value)} onBlur={onEditBlur} onKeyDown={onEditKeyDown}
          className="bg-transparent outline-none flex-1 text-sm" style={{ color: 'var(--text)' }} onClick={e => e.stopPropagation()} />
      ) : (
        <span className="flex-1 truncate" style={{ fontWeight: active ? 500 : 400 }}>{folder.name}</span>
      )}
    </div>
  )
}

function CtxItem({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left"
      style={{ color: danger ? '#ef4444' : 'var(--text)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {icon}{label}
    </button>
  )
}

function NoteItem({ note, active, onClick, onDelete, onToggleStar, onContextMenu }: {
  note: Note
  active: boolean
  onClick: () => void
  onDelete: () => void
  onToggleStar: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="px-2 py-2 rounded-lg cursor-pointer relative"
      style={{
        background: active ? 'var(--accent-subtle)' : hovered ? 'var(--bg-muted)' : 'transparent',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {note.starred && <Star size={11} style={{ color: '#f59e0b', flexShrink: 0 }} fill="currentColor" />}
          <span className="text-sm font-medium truncate" style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>
            {note.title || '无标题笔记'}
          </span>
        </div>
        {hovered ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              className="toolbar-btn"
              style={{ width: 20, height: 20, color: note.starred ? '#f59e0b' : 'var(--text-faint)' }}
              title={note.starred ? '取消收藏' : '收藏'}
              onClick={(e) => { e.stopPropagation(); onToggleStar() }}
            >
              <Star size={12} fill={note.starred ? '#f59e0b' : 'none'} />
            </button>
            <button
              className="toolbar-btn"
              style={{ width: 20, height: 20, color: '#ef4444', opacity: 0.8 }}
              title="删除笔记"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--text-faint)' }}>
            {formatDate(note.updatedAt)}
          </span>
        )}
      </div>
      {note.tags.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
              <Hash size={9} />{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
