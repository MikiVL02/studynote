import { Star, Plus, Hash, Clock } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { formatDate } from '../../lib/utils'

export function StarredView() {
  const { notes, createNote, setActiveNote, toggleStar } = useAppStore()
  const starredNotes = notes.filter(n => n.starred).sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="flex-1 overflow-y-auto h-full" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-12 pt-16 pb-20">

        {/* Hero */}
        <div className="mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{ background: 'var(--accent-subtle)', color: '#f59e0b' }}
          >
            <Star size={26} fill="currentColor" />
          </div>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}
          >
            收藏
          </h1>
          <p className="text-base" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {starredNotes.length > 0
              ? `已收藏 ${starredNotes.length} 篇笔记，点击即可快速访问。`
              : '还没有收藏任何笔记。在笔记列表或编辑器标题旁点击星标即可收藏。'}
          </p>
          {starredNotes.length === 0 && (
            <button
              onClick={() => createNote(null)}
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              <Plus size={15} />
              新建笔记
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '2.5rem' }} />

        {starredNotes.length > 0 ? (
          <>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-faint)' }}
            >
              收藏的笔记
            </h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {starredNotes.map((note, i) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    background: 'var(--bg-subtle)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Star size={13} style={{ color: '#f59e0b', flexShrink: 0 }} fill="currentColor" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {note.title || '无标题笔记'}
                      </div>
                      {note.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {note.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                            >
                              <Hash size={9} />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      <Clock size={11} className="inline mr-1" />
                      {formatDate(note.updatedAt)}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleStar(note.id) }}
                      className="p-1 rounded transition-colors"
                      title="取消收藏"
                      style={{ color: 'var(--text-faint)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                    >
                      <Star size={13} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12" style={{ color: 'var(--text-faint)' }}>
            <Star size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-1">暂无收藏笔记</p>
            <p className="text-xs">在笔记列表 hover 或编辑器标题旁点击 ★ 收藏</p>
          </div>
        )}

      </div>
    </div>
  )
}
