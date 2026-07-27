const TOKEN_KEY = 'mikivl_token'
const API = 'https://www.mikivl.online/api'

export type CurrentUser = { id: string; username: string; cloudEnabled: boolean; role: 'user' | 'admin'; email: string | null; emailVerified: boolean; nickname: string | null; avatar: string | null }

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiRegisterSendCode(username: string, password: string, email: string): Promise<void> {
  const res = await fetch(`${API}/auth/register/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '发送失败')
}

export async function apiRegister(email: string, code: string): Promise<{ token: string; user: CurrentUser }> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '注册失败')
  return data
}

export async function apiLogin(username: string, password: string): Promise<{ token: string; user: CurrentUser }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '登录失败')
  return data
}

export async function apiActivate(code: string): Promise<void> {
  const res = await fetch(`${API}/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '激活失败')
}

export async function apiUpdateProfile(nickname?: string, avatar?: string): Promise<CurrentUser> {
  const res = await fetch(`${API}/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ nickname, avatar }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '更新失败')
  return data
}

export async function apiChangePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ oldPassword, newPassword }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '修改失败')
}

export async function apiGetMe(): Promise<CurrentUser> {
  const res = await fetch(`${API}/auth/me`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '获取用户信息失败')
  return data
}

export async function apiSendEmailVerify(email: string): Promise<void> {
  const res = await fetch(`${API}/auth/email/send-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '发送失败')
}

export async function apiVerifyEmail(code: string): Promise<void> {
  const res = await fetch(`${API}/auth/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '验证失败')
}

export async function apiForgotPassword(email: string): Promise<void> {
  const res = await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '发送失败')
}

export async function apiResetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '重置失败')
}

export function parseToken(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { id: payload.userId, username: payload.username, cloudEnabled: false, role: 'user', email: null, emailVerified: false, nickname: null, avatar: null }
  } catch {
    return null
  }
}

export type AdminUser = { id: string; username: string; role: string; banned: boolean; cloudEnabled: boolean; email: string | null; createdAt: number }
export type AdminComment = { id: string; content: string; createdAt: number; userId: string; username: string | null }
export type InviteCode = { code: string; usedByUserId: string | null; usedAt: number | null }

export async function apiAdminGetSiteContent(): Promise<Record<string, string>> {
  const res = await fetch(`${API}/admin/site-content`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '获取失败')
  return data
}

export async function apiAdminUpdateSiteContent(content: Record<string, string>): Promise<void> {
  const res = await fetch(`${API}/admin/site-content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(content),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '更新失败')
}

export async function apiAdminGetUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API}/admin/users`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '获取失败')
  return data
}

export async function apiAdminBanUser(id: string): Promise<void> {
  const res = await fetch(`${API}/admin/users/${id}/ban`, { method: 'POST', headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '操作失败')
}

export async function apiAdminUnbanUser(id: string): Promise<void> {
  const res = await fetch(`${API}/admin/users/${id}/unban`, { method: 'POST', headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '操作失败')
}

export async function apiAdminGetComments(): Promise<AdminComment[]> {
  const res = await fetch(`${API}/admin/comments`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '获取失败')
  return data
}

export async function apiAdminDeleteComment(id: string): Promise<void> {
  const res = await fetch(`${API}/admin/comments/${id}`, { method: 'DELETE', headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '删除失败')
}

export async function apiAdminGetInviteCodes(): Promise<InviteCode[]> {
  const res = await fetch(`${API}/admin/invite-codes`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '获取失败')
  return data
}

export async function apiAdminCreateInviteCode(): Promise<{ code: string }> {
  const res = await fetch(`${API}/admin/invite-codes`, { method: 'POST', headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '生成失败')
  return data
}

