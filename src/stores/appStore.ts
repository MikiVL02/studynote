import { create } from 'zustand'
import { db, type Note, type Folder } from '../db'
import { generateId, extractTextFromJSON } from '../lib/utils'

interface AppState {
  notes: Note[]
  folders: Folder[]
  activeNoteId: string | null
  activeFolderId: string | null | 'all' | 'starred'
  searchQuery: string
  theme: 'light' | 'dark'
  focusMode: boolean
  aiPanelOpen: boolean
  activeTag: string | null
  sortBy: 'updatedAt' | 'createdAt' | 'title'
  sortOrder: 'asc' | 'desc'
  _notesVersion: number
  _filteredCache: { key: string; result: Note[] } | null

  // actions
  loadAll: () => Promise<void>
  createNote: (folderId?: string | null, init?: { title?: string; content?: string }) => Promise<string>
  updateNote: (id: string, patch: Partial<Note>, opts?: { silent?: boolean }) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>

  createFolder: (name: string, parentId?: string | null) => Promise<string>
  updateFolder: (id: string, patch: Partial<Folder>) => Promise<void>
  deleteFolder: (id: string) => Promise<void>

  setActiveNote: (id: string | null) => void
  setActiveFolder: (id: string | null | 'all' | 'starred') => void
  setSearch: (q: string) => void
  toggleTheme: () => void
  toggleFocusMode: () => void
  toggleAiPanel: () => void
  setActiveTag: (tag: string | null) => void
  setSortBy: (by: 'updatedAt' | 'createdAt' | 'title') => void
  setSortOrder: (order: 'asc' | 'desc') => void

  filteredNotes: () => Note[]
}

export const useAppStore = create<AppState>((set, get) => ({
  notes: [],
  folders: [],
  activeNoteId: '__welcome__' as string | null,
  activeFolderId: 'all',
  searchQuery: '',
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  focusMode: false,
  aiPanelOpen: false,
  activeTag: null,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  _notesVersion: 0,
  _filteredCache: null,

  loadAll: async () => {
    const [notes, folders] = await Promise.all([
      db.notes.orderBy('updatedAt').reverse().toArray(),
      db.folders.orderBy('order').toArray(),
    ])
    set({ notes, folders, _notesVersion: get()._notesVersion + 1, _filteredCache: null })
    // Keep welcome screen as default; only auto-select if already on a real note
    const cur = get().activeNoteId
    if (cur && cur !== '__welcome__' && !notes.find(n => n.id === cur)) {
      set({ activeNoteId: '__welcome__' })
    }
  },

  createNote: async (folderId = null, init?: { title?: string; content?: string }) => {
    const id = generateId()
    const now = Date.now()
    const note: Note = {
      id,
      title: init?.title ?? '无标题笔记',
      content: init?.content ?? JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
      folderId: folderId ?? get().activeFolderId as string | null,
      tags: [],
      starred: false,
      createdAt: now,
      updatedAt: now,
      wordCount: 0,
      deletedAt: null,
    }
    await db.notes.add(note)
    set(s => ({ notes: [note, ...s.notes], activeNoteId: id, _notesVersion: s._notesVersion + 1, _filteredCache: null }))
    return id
  },

  updateNote: async (id, patch, opts) => {
    const silent = opts?.silent ?? false
    const now = Date.now()
    const dbPatch = silent ? patch : { ...patch, updatedAt: now }
    await db.notes.update(id, dbPatch)
    set(s => ({
      notes: s.notes.map(n =>
        n.id === id ? { ...n, ...dbPatch } : n
      ).sort((a, b) => b.updatedAt - a.updatedAt),
      _notesVersion: s._notesVersion + 1,
      _filteredCache: null,
    }))
  },

  deleteNote: async (id) => {
    await db.notes.delete(id)
    set(s => {
      const notes = s.notes.filter(n => n.id !== id)
      const activeNoteId = s.activeNoteId === id ? '__welcome__' : s.activeNoteId
      return { notes, activeNoteId, _notesVersion: s._notesVersion + 1, _filteredCache: null }
    })
  },

  toggleStar: async (id) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return
    await get().updateNote(id, { starred: !note.starred }, { silent: true })
  },

  createFolder: async (name, parentId = null) => {
    const id = generateId()
    const order = get().folders.filter(f => f.parentId === parentId).length
    const folder: Folder = { id, name, parentId, order, createdAt: Date.now() }
    await db.folders.add(folder)
    set(s => ({ folders: [...s.folders, folder] }))
    return id
  },

  updateFolder: async (id, patch) => {
    await db.folders.update(id, patch)
    set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, ...patch } : f) }))
  },

  deleteFolder: async (id) => {
    const childIds = get().folders.filter(f => f.parentId === id).map(f => f.id)
    for (const cid of childIds) await get().deleteFolder(cid)
    await db.folders.delete(id)
    const notesToMove = get().notes.filter(n => n.folderId === id)
    for (const n of notesToMove) await get().updateNote(n.id, { folderId: null })
    set(s => ({ folders: s.folders.filter(f => f.id !== id) }))
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
  setActiveFolder: (id) => set({ activeFolderId: id }),
  setSearch: (q) => set({ searchQuery: q }),

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },

  toggleFocusMode: () => set(s => ({ focusMode: !s.focusMode })),
  toggleAiPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setSortBy: (by) => set({ sortBy: by }),
  setSortOrder: (order) => set({ sortOrder: order }),

  filteredNotes: () => {
    const { notes, activeFolderId, searchQuery, activeTag, sortBy, sortOrder, _notesVersion, _filteredCache } = get()
    const cacheKey = `${_notesVersion}|${activeFolderId}|${searchQuery}|${activeTag}|${sortBy}|${sortOrder}`
    if (_filteredCache?.key === cacheKey) return _filteredCache.result

    let result = notes

    if (activeFolderId === 'starred') {
      result = result.filter(n => n.starred)
    } else if (activeFolderId !== 'all' && activeFolderId !== null) {
      result = result.filter(n => n.folderId === activeFolderId)
    }

    if (activeTag) {
      result = result.filter(n => n.tags.includes(activeTag))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        extractTextFromJSON(n.content).toLowerCase().includes(q)
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title, 'zh-CN')
      } else {
        cmp = a[sortBy] - b[sortBy]
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    set({ _filteredCache: { key: cacheKey, result } })
    return result
  },
}))
