import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db, folders, users } from '../db'
import { requireAuth } from '../middleware/auth'

export const foldersRouter = new Hono()
foldersRouter.use('*', requireAuth)

async function checkCloud(c: any): Promise<string | null> {
  const userId = c.get('userId')
  const [user] = db.select().from(users).where(eq(users.id, userId)).all()
  if (!user?.cloudEnabled) {
    await c.json({ error: '请先激活云存储（填写邀请码）' }, 403)
    return null
  }
  return userId
}

foldersRouter.put('/:id', async (c) => {
  const userId = await checkCloud(c)
  if (!userId) return
  const f = await c.req.json<any>()

  db.insert(folders).values({
    id: c.req.param('id'), userId, name: f.name,
    parentId: f.parentId ?? null, order: f.order ?? 0, createdAt: f.createdAt,
  }).onConflictDoUpdate({
    target: folders.id,
    set: { name: f.name, parentId: f.parentId ?? null, order: f.order ?? 0 },
  }).run()

  return c.json({ ok: true })
})

foldersRouter.delete('/:id', async (c) => {
  const userId = await checkCloud(c)
  if (!userId) return

  db.delete(folders)
    .where(and(eq(folders.id, c.req.param('id')), eq(folders.userId, userId)))
    .run()

  return c.json({ ok: true })
})
