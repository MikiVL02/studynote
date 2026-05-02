import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId() {
  return crypto.randomUUID()
}

export function formatDate(timestamp: number) {
  const d = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function countWords(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const chineseChars = (trimmed.match(/[一-龥]/g) || []).length
  const englishWords = trimmed
    .replace(/[一-龥]/g, '')
    .split(/\s+/)
    .filter(Boolean).length
  return chineseChars + englishWords
}
