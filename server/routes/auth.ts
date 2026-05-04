import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db, users, inviteCodes } from '../db'
import { requireAuth } from '../middleware/auth'

export const authRouter = new Hono()

function nanoid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

authRouter.post('/register', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: '用户名和密码不能为空' }, 400)
  if (username.length < 2 || username.length > 20) return c.json({ error: '用户名长度 2-20 位' }, 400)
  if (password.length < 6) return c.json({ error: '密码至少 6 位' }, 400)

  const existing = db.select().from(users).where(eq(users.username, username)).all()
  if (existing.length > 0) return c.json({ error: '用户名已存在' }, 409)

  const passwordHash = await bcrypt.hash(password, 10)
  const id = nanoid()
  db.insert(users).values({ id, username, passwordHash, cloudEnabled: false, createdAt: Date.now() }).run()

  const token = jwt.sign({ userId: id, username }, process.env.JWT_SECRET!, { expiresIn: '30d' })
  return c.json({ token, user: { id, username, cloudEnabled: false } })
})

authRouter.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: '用户名和密码不能为空' }, 400)

  const [user] = db.select().from(users).where(eq(users.username, username)).all()
  if (!user) return c.json({ error: '用户名或密码错误' }, 401)

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return c.json({ error: '用户名或密码错误' }, 401)

  const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET!, { expiresIn: '30d' })
  return c.json({ token, user: { id: user.id, username: user.username, cloudEnabled: user.cloudEnabled } })
})

authRouter.post('/activate', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { code } = await c.req.json<{ code: string }>()
  if (!code) return c.json({ error: '邀请码不能为空' }, 400)

  const [invite] = db.select().from(inviteCodes).where(eq(inviteCodes.code, code.trim().toUpperCase())).all()
  if (!invite) return c.json({ error: '邀请码不存在' }, 404)
  if (invite.usedByUserId) return c.json({ error: '邀请码已被使用' }, 409)

  db.update(inviteCodes).set({ usedByUserId: userId, usedAt: Date.now() }).where(eq(inviteCodes.code, code.trim().toUpperCase())).run()
  db.update(users).set({ cloudEnabled: true }).where(eq(users.id, userId)).run()

  return c.json({ success: true })
})
