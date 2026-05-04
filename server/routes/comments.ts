import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db, comments, users } from '../db'
import { requireAuth } from '../middleware/auth'

export const commentsRouter = new Hono()

commentsRouter.get('/', async (c) => {
  const rows = db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      username: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .orderBy(desc(comments.createdAt))
    .limit(100)
    .all()

  return c.json(rows)
})

commentsRouter.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  const username = c.get('username')
  const { content } = await c.req.json<{ content: string }>()

  if (!content?.trim()) return c.json({ error: '评论不能为空' }, 400)
  if (content.length > 500) return c.json({ error: '评论不超过 500 字' }, 400)

  const id = Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
  db.insert(comments).values({ id, userId, content: content.trim(), createdAt: Date.now() }).run()

  return c.json({ id, username, content: content.trim(), createdAt: Date.now() })
})
