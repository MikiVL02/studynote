import { FileText, Plus, Clock, Hash, Folder } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { formatDate } from '../../lib/utils'

export function AllNotesView() {
  const { notes, folders, createNote, setActiveNote } = useAppStore()

  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)

  const totalWords = notes.reduce((sum, n) => sum + (n.wordCount ?? 0), 0)

  const tagCounts: Record<string, number> = {}
  for (const note of notes) {
    for (const tag of note.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="flex-1 overflow-y-auto h-full" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-12 pt-16 pb-20">

        {/* Hero */}
        <div className="mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 text-2xl"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
          >
            <FileText size={26} />
          </div>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}
          >
            所有笔记
          </h1>
          <p className="text-base" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            共 {notes.length} 篇笔记，{folders.length} 个文件夹，累计约 {totalWords.toLocaleString()} 字。
          </p>
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
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '2.5rem' }} />

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: '全部笔记', value: notes.length, icon: <FileText size={16} /> },
            { label: '文件夹', value: folders.length, icon: <Folder size={16} /> },
            { label: '累计字数', value: totalWords.toLocaleString(), icon: <Hash size={16} /> },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              <div
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                {stat.icon}
              </div>
              <div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text)' }}>{stat.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 最近修改 */}
        {recentNotes.length > 0 && (
          <>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-faint)' }}
            >
              最近修改
            </h2>
            <div
              className="rounded-xl overflow-hidden mb-10"
              style={{ border: '1px solid var(--border)' }}
            >
              {recentNotes.map((note, i) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note.id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    background: 'var(--bg-subtle)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    <span className="text-sm truncate" style={{ color: 'var(--text)' }}>
                      {note.title || '无标题笔记'}
                    </span>
                  </div>
                  <span className="text-xs shrink-0 ml-3" style={{ color: 'var(--text-faint)' }}>
                    {formatDate(note.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* 标签云 */}
        {topTags.length > 0 && (
          <>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-faint)' }}
            >
              常用标签
            </h2>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <Hash size={11} />
                  {tag}
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>({count})</span>
                </span>
              ))}
            </div>
          </>
        )}

        {/* 空状态 */}
        {notes.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text-faint)' }}>
            <FileText size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-2">还没有笔记</p>
            <p className="text-xs">点击上方「新建笔记」开始记录</p>
          </div>
        )}

      </div>
    </div>
  )
}
