import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, users, comments, inviteCodes, siteContent } from '../db'
import { requireAdmin } from '../middleware/auth'

export const adminRouter = new Hono()
adminRouter.use('*', requireAdmin)

function nanoid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

// 站点内容读取
adminRouter.get('/site-content', (c) => {
  const rows = db.select().from(siteContent).all()
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return c.json(result)
})

// 站点内容批量更新
adminRouter.put('/site-content', async (c) => {
  const body = await c.req.json<Record<string, string>>()
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') continue
    db.insert(siteContent).values({ key, value }).onConflictDoUpdate({ target: siteContent.key, set: { value } }).run()
  }
  return c.json({ success: true })
})

// 用户列表
adminRouter.get('/users', (c) => {
  const rows = db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    banned: users.banned,
    cloudEnabled: users.cloudEnabled,
    email: users.email,
    createdAt: users.createdAt,
  }).from(users).all()
  return c.json(rows)
})

// 封禁用户
adminRouter.post('/users/:id/ban', (c) => {
  const { id } = c.req.param()
  const [user] = db.select({ role: users.role }).from(users).where(eq(users.id, id)).all()
  if (!user) return c.json({ error: '用户不存在' }, 404)
  if (user.role === 'admin') return c.json({ error: '不能封禁管理员' }, 403)
  db.update(users).set({ banned: true }).where(eq(users.id, id)).run()
  return c.json({ success: true })
})

// 解封用户
adminRouter.post('/users/:id/unban', (c) => {
  const { id } = c.req.param()
  const [user] = db.select({ id: users.id }).from(users).where(eq(users.id, id)).all()
  if (!user) return c.json({ error: '用户不存在' }, 404)
  db.update(users).set({ banned: false }).where(eq(users.id, id)).run()
  return c.json({ success: true })
})

// 评论列表
adminRouter.get('/comments', (c) => {
  const rows = db.select({
    id: comments.id,
    content: comments.content,
    createdAt: comments.createdAt,
    userId: comments.userId,
    username: users.username,
  }).from(comments).leftJoin(users, eq(comments.userId, users.id)).all()
  return c.json(rows)
})

// 删除评论
adminRouter.delete('/comments/:id', (c) => {
  const { id } = c.req.param()
  db.delete(comments).where(eq(comments.id, id)).run()
  return c.json({ success: true })
})

// 邀请码列表
adminRouter.get('/invite-codes', (c) => {
  const rows = db.select().from(inviteCodes).all()
  return c.json(rows)
})

// 生成新邀请码
adminRouter.post('/invite-codes', (c) => {
  const code = 'MIKI-' + nanoid().toUpperCase().slice(0, 4) + '-' + nanoid().toUpperCase().slice(0, 4)
  db.insert(inviteCodes).values({ code }).run()
  return c.json({ code })
})
