import { describe, it, expect } from 'vitest'
import { extractTextFromJSON } from '../lib/utils'

// Mirror the filteredNotes logic as a pure function for testing
type Note = {
  id: string
  title: string
  content: string
  folderId: string | null
  tags: string[]
  starred: boolean
  updatedAt: number
  createdAt: number
  wordCount: number
}

function filterNotes(
  notes: Note[],
  opts: {
    activeFolderId: string | null | 'all' | 'starred'
    searchQuery: string
    activeTag: string | null
    sortBy: 'updatedAt' | 'createdAt' | 'title'
    sortOrder: 'asc' | 'desc'
  },
): Note[] {
  const { activeFolderId, searchQuery, activeTag, sortBy, sortOrder } = opts
  let result = notes

  if (activeFolderId === 'starred') {
    result = result.filter(n => n.starred)
  } else if (activeFolderId !== 'all' && activeFolderId !== null) {
    result = result.filter(n => n.folderId === activeFolderId)
  }

  if (activeTag) {
    result = result.filter(n => n.tags.includes(activeTag))
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q)) ||
      extractTextFromJSON(n.content).toLowerCase().includes(q),
    )
  }

  result = [...result].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title, 'zh-CN')
    } else {
      cmp = a[sortBy] - b[sortBy]
    }
    return sortOrder === 'asc' ? cmp : -cmp
  })

  return result
}

const makeNote = (overrides: Partial<Note> & { id: string }): Note => ({
  title: '无标题',
  content: JSON.stringify({ type: 'doc', content: [] }),
  folderId: null,
  tags: [],
  starred: false,
  updatedAt: 1000,
  createdAt: 1000,
  wordCount: 0,
  ...overrides,
})

const NOTES: Note[] = [
  makeNote({ id: '1', title: '工作计划', folderId: 'folder-a', tags: ['工作'], updatedAt: 3000, createdAt: 1000 }),
  makeNote({ id: '2', title: '读书笔记', folderId: 'folder-b', tags: ['学习', '读书'], starred: true, updatedAt: 2000, createdAt: 2000 }),
  makeNote({ id: '3', title: 'TypeScript 入门', folderId: null, tags: ['技术', '学习'], updatedAt: 1000, createdAt: 3000 }),
  makeNote({ id: '4', title: '收藏的想法', starred: true, updatedAt: 4000, createdAt: 500 }),
]

describe('filterNotes — folder filter', () => {
  it('returns all notes when activeFolderId is "all"', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(4)
  })

  it('filters by specific folderId', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'folder-a', searchQuery: '', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('returns only starred notes', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'starred', searchQuery: '', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result.every(n => n.starred)).toBe(true)
    expect(result).toHaveLength(2)
  })
})

describe('filterNotes — tag filter', () => {
  it('filters by activeTag', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '', activeTag: '学习', sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(2)
    expect(result.every(n => n.tags.includes('学习'))).toBe(true)
  })

  it('returns empty array when no notes match tag', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '', activeTag: '不存在', sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(0)
  })
})

describe('filterNotes — search', () => {
  it('filters by title', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: 'TypeScript', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('filters by tag keyword', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '读书', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('search is case-insensitive', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: 'typescript', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(1)
  })

  it('returns all notes when search is empty', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '  ', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result).toHaveLength(4)
  })
})

describe('filterNotes — sorting', () => {
  it('sorts by updatedAt descending', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '', activeTag: null, sortBy: 'updatedAt', sortOrder: 'desc' })
    expect(result[0].updatedAt).toBeGreaterThanOrEqual(result[1].updatedAt)
  })

  it('sorts by updatedAt ascending', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '', activeTag: null, sortBy: 'updatedAt', sortOrder: 'asc' })
    expect(result[0].updatedAt).toBeLessThanOrEqual(result[1].updatedAt)
  })

  it('sorts by title ascending', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '', activeTag: null, sortBy: 'title', sortOrder: 'asc' })
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].title.localeCompare(result[i].title, 'zh-CN')).toBeLessThanOrEqual(0)
    }
  })

  it('sorts by createdAt descending', () => {
    const result = filterNotes(NOTES, { activeFolderId: 'all', searchQuery: '', activeTag: null, sortBy: 'createdAt', sortOrder: 'desc' })
    expect(result[0].createdAt).toBeGreaterThanOrEqual(result[1].createdAt)
  })
})
