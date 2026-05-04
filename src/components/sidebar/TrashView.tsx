import { Trash2, RotateCcw } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

function daysLeft(deletedAt: number): number {
  const elapsed = Date.now() - deletedAt
  return Math.max(0, 30 - Math.floor(elapsed / (24 * 60 * 60 * 1000)))
}

export function TrashView() {
  const { trashNotes, restoreNote, emptyTrash } = useAppStore()
  const notes = trashNotes()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {notes.length > 0 ? `${notes.length} 条笔记` : '回收站为空'}
        </span>
        {notes.length > 0 && (
          <button
            onClick={() => {
              if (confirm('确认清空回收站？此操作无法撤销。')) emptyTrash()
            }}
            className="text-xs px-2 py-1 rounded"
            style={{ color: '#ef4444' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            清空回收站
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4"
            style={{ color: 'var(--text-faint)' }}>
            <Trash2 size={28} strokeWidth={1.5} />
            <p className="text-xs text-center">回收站为空</p>
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className="flex items-center gap-2 px-3 py-2 mx-1 rounded-lg group"
              style={{ minHeight: 44 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--text)' }}>
                  {note.title || '无标题'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {daysLeft(note.deletedAt!)} 天后永久删除
                </p>
              </div>
              <button
                onClick={() => restoreNote(note.id)}
                className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="恢复笔记"
                style={{ color: 'var(--accent)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <RotateCcw size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
