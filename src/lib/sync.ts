import type { Note, Folder } from '../db'
import { authHeaders } from './auth'

const API = 'https://www.mikivl.online/api/note'

export type SyncPayload = { notes: Note[]; folders: Folder[] }

export async function pullAll(): Promise<SyncPayload> {
  const res = await fetch(`${API}/notes/sync`, { headers: authHeaders() })
  if (!res.ok) throw new Error('同步失败')
  return res.json()
}

export async function pushAll(payload: SyncPayload): Promise<void> {
  const res = await fetch(`${API}/notes/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('推送失败')
}

export async function pushNote(note: Note): Promise<void> {
  fetch(`${API}/notes/${note.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(note),
  }).catch(() => {})
}

export async function pushFolder(folder: Folder): Promise<void> {
  fetch(`${API}/folders/${folder.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(folder),
  }).catch(() => {})
}

export async function pushDeleteNote(id: string): Promise<void> {
  fetch(`${API}/notes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).catch(() => {})
}

export async function pushDeleteFolder(id: string): Promise<void> {
  fetch(`${API}/folders/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).catch(() => {})
}

export function mergeNotes(local: Note[], remote: Note[]): Note[] {
  const map = new Map<string, Note>()
  for (const n of local) map.set(n.id, n)
  for (const n of remote) {
    const existing = map.get(n.id)
    if (!existing || n.updatedAt > existing.updatedAt) {
      map.set(n.id, { ...n, tags: Array.isArray(n.tags) ? n.tags : JSON.parse(n.tags as any) })
    }
  }
  return Array.from(map.values())
}

export function mergeFolders(local: Folder[], remote: Folder[]): Folder[] {
  const map = new Map<string, Folder>()
  for (const f of local) map.set(f.id, f)
  for (const f of remote) {
    if (!map.has(f.id)) map.set(f.id, f)
  }
  return Array.from(map.values())
}
