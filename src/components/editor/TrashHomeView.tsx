import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

function daysLeft(deletedAt: number): number {
  const elapsed = Date.now() - deletedAt
  return Math.max(0, 30 - Math.floor(elapsed / (24 * 60 * 60 * 1000)))
}

export function TrashHomeView() {
  const { trashNotes, restoreNote, emptyTrash } = useAppStore()
  const notes = trashNotes()

  return (
    <div className="flex-1 overflow-y-auto h-full" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-12 pt-16 pb-20">

        {/* Hero */}
        <div className="mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            <Trash2 size={26} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-4xl font-bold mb-3"
                style={{ color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}
              >
                回收站
              </h1>
              <p className="text-base" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {notes.length > 0
                  ? `${notes.length} 篇笔记将在 30 天后永久删除，可随时恢复。`
                  : '回收站为空，已删除的笔记会在这里保留 30 天。'}
              </p>
            </div>
            {notes.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('确认清空回收站？此操作无法撤销。')) emptyTrash()
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium mt-1 transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              >
                <Trash2 size={13} />
                清空回收站
              </button>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '2.5rem' }} />

        {notes.length > 0 ? (
          <>
            {/* 提示 */}
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 text-sm"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--text-muted)' }}
            >
              <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              笔记将在删除 30 天后自动永久清除，届时无法恢复。
            </div>

            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-faint)' }}
            >
              待清除的笔记
            </h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {notes.map((note, i) => {
                const days = daysLeft(note.deletedAt!)
                const urgent = days <= 3
                return (
                  <div
                    key={note.id}
                    className="flex items-center justify-between px-5 py-3.5 group"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                      background: 'var(--bg-subtle)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {note.title || '无标题笔记'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: urgent ? '#ef4444' : 'var(--text-faint)' }}>
                        {days === 0 ? '今天永久删除' : `${days} 天后永久删除`}
                      </div>
                    </div>
                    <button
                      onClick={() => restoreNote(note.id)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                    >
                      <RotateCcw size={12} />
                      恢复
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12" style={{ color: 'var(--text-faint)' }}>
            <Trash2 size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">回收站为空</p>
          </div>
        )}

      </div>
    </div>
  )
}
