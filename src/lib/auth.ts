const TOKEN_KEY = 'mikivl_token'
const API = '/api'

export type CurrentUser = { id: string; username: string; cloudEnabled: boolean }

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

export async function apiRegister(username: string, password: string): Promise<{ token: string; user: CurrentUser }> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
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

export function parseToken(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { id: payload.userId, username: payload.username, cloudEnabled: false }
  } catch {
    return null
  }
}
