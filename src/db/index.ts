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

export async function seedIfEmpty() {
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
      title: '欢迎使用笔记应用',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '欢迎使用 ✨' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '这是一款基于 Vite + React + TipTap 构建的现代笔记应用。' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '功能特性' }] },
          { type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '支持富文本编辑（标题、列表、代码块、引用等）' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '输入 / 呼出斜杠命令菜单' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '选中文字查看浮动工具栏' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '自动保存到 IndexedDB' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '文件夹分类管理' }] }] },
          ]},
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '代码示例' }] },
          { type: 'codeBlock', attrs: { language: 'typescript' }, content: [{ type: 'text', text: 'const hello = "Hello, World!"\nconsole.log(hello)' }] },
          { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '好记性不如烂笔头。开始记录你的想法吧！' }] }] },
        ],
      }),
      folderId: null,
      tags: ['入门'],
      starred: true,
      createdAt: now,
      updatedAt: now,
      wordCount: 80,
    },
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
