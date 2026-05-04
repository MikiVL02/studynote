import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db, notes, folders, users } from '../db'
import { requireAuth } from '../middleware/auth'

export const notesRouter = new Hono()
notesRouter.use('*', requireAuth)

async function checkCloud(c: any): Promise<string | null> {
  const userId = c.get('userId')
  const [user] = db.select().from(users).where(eq(users.id, userId)).all()
  if (!user?.cloudEnabled) {
    await c.json({ error: '请先激活云存储（填写邀请码）' }, 403)
    return null
  }
  return userId
}

notesRouter.get('/sync', async (c) => {
  const userId = await checkCloud(c)
  if (!userId) return

  const userNotes = db.select().from(notes).where(eq(notes.userId, userId)).all()
  const userFolders = db.select().from(folders).where(eq(folders.userId, userId)).all()

  return c.json({
    notes: userNotes.map(n => ({ ...n, tags: JSON.parse(n.tags) })),
    folders: userFolders,
  })
})

notesRouter.post('/sync', async (c) => {
  const userId = await checkCloud(c)
  if (!userId) return

  const { notes: clientNotes, folders: clientFolders } = await c.req.json<{
    notes: any[]
    folders: any[]
  }>()

  for (const n of clientNotes ?? []) {
    db.insert(notes).values({
      id: n.id, userId, title: n.title, content: n.content,
      folderId: n.folderId ?? null, tags: JSON.stringify(n.tags ?? []),
      starred: n.starred ? 1 : 0, wordCount: n.wordCount ?? 0,
      deletedAt: n.deletedAt ?? null, createdAt: n.createdAt, updatedAt: n.updatedAt,
    }).onConflictDoUpdate({
      target: notes.id,
      set: {
        title: n.title, content: n.content, folderId: n.folderId ?? null,
        tags: JSON.stringify(n.tags ?? []), starred: n.starred ? 1 : 0,
        wordCount: n.wordCount ?? 0, deletedAt: n.deletedAt ?? null, updatedAt: n.updatedAt,
      },
    }).run()
  }

  for (const f of clientFolders ?? []) {
    db.insert(folders).values({
      id: f.id, userId, name: f.name, parentId: f.parentId ?? null,
      order: f.order ?? 0, createdAt: f.createdAt,
    }).onConflictDoUpdate({
      target: folders.id,
      set: { name: f.name, parentId: f.parentId ?? null, order: f.order ?? 0 },
    }).run()
  }

  return c.json({ synced: (clientNotes?.length ?? 0) + (clientFolders?.length ?? 0) })
})

notesRouter.put('/:id', async (c) => {
  const userId = await checkCloud(c)
  if (!userId) return
  const n = await c.req.json<any>()

  db.insert(notes).values({
    id: c.req.param('id'), userId, title: n.title, content: n.content,
    folderId: n.folderId ?? null, tags: JSON.stringify(n.tags ?? []),
    starred: n.starred ? 1 : 0, wordCount: n.wordCount ?? 0,
    deletedAt: n.deletedAt ?? null, createdAt: n.createdAt, updatedAt: n.updatedAt,
  }).onConflictDoUpdate({
    target: notes.id,
    set: {
      title: n.title, content: n.content, folderId: n.folderId ?? null,
      tags: JSON.stringify(n.tags ?? []), starred: n.starred ? 1 : 0,
      wordCount: n.wordCount ?? 0, deletedAt: n.deletedAt ?? null, updatedAt: n.updatedAt,
    },
  }).run()

  return c.json({ ok: true })
})

notesRouter.delete('/:id', async (c) => {
  const userId = await checkCloud(c)
  if (!userId) return

  db.update(notes)
    .set({ deletedAt: Date.now() })
    .where(and(eq(notes.id, c.req.param('id')), eq(notes.userId, userId)))
    .run()

  return c.json({ ok: true })
})
