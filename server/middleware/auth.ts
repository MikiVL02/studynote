import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'
import { db, users } from '../db'
import { eq } from 'drizzle-orm'

export type JwtPayload = { userId: string; username: string }

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    username: string
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401)
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    c.set('userId', payload.userId)
    c.set('username', payload.username)
    await next()
  } catch {
    return c.json({ error: 'Token 无效或已过期' }, 401)
  }
})

export const requireAdmin = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401)
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    const [user] = db.select({ role: users.role }).from(users).where(eq(users.id, payload.userId)).all()
    if (!user || user.role !== 'admin') return c.json({ error: '权限不足' }, 403)
    c.set('userId', payload.userId)
    c.set('username', payload.username)
    await next()
  } catch {
    return c.json({ error: 'Token 无效或已过期' }, 401)
  }
})
