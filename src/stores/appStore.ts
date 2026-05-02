import { create } from 'zustand'
import { db, type Note, type Folder } from '../db'
import { generateId } from '../lib/utils'

interface AppState {
  notes: Note[]
  folders: Folder[]
  activeNoteId: string | null
  activeFolderId: string | null | 'all' | 'starred'
  searchQuery: string
  theme: 'light' | 'dark'

  // actions
  loadAll: () => Promise<void>
  createNote: (folderId?: string | null) => Promise<string>
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>

  createFolder: (name: string, parentId?: string | null) => Promise<string>
  updateFolder: (id: string, patch: Partial<Folder>) => Promise<void>
  deleteFolder: (id: string) => Promise<void>

  setActiveNote: (id: string | null) => void
  setActiveFolder: (id: string | null | 'all' | 'starred') => void
  setSearch: (q: string) => void
  toggleTheme: () => void

  filteredNotes: () => Note[]
}

export const useAppStore = create<AppState>((set, get) => ({
  notes: [],
  folders: [],
  activeNoteId: '__welcome__' as string | null,
  activeFolderId: 'all',
  searchQuery: '',
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

  loadAll: async () => {
    const [notes, folders] = await Promise.all([
      db.notes.orderBy('updatedAt').reverse().toArray(),
      db.folders.orderBy('order').toArray(),
    ])
    set({ notes, folders })
    // Keep welcome screen as default; only auto-select if already on a real note
    const cur = get().activeNoteId
    if (cur && cur !== '__welcome__' && !notes.find(n => n.id === cur)) {
      set({ activeNoteId: '__welcome__' })
    }
  },

  createNote: async (folderId = null) => {
    const id = generateId()
    const now = Date.now()
    const note: Note = {
      id,
      title: '无标题笔记',
      content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
      folderId: folderId ?? get().activeFolderId as string | null,
      tags: [],
      starred: false,
      createdAt: now,
      updatedAt: now,
      wordCount: 0,
    }
    await db.notes.add(note)
    set(s => ({ notes: [note, ...s.notes], activeNoteId: id }))
    return id
  },

  updateNote: async (id, patch) => {
    const now = Date.now()
    await db.notes.update(id, { ...patch, updatedAt: now })
    set(s => ({
      notes: s.notes.map(n =>
        n.id === id ? { ...n, ...patch, updatedAt: now } : n
      ).sort((a, b) => b.updatedAt - a.updatedAt),
    }))
  },

  deleteNote: async (id) => {
    await db.notes.delete(id)
    set(s => {
      const notes = s.notes.filter(n => n.id !== id)
      const activeNoteId = s.activeNoteId === id ? '__welcome__' : s.activeNoteId
      return { notes, activeNoteId }
    })
  },

  toggleStar: async (id) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return
    await get().updateNote(id, { starred: !note.starred })
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

  filteredNotes: () => {
    const { notes, activeFolderId, searchQuery } = get()
    let result = notes

    if (activeFolderId === 'starred') {
      result = result.filter(n => n.starred)
    } else if (activeFolderId !== 'all' && activeFolderId !== null) {
      result = result.filter(n => n.folderId === activeFolderId)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    return result
  },
}))
