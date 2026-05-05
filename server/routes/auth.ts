import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db, users, inviteCodes } from '../db'
import { requireAuth } from '../middleware/auth'
import { sendVerifyCode, sendResetCode } from '../lib/email'

export const authRouter = new Hono()

function nanoid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
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
  return c.json({ token, user: { id, username, cloudEnabled: false, email: null, emailVerified: false, nickname: null, avatar: null } })
})

authRouter.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: '用户名和密码不能为空' }, 400)

  const [user] = db.select().from(users).where(eq(users.username, username)).all()
  if (!user) return c.json({ error: '用户名或密码错误' }, 401)

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return c.json({ error: '用户名或密码错误' }, 401)

  const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET!, { expiresIn: '30d' })
  return c.json({ token, user: { id: user.id, username: user.username, cloudEnabled: user.cloudEnabled, email: user.email, emailVerified: user.emailVerified, nickname: user.nickname ?? null, avatar: user.avatar ?? null } })
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

// 获取当前用户信息
authRouter.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId')
  const [user] = db.select().from(users).where(eq(users.id, userId)).all()
  if (!user) return c.json({ error: '用户不存在' }, 404)
  return c.json({ id: user.id, username: user.username, cloudEnabled: user.cloudEnabled, email: user.email, emailVerified: user.emailVerified, nickname: user.nickname ?? null, avatar: user.avatar ?? null })
})

// 更新个人资料（昵称、头像）
authRouter.put('/me', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { nickname, avatar } = await c.req.json<{ nickname?: string; avatar?: string }>()
  const updates: Record<string, any> = {}
  if (nickname !== undefined) {
    if (nickname.length > 20) return c.json({ error: '昵称不超过 20 字' }, 400)
    updates.nickname = nickname.trim() || null
  }
  if (avatar !== undefined) {
    // 限制头像大小（base64 约 100KB）
    if (avatar && avatar.length > 150000) return c.json({ error: '头像不能超过 100KB' }, 400)
    updates.avatar = avatar || null
  }
  if (Object.keys(updates).length === 0) return c.json({ error: '无更新内容' }, 400)
  db.update(users).set(updates).where(eq(users.id, userId)).run()
  const [user] = db.select().from(users).where(eq(users.id, userId)).all()
  return c.json({ id: user.id, username: user.username, cloudEnabled: user.cloudEnabled, email: user.email, emailVerified: user.emailVerified, nickname: user.nickname ?? null, avatar: user.avatar ?? null })
})

// 发送邮箱绑定验证码
authRouter.post('/email/send-verify', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { email } = await c.req.json<{ email: string }>()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: '邮箱格式不正确' }, 400)

  // 检查邮箱是否已被其他用户绑定
  const existing = db.select().from(users).where(eq(users.email, email)).all()
  if (existing.some(u => u.id !== userId)) return c.json({ error: '该邮箱已被其他账号绑定' }, 409)

  const code = randomCode()
  const expiry = Date.now() + 10 * 60 * 1000
  db.update(users).set({ email, emailVerifyCode: code, emailVerifyExpiry: expiry, emailVerified: false }).where(eq(users.id, userId)).run()

  try {
    await sendVerifyCode(email, code)
  } catch {
    return c.json({ error: '邮件发送失败，请稍后再试' }, 500)
  }
  return c.json({ success: true })
})

// 验证邮箱绑定验证码
authRouter.post('/email/verify', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { code } = await c.req.json<{ code: string }>()
  if (!code) return c.json({ error: '请输入验证码' }, 400)

  const [user] = db.select().from(users).where(eq(users.id, userId)).all()
  if (!user) return c.json({ error: '用户不存在' }, 404)
  if (!user.emailVerifyCode || user.emailVerifyCode !== code.trim()) return c.json({ error: '验证码错误' }, 400)
  if (!user.emailVerifyExpiry || Date.now() > user.emailVerifyExpiry) return c.json({ error: '验证码已过期，请重新发送' }, 400)

  db.update(users).set({ emailVerified: true, emailVerifyCode: null, emailVerifyExpiry: null }).where(eq(users.id, userId)).run()
  return c.json({ success: true })
})

// 忘记密码：发送重置验证码
authRouter.post('/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email: string }>()
  if (!email) return c.json({ error: '请输入邮箱' }, 400)

  const [user] = db.select().from(users).where(eq(users.email, email)).all()
  // 无论是否找到用户都返回成功，避免枚举攻击
  if (!user || !user.emailVerified) return c.json({ success: true })

  const code = randomCode()
  const expiry = Date.now() + 10 * 60 * 1000
  db.update(users).set({ resetCode: code, resetCodeExpiry: expiry }).where(eq(users.id, user.id)).run()

  try {
    await sendResetCode(email, code)
  } catch {
    return c.json({ error: '邮件发送失败，请稍后再试' }, 500)
  }
  return c.json({ success: true })
})

// 重置密码：验证码 + 新密码
authRouter.post('/reset-password', async (c) => {
  const { email, code, newPassword } = await c.req.json<{ email: string; code: string; newPassword: string }>()
  if (!email || !code || !newPassword) return c.json({ error: '参数不完整' }, 400)
  if (newPassword.length < 6) return c.json({ error: '新密码至少 6 位' }, 400)

  const [user] = db.select().from(users).where(eq(users.email, email)).all()
  if (!user) return c.json({ error: '邮箱未绑定任何账号' }, 404)
  if (!user.resetCode || user.resetCode !== code.trim()) return c.json({ error: '验证码错误' }, 400)
  if (!user.resetCodeExpiry || Date.now() > user.resetCodeExpiry) return c.json({ error: '验证码已过期，请重新获取' }, 400)

  const passwordHash = await bcrypt.hash(newPassword, 10)
  db.update(users).set({ passwordHash, resetCode: null, resetCodeExpiry: null }).where(eq(users.id, user.id)).run()
  return c.json({ success: true })
})

// 修改密码（需要旧密码）
authRouter.post('/change-password', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { oldPassword, newPassword } = await c.req.json<{ oldPassword: string; newPassword: string }>()
  if (!oldPassword || !newPassword) return c.json({ error: '参数不完整' }, 400)
  if (newPassword.length < 6) return c.json({ error: '新密码至少 6 位' }, 400)

  const [user] = db.select().from(users).where(eq(users.id, userId)).all()
  if (!user) return c.json({ error: '用户不存在' }, 404)
  const ok = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!ok) return c.json({ error: '当前密码错误' }, 400)

  const passwordHash = await bcrypt.hash(newPassword, 10)
  db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run()
  return c.json({ success: true })
})

