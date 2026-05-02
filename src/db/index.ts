import Dexie, { type Table } from 'dexie'

export interface Note {
  id: string
  title: string
  content: string
  folderId: string | null
  tags: string[]
  starred: boolean
  createdAt: number
  updatedAt: number
  wordCount: number
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  order: number
  createdAt: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

class NotesDB extends Dexie {
  notes!: Table<Note>
  folders!: Table<Folder>
  tags!: Table<Tag>

  constructor() {
    super('notesapp')
    this.version(1).stores({
      notes: 'id, folderId, starred, updatedAt, createdAt, *tags',
      folders: 'id, parentId, order',
      tags: 'id, name',
    })
  }
}

export const db = new NotesDB()

// Module-level singleton prevents double-seeding under React StrictMode
let _seedPromise: Promise<void> | null = null

export function seedIfEmpty(): Promise<void> {
  if (!_seedPromise) _seedPromise = _doSeed()
  return _seedPromise
}

async function _doSeed() {
  const count = await db.notes.count()
  if (count > 0) return

  const folderId1 = crypto.randomUUID()
  const folderId2 = crypto.randomUUID()
  const now = Date.now()

  await db.folders.bulkAdd([
    { id: folderId1, name: '工作', parentId: null, order: 0, createdAt: now },
    { id: folderId2, name: '个人', parentId: null, order: 1, createdAt: now },
  ])

  await db.notes.bulkAdd([
    {
      id: crypto.randomUUID(),
      title: '项目计划',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '项目计划' }] },
          { type: 'taskList', content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '需求分析' }] }] },
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '技术选型' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '开发实现' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '测试上线' }] }] },
          ]},
        ],
      }),
      folderId: folderId1,
      tags: ['工作', '计划'],
      starred: false,
      createdAt: now - 86400000,
      updatedAt: now - 3600000,
      wordCount: 30,
    },
    {
      id: crypto.randomUUID(),
      title: '读书笔记',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '读书笔记' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '今天读了《深度工作》，记录几点感想：' }] },
          { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '深度工作是指在无干扰的专注状态下完成认知要求高的工作。' }] }] },
        ],
      }),
      folderId: folderId2,
      tags: ['阅读'],
      starred: false,
      createdAt: now - 172800000,
      updatedAt: now - 172800000,
      wordCount: 45,
    },
  ])
}

// Removes duplicate folders and notes inserted by React StrictMode double-mount.
// Groups by (name + parentId) for folders, (title + createdAt bucket) for notes.
export async function deduplicateDB() {
  // --- folders ---
  const allFolders = await db.folders.toArray()
  const folderSeen = new Map<string, string>() // key → keep id
  const folderRemap = new Map<string, string>() // deleted id → kept id

  for (const f of allFolders) {
    const key = `${f.parentId ?? ''}::${f.name}`
    if (!folderSeen.has(key)) {
      folderSeen.set(key, f.id)
    } else {
      folderRemap.set(f.id, folderSeen.get(key)!)
      await db.folders.delete(f.id)
    }
  }

  // Re-point notes that referenced a deleted folder
  if (folderRemap.size > 0) {
    const notesToFix = await db.notes.filter(n => n.folderId !== null && folderRemap.has(n.folderId!)).toArray()
    for (const n of notesToFix) {
      await db.notes.update(n.id, { folderId: folderRemap.get(n.folderId!)! })
    }
  }

  // --- notes: deduplicate by title + createdAt within 2 s window ---
  const allNotes = await db.notes.toArray()
  const noteSeen = new Map<string, number>() // key → kept createdAt

  for (const n of allNotes) {
    const bucket = Math.floor(n.createdAt / 2000)
    const key = `${n.title}::${bucket}`
    if (!noteSeen.has(key)) {
      noteSeen.set(key, n.createdAt)
    } else {
      await db.notes.delete(n.id)
    }
  }
}
