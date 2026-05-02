import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileType, Printer, AlignLeft } from 'lucide-react'
import { exportMarkdown, exportTxt, exportPDF, exportDocx } from '../../lib/export'

interface ExportMenuProps {
  title: string
  content: string
}

export function ExportMenu({ title, content }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const handleDocx = async () => {
    setLoading(true)
    setOpen(false)
    try {
      await exportDocx(title, content)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        title="导出"
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--bg-muted)',
          color: 'var(--text-muted)',
          cursor: loading ? 'wait' : 'pointer',
          fontSize: 13,
        }}
      >
        <Download size={14} />
        {loading ? '导出中…' : '导出'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 200,
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            opacity: 1,
            minWidth: 160,
            overflow: 'hidden',
          }}
        >
          {[
            {
              label: 'Markdown',
              icon: <FileText size={14} />,
              onClick: () => { exportMarkdown(title, content); setOpen(false) },
            },
            {
              label: 'Word (.docx)',
              icon: <FileType size={14} />,
              onClick: handleDocx,
            },
            {
              label: 'PDF (打印)',
              icon: <Printer size={14} />,
              onClick: () => { exportPDF(); setOpen(false) },
            },
            {
              label: '纯文本',
              icon: <AlignLeft size={14} />,
              onClick: () => { exportTxt(title, content); setOpen(false) },
            },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 14px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
