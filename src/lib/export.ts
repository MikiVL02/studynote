import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx'
import { extractTextFromJSON } from './utils'

// ── Shared ────────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ── TipTap JSON types ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TipTapNode = any

// ── Markdown export ───────────────────────────────────────────────────────────

function inlineToMd(node: TipTapNode): string {
  if (node.type === 'hardBreak') return '  \n'
  if (node.type === 'image') return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''})`
  if (node.type !== 'text') return ''

  let text: string = node.text ?? ''
  const marks: string[] = (node.marks ?? []).map((m: TipTapNode) => m.type)
  const linkMark = (node.marks ?? []).find((m: TipTapNode) => m.type === 'link')

  if (marks.includes('code')) return `\`${text}\``
  if (linkMark) text = `[${text}](${linkMark.attrs?.href ?? ''})`
  if (marks.includes('bold')) text = `**${text}**`
  if (marks.includes('italic')) text = `*${text}*`
  if (marks.includes('strike')) text = `~~${text}~~`
  if (marks.includes('underline')) text = `<u>${text}</u>`
  if (marks.includes('highlight')) text = `==${text}==`
  return text
}

function inlinesToMd(nodes: TipTapNode[]): string {
  return (nodes ?? []).map(inlineToMd).join('')
}

function nodeToMd(node: TipTapNode, listDepth = 0, listIndex = { n: 1 }): string {
  const indent = '  '.repeat(listDepth)
  switch (node.type) {
    case 'heading': {
      const level = node.attrs?.level ?? 1
      return `${'#'.repeat(level)} ${inlinesToMd(node.content)}\n\n`
    }
    case 'paragraph': {
      const text = inlinesToMd(node.content ?? [])
      return text ? `${text}\n\n` : '\n'
    }
    case 'blockquote':
      return (node.content ?? []).map((n: TipTapNode) => nodeToMd(n).replace(/^/gm, '> ')).join('') + '\n'
    case 'codeBlock': {
      const lang = node.attrs?.language ?? ''
      const code = (node.content ?? []).map((n: TipTapNode) => n.text ?? '').join('')
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`
    }
    case 'bulletList':
      return (node.content ?? []).map((n: TipTapNode) => nodeToMd(n, listDepth, listIndex)).join('') + '\n'
    case 'orderedList': {
      const idx = { n: 1 }
      return (node.content ?? []).map((n: TipTapNode) => nodeToMd(n, listDepth, idx)).join('') + '\n'
    }
    case 'listItem': {
      const children = node.content ?? []
      const first = children[0]
      const firstText = first ? inlinesToMd(first.content ?? []) : ''
      const rest = children.slice(1).map((n: TipTapNode) => nodeToMd(n, listDepth + 1, { n: 1 })).join('')
      return `${indent}- ${firstText}\n${rest}`
    }
    case 'taskList':
      return (node.content ?? []).map((n: TipTapNode) => nodeToMd(n, listDepth, listIndex)).join('') + '\n'
    case 'taskItem': {
      const checked = node.attrs?.checked ? 'x' : ' '
      const children = node.content ?? []
      const first = children[0]
      const firstText = first ? inlinesToMd(first.content ?? []) : ''
      const rest = children.slice(1).map((n: TipTapNode) => nodeToMd(n, listDepth + 1, { n: 1 })).join('')
      return `${indent}- [${checked}] ${firstText}\n${rest}`
    }
    case 'table': {
      const rows: TipTapNode[] = node.content ?? []
      if (!rows.length) return ''
      const cells = (row: TipTapNode) =>
        (row.content ?? []).map((cell: TipTapNode) => inlinesToMd((cell.content?.[0]?.content) ?? [])).join(' | ')
      const header = `| ${cells(rows[0])} |`
      const sep = `| ${(rows[0].content ?? []).map(() => '---').join(' | ')} |`
      const body = rows.slice(1).map((r: TipTapNode) => `| ${cells(r)} |`).join('\n')
      return `${header}\n${sep}\n${body}\n\n`
    }
    case 'horizontalRule':
      return '---\n\n'
    case 'image':
      return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''})\n\n`
    default:
      return ''
  }
}

export function exportMarkdown(title: string, content: string): void {
  let md = `# ${title}\n\n`
  try {
    const doc = JSON.parse(content)
    md += (doc.content ?? []).map((n: TipTapNode) => nodeToMd(n)).join('')
  } catch {
    md += content
  }
  downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${title}.md`)
}

// ── Plain text export ─────────────────────────────────────────────────────────

export function exportTxt(title: string, content: string): void {
  const text = `${title}\n\n${extractTextFromJSON(content)}`
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${title}.txt`)
}

// ── PDF export ────────────────────────────────────────────────────────────────

export function exportPDF(): void {
  window.print()
}

// ── DOCX export ───────────────────────────────────────────────────────────────

function inlinesToDocxRuns(nodes: TipTapNode[]): TextRun[] {
  return (nodes ?? []).flatMap((node: TipTapNode): TextRun[] => {
    if (node.type === 'hardBreak') return [new TextRun({ break: 1 })]
    if (node.type !== 'text') return []
    const marks: string[] = (node.marks ?? []).map((m: TipTapNode) => m.type)
    return [new TextRun({
      text: node.text ?? '',
      bold: marks.includes('bold'),
      italics: marks.includes('italic'),
      strike: marks.includes('strike'),
      underline: marks.includes('underline') ? { type: UnderlineType.SINGLE } : undefined,
      font: marks.includes('code') ? 'Courier New' : undefined,
    })]
  })
}

function nodesToDocxParagraphs(nodes: TipTapNode[]): Paragraph[] {
  return (nodes ?? []).flatMap((node: TipTapNode): Paragraph[] => {
    switch (node.type) {
      case 'heading':
        return [new Paragraph({
          heading: ([
            HeadingLevel.HEADING_1,
            HeadingLevel.HEADING_2,
            HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4,
          ])[(node.attrs?.level ?? 1) - 1] ?? HeadingLevel.HEADING_1,
          children: inlinesToDocxRuns(node.content ?? []),
        })]
      case 'paragraph':
        return [new Paragraph({ children: inlinesToDocxRuns(node.content ?? []) })]
      case 'blockquote':
        return nodesToDocxParagraphs(node.content ?? []).map(p => {
          // indent blockquote
          return new Paragraph({
            indent: { left: 720 },
            children: (p as Paragraph & { options: { children: TextRun[] } }).options?.children ?? [],
          })
        })
      case 'codeBlock': {
        const code = (node.content ?? []).map((n: TipTapNode) => n.text ?? '').join('')
        return code.split('\n').map((line: string) => new Paragraph({
          children: [new TextRun({ text: line, font: 'Courier New' })],
        }))
      }
      case 'bulletList':
        return (node.content ?? []).flatMap((item: TipTapNode) => {
          const first = item.content?.[0]
          return [new Paragraph({
            bullet: { level: 0 },
            children: inlinesToDocxRuns(first?.content ?? []),
          })]
        })
      case 'orderedList':
        return (node.content ?? []).flatMap((item: TipTapNode, i: number) => {
          const first = item.content?.[0]
          return [new Paragraph({
            numbering: { reference: 'default-numbering', level: 0 },
            children: [new TextRun(`${i + 1}. `), ...inlinesToDocxRuns(first?.content ?? [])],
          })]
        })
      case 'taskList':
        return (node.content ?? []).flatMap((item: TipTapNode) => {
          const checked = item.attrs?.checked ? '☑' : '☐'
          const first = item.content?.[0]
          return [new Paragraph({
            children: [new TextRun(`${checked} `), ...inlinesToDocxRuns(first?.content ?? [])],
          })]
        })
      case 'horizontalRule':
        return [new Paragraph({
          border: { bottom: { color: 'auto', space: 1, style: 'single', size: 6 } },
          children: [],
          alignment: AlignmentType.CENTER,
        })]
      case 'image':
        // Images require async fetch; skip in sync path
        return [new Paragraph({ children: [new TextRun(`[图片: ${node.attrs?.src ?? ''}]`)] })]
      default:
        return []
    }
  })
}

export async function exportDocx(title: string, content: string): Promise<void> {
  let bodyParagraphs: Paragraph[] = []
  try {
    const doc = JSON.parse(content)
    bodyParagraphs = nodesToDocxParagraphs(doc.content ?? [])
  } catch {
    bodyParagraphs = [new Paragraph({ children: [new TextRun(content)] })]
  }

  const docx = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }),
        ...bodyParagraphs,
      ],
    }],
  })

  const blob = await Packer.toBlob(docx)
  downloadBlob(blob, `${title}.docx`)
}
