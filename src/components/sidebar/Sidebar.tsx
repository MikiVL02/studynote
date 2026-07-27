import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Star, FileText, Folder, FolderOpen,
  ChevronRight, ChevronDown,
  Trash2, Edit2, Moon, Sun, FolderPlus, Hash, BookOpen,
  ArrowUpDown, Check, X, Bot, Upload,
} from 'lucide-react'
import { ModelSettingsModal } from '../ai/ModelSettingsModal'
import { importMarkdown, importTxt, importDocx, importPDF } from '../../lib/import'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  useSensor, useSensors, MouseSensor, TouchSensor,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../../stores/appStore'
import { TrashView } from './TrashView'
import { formatDate } from '../../lib/utils'
import type { Folder as FolderType, Note } from '../../db'
import { UserMenu } from '../auth/UserMenu'

export function Sidebar() {
  const {
    notes, folders, activeNoteId, activeFolderId, searchQuery,
    theme, createNote, createFolder, deleteNote, deleteFolder,
    updateNote, updateFolder, setActiveNote, setActiveFolder, setSearch,
    toggleTheme, toggleStar, filteredNotes,
    activeTag, setActiveTag, sortBy, sortOrder, setSortBy, setSortOrder,
    trashNotes,
  } = useAppStore()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderInput, setNewFolderInput] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteEditValue, setNoteEditValue] = useState('')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [contextMenu, setContextMenu] = useState<{
    type: 'note' | 'folder'
    id: string
    x: number
    y: number
  } | null>(null)
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const editInputRef = useRef<HTMLInputElement | null>(null)
  const noteEditRef = useRef<HTMLInputElement | null>(null)
  const newFolderRef = useRef<HTMLInputElement | null>(null)
  const displayed = filteredNotes()

  useEffect(() => {
    const t = setTimeout(() => setSearch(localSearch), 300)
    return () => clearTimeout(t)
  }, [localSearch, setSearch])

  useEffect(() => {
    if (editingFolderId && editInputRef.current) editInputRef.current.focus()
  }, [editingFolderId])

  useEffect(() => {
    if (editingNoteId && noteEditRef.current) noteEditRef.current.focus()
  }, [editingNoteId])

  useEffect(() => {
    if (creatingFolder && newFolderRef.current) newFolderRef.current.focus()
  }, [creatingFolder])

  useEffect(() => {
    const close = () => { setContextMenu(null); setSortMenuOpen(false) }
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

  const handleRenameNote = async (id: string) => {
    await updateNote(id, { title: noteEditValue.trim() || '无标题笔记' })
    setEditingNoteId(null)
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

  const importFileRef = useRef<HTMLInputElement>(null)

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const folderId = typeof activeFolderId === 'string' && activeFolderId !== 'all' && activeFolderId !== 'starred'
      ? activeFolderId
      : null
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    let result: { title: string; content: string }
    if (ext === 'md' || ext === 'markdown') {
      result = importMarkdown(await file.text())
    } else if (ext === 'txt') {
      result = importTxt(await file.text())
    } else if (ext === 'docx') {
      result = await importDocx(await file.arrayBuffer())
    } else if (ext === 'pdf') {
      result = await importPDF(await file.arrayBuffer())
    } else {
      return
    }
    await createNote(folderId, result)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingNoteId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingNoteId(null)
    if (event.over) {
      updateNote(event.active.id as string, { folderId: event.over.id as string })
    }
  }

  const draggingNote = draggingNoteId ? notes.find(n => n.id === draggingNoteId) : null

  const renderFolder = (parentId: string | null, depth: number): React.ReactNode =>
    folders
      .filter(f => f.parentId === parentId)
      .map(folder => (
        <div key={folder.id}>
          <DroppableFolderItem
            folder={folder}
            depth={depth}
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
            onDelete={() => setDeleteFolderConfirm(folder.id)}
          />
          {expandedFolders.has(folder.id) && renderFolder(folder.id, depth + 1)}
        </div>
      ))

  const SORT_OPTIONS: { by: typeof sortBy; order: typeof sortOrder; label: string }[] = [
    { by: 'updatedAt', order: 'desc', label: '最近修改' },
    { by: 'createdAt', order: 'desc', label: '最近创建' },
    { by: 'title', order: 'asc', label: '标题 A–Z' },
    { by: 'title', order: 'desc', label: '标题 Z–A' },
  ]
  const currentSort = SORT_OPTIONS.find(o => o.by === sortBy && o.order === sortOrder)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <aside
        className="flex flex-col h-full shrink-0 border-r"
        style={{ width: 260, background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="20" height="26" rx="2" stroke="#4fc3f7" strokeWidth="1.5"/>
              <line x1="10" y1="11" x2="22" y2="11" stroke="#4fc3f7" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="10" y1="16" x2="22" y2="16" stroke="#4fc3f7" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="10" y1="21" x2="17" y2="21" stroke="#4fc3f7" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="27" cy="27" r="5" fill="var(--bg-subtle)" stroke="#4fc3f7" strokeWidth="1.2"/>
              <path d="M25 27l1.5 1.5L29 25" stroke="#4fc3f7" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>笔记</span>
          </div>
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
        <div className="px-3 py-2 shrink-0">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
          >
            <Search size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="搜索笔记…"
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: 'var(--text)' }}
            />
          </div>
        </div>

        {/* Nav shortcuts */}
        <nav className="px-2 space-y-0.5 shrink-0">
          <NavItem icon={<BookOpen size={14} />} label="使用指南" active={activeNoteId === '__welcome__'} onClick={() => setActiveNote('__welcome__')} />
          <NavItem icon={<FileText size={14} />} label="所有笔记" count={notes.length} active={activeFolderId === 'all' && activeNoteId !== '__welcome__'} onClick={() => { setActiveFolder('all'); setActiveNote(null) }} />
          <NavItem icon={<Star size={14} />} label="收藏" count={notes.filter(n => n.starred).length} active={activeFolderId === 'starred'} onClick={() => { setActiveFolder('starred'); setActiveNote(null) }} />
          <NavItem
            icon={<Trash2 size={14} />}
            label="回收站"
            count={trashNotes().length || undefined}
            active={activeFolderId === 'trash'}
            onClick={() => { setActiveFolder('trash'); setActiveNote(null) }}
          />
        </nav>

        {/* Folders section */}
        <div className="px-3 pt-3 pb-1 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>文件夹</span>
          <button onClick={() => setCreatingFolder(true)} className="toolbar-btn" title="新建文件夹">
            <FolderPlus size={13} />
          </button>
        </div>

        <div className="px-2 space-y-0.5 overflow-y-auto" style={{ maxHeight: '30%' }}>
          {renderFolder(null, 0)}

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
          {activeFolderId === 'trash' ? (
            <TrashView />
          ) : (
          <>
          <div className="px-3 py-2 flex items-center justify-between sticky top-0 z-10" style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                笔记{displayed.length > 0 ? ` (${displayed.length})` : ''}
              </span>
              {activeTag && (
                <span
                  className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full cursor-pointer"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                  onClick={() => setActiveTag(null)}
                >
                  <Hash size={9} />{activeTag}<X size={9} />
                </span>
              )}
            </div>
            <div className="relative">
              <button
                className="toolbar-btn"
                title={`排序：${currentSort?.label ?? ''}`}
                onClick={e => { e.stopPropagation(); setSortMenuOpen(v => !v) }}
              >
                <ArrowUpDown size={13} />
              </button>
              {sortMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 rounded-lg py-1 z-50 shadow-xl"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 140, left: 'auto' }}
                  onClick={e => e.stopPropagation()}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => { setSortBy(opt.by); setSortOrder(opt.order); setSortMenuOpen(false) }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left"
                      style={{ color: opt.by === sortBy && opt.order === sortOrder ? 'var(--accent)' : 'var(--text)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {opt.label}
                      {opt.by === sortBy && opt.order === sortOrder && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="px-2 pb-3 space-y-0.5">
            {displayed.length === 0 && (
              <div className="text-center py-8" style={{ color: 'var(--text-faint)' }}>
                <FileText size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">暂无笔记</p>
              </div>
            )}
            {displayed.map(note => (
              <DraggableNoteItem
                key={note.id}
                note={note}
                active={activeNoteId === note.id}
                editing={editingNoteId === note.id}
                editValue={noteEditValue}
                editRef={noteEditRef}
                activeTag={activeTag}
                onEditChange={setNoteEditValue}
                onEditBlur={() => handleRenameNote(note.id)}
                onEditKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameNote(note.id)
                  if (e.key === 'Escape') setEditingNoteId(null)
                }}
                onClick={() => setActiveNote(note.id)}
                onDelete={() => setDeleteConfirm(note.id)}
                onToggleStar={() => toggleStar(note.id)}
                onTagClick={(tag) => setActiveTag(activeTag === tag ? null : tag)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ type: 'note', id: note.id, x: e.clientX, y: e.clientY })
                }}
              />
            ))}
          </div>
          </>
          )}
        </div>
        {contextMenu && (          <div
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
              <>
                <CtxItem icon={<Edit2 size={13} />} label="重命名" onClick={() => {
                  const n = notes.find(n => n.id === contextMenu.id)
                  if (n) { setNoteEditValue(n.title); setEditingNoteId(contextMenu.id) }
                  setContextMenu(null)
                }} />
                <CtxItem icon={<Trash2 size={13} />} label="删除笔记" danger onClick={() => { setDeleteConfirm(contextMenu.id); setContextMenu(null) }} />
              </>
            )}
          </div>
        )}

        {/* Bottom toolbar */}
        <div
          className="px-3 py-2 shrink-0 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setModelModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}
          >
            <Bot size={13} />
            AI 模型
          </button>
          <button
            onClick={() => importFileRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: 'var(--text-faint)' }}
            title="导入文件 (.md .txt .docx .pdf)"
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}
          >
            <Upload size={13} />
            导入
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".md,.markdown,.txt,.docx,.pdf"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
        <div className="px-3 py-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <UserMenu />
        </div>
      </aside>

      <AnimatePresence>
        {modelModalOpen && <ModelSettingsModal onClose={() => setModelModalOpen(false)} />}
      </AnimatePresence>

      {/* Drag overlay */}
      <DragOverlay>
        {draggingNote && (
          <div
            className="px-2 py-2 rounded-lg text-sm font-medium opacity-90 shadow-lg"
            style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)', width: 220 }}
          >
            {draggingNote.title || '无标题笔记'}
          </div>
        )}
      </DragOverlay>
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 320 }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>将笔记移入回收站？</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>笔记将在 30 天后永久删除，期间可随时恢复。</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >取消</button>
              <button
                onClick={async () => { await deleteNote(deleteConfirm); setDeleteConfirm(null) }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: '#ef4444', color: '#fff' }}
              >移入回收站</button>
            </div>
          </div>
        </div>
      )}
      {deleteFolderConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDeleteFolderConfirm(null)}
        >
          <div
            className="rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 320 }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>删除文件夹？</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>文件夹内的笔记将移至「所有笔记」，文件夹本身将被永久删除。</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteFolderConfirm(null)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >取消</button>
              <button
                onClick={async () => { await deleteFolder(deleteFolderConfirm); setDeleteFolderConfirm(null) }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: '#ef4444', color: '#fff' }}
              >永久删除</button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
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

function DroppableFolderItem({ folder, depth, expanded, active, editing, editValue, editRef, onToggle, onClick, onContextMenu, onEditChange, onEditBlur, onEditKeyDown, onDelete }: {
  folder: FolderType; depth: number; expanded: boolean; active: boolean; editing: boolean
  editValue: string; editRef: React.RefObject<HTMLInputElement | null>
  onToggle: () => void; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void
  onEditChange: (v: string) => void; onEditBlur: () => void; onEditKeyDown: (e: React.KeyboardEvent) => void
  onDelete: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: folder.id })
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer text-sm"
      style={{
        paddingLeft: 8 + depth * 16,
        paddingRight: 8,
        background: isOver ? 'var(--accent-subtle)' : active ? 'var(--accent-subtle)' : 'transparent',
        color: active || isOver ? 'var(--accent)' : 'var(--text-muted)',
        outline: isOver ? '2px solid var(--accent)' : 'none',
        outlineOffset: -2,
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      {hovered && !editing && (
        <button
          className="toolbar-btn"
          style={{ width: 20, height: 20, color: '#ef4444', opacity: 0.8, flexShrink: 0 }}
          title="删除文件夹"
          onClick={e => { e.stopPropagation(); onDelete() }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
        >
          <Trash2 size={12} />
        </button>
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

function DraggableNoteItem({ note, active, editing, editValue, editRef, activeTag, onEditChange, onEditBlur, onEditKeyDown, onClick, onDelete, onToggleStar, onTagClick, onContextMenu }: {
  note: Note
  active: boolean
  editing: boolean
  editValue: string
  editRef: React.RefObject<HTMLInputElement | null>
  activeTag: string | null
  onEditChange: (v: string) => void
  onEditBlur: () => void
  onEditKeyDown: (e: React.KeyboardEvent) => void
  onClick: () => void
  onDelete: () => void
  onToggleStar: () => void
  onTagClick: (tag: string) => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: note.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: active ? 'var(--accent-subtle)' : hovered ? 'var(--bg-muted)' : 'transparent',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      className="px-2 py-2 rounded-lg relative"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {note.starred && <Star size={11} style={{ color: '#f59e0b', flexShrink: 0 }} fill="currentColor" />}
          {editing ? (
            <input
              ref={editRef}
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onBlur={onEditBlur}
              onKeyDown={onEditKeyDown}
              className="bg-transparent outline-none text-sm font-medium flex-1 min-w-0"
              style={{ color: 'var(--text)' }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium truncate" style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>
              {note.title || '无标题笔记'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {hovered ? (
            <>
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
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {formatDate(note.updatedAt)}
            </span>
          )}
        </div>
      </div>
      {note.tags.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {note.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full cursor-pointer transition-colors"
              style={{
                background: activeTag === tag ? 'var(--accent-subtle)' : 'var(--bg-muted)',
                color: activeTag === tag ? 'var(--accent)' : 'var(--text-muted)',
              }}
              onClick={e => { e.stopPropagation(); onTagClick(tag) }}
            >
              <Hash size={9} />{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
