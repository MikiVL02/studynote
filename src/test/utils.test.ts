import { describe, it, expect } from 'vitest'
import { extractTextFromJSON, countWords } from '../lib/utils'

describe('extractTextFromJSON', () => {
  it('extracts text from a simple paragraph node', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      ],
    })
    expect(extractTextFromJSON(json)).toBe('Hello world')
  })

  it('extracts and joins text from multiple nodes', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '第一段' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '第二段' }] },
      ],
    })
    const result = extractTextFromJSON(json)
    expect(result).toContain('第一段')
    expect(result).toContain('第二段')
  })

  it('handles deeply nested nodes', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: '列表项' }] },
              ],
            },
          ],
        },
      ],
    })
    expect(extractTextFromJSON(json)).toContain('列表项')
  })

  it('returns empty string on invalid JSON', () => {
    expect(extractTextFromJSON('not valid json')).toBe('')
    expect(extractTextFromJSON('')).toBe('')
    expect(extractTextFromJSON('{}')).toBe('')
  })

  it('returns empty string for empty doc', () => {
    const json = JSON.stringify({ type: 'doc', content: [] })
    expect(extractTextFromJSON(json)).toBe('')
  })
})

describe('countWords', () => {
  it('counts CJK characters individually', () => {
    expect(countWords('你好世界')).toBe(4)
  })

  it('counts English words correctly', () => {
    expect(countWords('hello world')).toBe(2)
    expect(countWords('  hello   world  ')).toBe(2)
  })

  it('handles mixed CJK and English', () => {
    // 你好(2) + hello(1) + 世界(2) = 5
    expect(countWords('你好 hello 世界')).toBe(5)
  })

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })

  it('counts single word', () => {
    expect(countWords('hello')).toBe(1)
    expect(countWords('你')).toBe(1)
  })
})
