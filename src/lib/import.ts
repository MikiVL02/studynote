import mammoth from 'mammoth'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.7.284/pdf.worker.min.mjs'

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TipTapNode = any

export interface ImportResult {
  title: string
  content: string // TipTap JSON string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDoc(nodes: TipTapNode[]): string {
  return JSON.stringify({ type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph' }] })
}

function textNode(text: string, marks: TipTapNode[] = []): TipTapNode {
  const n: TipTapNode = { type: 'text', text }
  if (marks.length) n.marks = marks
  return n
}

function paragraph(children: TipTapNode[]): TipTapNode {
  return { type: 'paragraph', content: children.length ? children : undefined }
}

// ── Markdown inline parser ────────────────────────────────────────────────────

function parseInline(raw: string): TipTapNode[] {
  const nodes: TipTapNode[] = []
  // Regex order matters: code first, then links, then bold/italic combos
  const re =
    /(`[^`]+`)|(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(__(.+?)__)|(_(.+?)_)|(~~(.+?)~~)|(==(.+?)==)|(\[([^\]]+)\]\(([^)]+)\))|(<u>(.+?)<\/u>)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) nodes.push(textNode(raw.slice(last, m.index)))
    if (m[1]) {
      // `code`
      nodes.push(textNode(m[1].slice(1, -1), [{ type: 'code' }]))
    } else if (m[2]) {
      // ***bold+italic***
      nodes.push(textNode(m[3], [{ type: 'bold' }, { type: 'italic' }]))
    } else if (m[4]) {
      // **bold**
      nodes.push(textNode(m[5], [{ type: 'bold' }]))
    } else if (m[6]) {
      // *italic*
      nodes.push(textNode(m[7], [{ type: 'italic' }]))
    } else if (m[8]) {
      // __bold__
      nodes.push(textNode(m[9], [{ type: 'bold' }]))
    } else if (m[10]) {
      // _italic_
      nodes.push(textNode(m[11], [{ type: 'italic' }]))
    } else if (m[12]) {
      // ~~strike~~
      nodes.push(textNode(m[13], [{ type: 'strike' }]))
    } else if (m[14]) {
      // ==highlight==
      nodes.push(textNode(m[15], [{ type: 'highlight' }]))
    } else if (m[16]) {
      // [text](url)
      nodes.push(textNode(m[17], [{ type: 'link', attrs: { href: m[18] } }]))
    } else if (m[19]) {
      // <u>underline</u>
      nodes.push(textNode(m[20], [{ type: 'underline' }]))
    }
    last = m.index + m[0].length
  }
  if (last < raw.length) nodes.push(textNode(raw.slice(last)))
  return nodes
}

// ── Markdown block parser ─────────────────────────────────────────────────────

export function importMarkdown(text: string): ImportResult {
  const lines = text.split('\n')
  const nodes: TipTapNode[] = []
  let title = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.*)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = parseInline(headingMatch[2])
      if (!title && level === 1) title = headingMatch[2]
      nodes.push({ type: 'heading', attrs: { level }, content })
      i++
      continue
    }

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)/)
    if (fenceMatch) {
      const lang = fenceMatch[1]
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      nodes.push({
        type: 'codeBlock',
        attrs: { language: lang || null },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      })
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      nodes.push({
        type: 'blockquote',
        content: [paragraph(parseInline(quoteLines.join(' ')))],
      })
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Task list item
    const taskMatch = line.match(/^(\s*)- \[([x ])\] (.*)/)
    if (taskMatch) {
      const items: TipTapNode[] = []
      let j = i
      while (j < lines.length) {
        const tm = lines[j].match(/^(\s*)- \[([x ])\] (.*)/)
        if (!tm) break
        items.push({
          type: 'taskItem',
          attrs: { checked: tm[2] === 'x' },
          content: [paragraph(parseInline(tm[3]))],
        })
        j++
      }
      nodes.push({ type: 'taskList', content: items })
      i = j
      continue
    }

    // Bullet list
    const bulletMatch = line.match(/^(\s*)[-*+] (.*)/)
    if (bulletMatch) {
      const items: TipTapNode[] = []
      let j = i
      while (j < lines.length) {
        const bm = lines[j].match(/^(\s*)[-*+] (.*)/)
        if (!bm) break
        items.push({
          type: 'listItem',
          content: [paragraph(parseInline(bm[2]))],
        })
        j++
      }
      nodes.push({ type: 'bulletList', content: items })
      i = j
      continue
    }

    // Ordered list
    const orderedMatch = line.match(/^(\s*)\d+\. (.*)/)
    if (orderedMatch) {
      const items: TipTapNode[] = []
      let j = i
      while (j < lines.length) {
        const om = lines[j].match(/^(\s*)\d+\. (.*)/)
        if (!om) break
        items.push({
          type: 'listItem',
          content: [paragraph(parseInline(om[2]))],
        })
        j++
      }
      nodes.push({ type: 'orderedList', content: items })
      i = j
      continue
    }

    // Image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
    if (imgMatch) {
      nodes.push({ type: 'image', attrs: { src: imgMatch[2], alt: imgMatch[1] } })
      i++
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph
    nodes.push(paragraph(parseInline(line)))
    i++
  }

  if (!title) title = '导入的笔记'
  return { title, content: makeDoc(nodes) }
}

// ── Plain text import ─────────────────────────────────────────────────────────

export function importTxt(text: string): ImportResult {
  const lines = text.split('\n')
  const title = lines[0]?.trim() || '导入的笔记'
  const nodes: TipTapNode[] = lines.map(line =>
    line.trim() === '' ? { type: 'paragraph' } : paragraph(parseInline(line)),
  )
  return { title, content: makeDoc(nodes) }
}

// ── HTML → TipTap JSON (used by DOCX import) ──────────────────────────────────

function htmlToTipTap(html: string): TipTapNode[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return Array.from(doc.body.childNodes).flatMap(n => domNodeToTipTap(n as Element))
}

function getInlineMarks(el: Element): TipTapNode[] {
  const marks: TipTapNode[] = []
  const tag = el.tagName?.toLowerCase()
  if (tag === 'strong' || tag === 'b') marks.push({ type: 'bold' })
  if (tag === 'em' || tag === 'i') marks.push({ type: 'italic' })
  if (tag === 'u') marks.push({ type: 'underline' })
  if (tag === 's' || tag === 'del') marks.push({ type: 'strike' })
  if (tag === 'code') marks.push({ type: 'code' })
  if (tag === 'a') marks.push({ type: 'link', attrs: { href: (el as HTMLAnchorElement).href } })
  return marks
}

function domInlineToRuns(node: Node, inheritedMarks: TipTapNode[] = []): TipTapNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (!text) return []
    return [textNode(text, inheritedMarks)]
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return []
  const el = node as Element
  const marks = [...inheritedMarks, ...getInlineMarks(el)]
  return Array.from(el.childNodes).flatMap(c => domInlineToRuns(c, marks))
}

function domNodeToTipTap(el: Element): TipTapNode[] {
  if (el.nodeType === Node.TEXT_NODE) {
    const text = el.textContent?.trim() ?? ''
    return text ? [paragraph([textNode(text)])] : []
  }
  if (el.nodeType !== Node.ELEMENT_NODE) return []
  const tag = el.tagName?.toLowerCase()

  const hMatch = tag?.match(/^h([1-4])$/)
  if (hMatch) {
    return [{ type: 'heading', attrs: { level: parseInt(hMatch[1]) }, content: domInlineToRuns(el) }]
  }
  if (tag === 'p') {
    const runs = domInlineToRuns(el)
    return [paragraph(runs)]
  }
  if (tag === 'ul') {
    const items = Array.from(el.querySelectorAll(':scope > li')).map(li => ({
      type: 'listItem',
      content: [paragraph(domInlineToRuns(li))],
    }))
    return items.length ? [{ type: 'bulletList', content: items }] : []
  }
  if (tag === 'ol') {
    const items = Array.from(el.querySelectorAll(':scope > li')).map(li => ({
      type: 'listItem',
      content: [paragraph(domInlineToRuns(li))],
    }))
    return items.length ? [{ type: 'orderedList', content: items }] : []
  }
  if (tag === 'blockquote') {
    return [{ type: 'blockquote', content: Array.from(el.childNodes).flatMap(c => domNodeToTipTap(c as Element)) }]
  }
  if (tag === 'pre' || tag === 'code') {
    return [{ type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: el.textContent ?? '' }] }]
  }
  if (tag === 'hr') return [{ type: 'horizontalRule' }]
  if (tag === 'img') {
    return [{ type: 'image', attrs: { src: (el as HTMLImageElement).src, alt: (el as HTMLImageElement).alt } }]
  }
  if (tag === 'br') return []
  // Fallback: recurse into children
  return Array.from(el.childNodes).flatMap(c => domNodeToTipTap(c as Element))
}

// ── DOCX import ───────────────────────────────────────────────────────────────

export async function importDocx(arrayBuffer: ArrayBuffer): Promise<ImportResult> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async img => {
        const data = await img.read('base64')
        return { src: `data:${img.contentType};base64,${data}` }
      }),
    },
  )
  const nodes = htmlToTipTap(result.value)
  const title = nodes.find(n => n.type === 'heading')?.content?.[0]?.text ?? '导入的文档'
  return { title, content: makeDoc(nodes) }
}

// ── PDF import ────────────────────────────────────────────────────────────────

export async function importPDF(arrayBuffer: ArrayBuffer): Promise<ImportResult> {
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const nodes: TipTapNode[] = []
  let title = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Group items into lines by y-coordinate (rounded to nearest 2px)
    const lineMap = new Map<number, string[]>()
    for (const item of textContent.items) {
      if (!('str' in item)) continue
      const y = Math.round((item as { transform: number[] }).transform[5] / 2) * 2
      if (!lineMap.has(y)) lineMap.set(y, [])
      lineMap.get(y)!.push((item as { str: string }).str)
    }

    // Sort lines top-to-bottom (descending y in PDF coords)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)
    for (const y of sortedYs) {
      const lineText = lineMap.get(y)!.join('').trim()
      if (!lineText) continue
      if (!title && pageNum === 1) title = lineText
      nodes.push(paragraph([textNode(lineText)]))
    }

    // Page break between pages (except last)
    if (pageNum < pdf.numPages) {
      nodes.push({ type: 'horizontalRule' })
    }
  }

  if (!title) title = '导入的PDF'
  return { title, content: makeDoc(nodes) }
}
