import {
  FileText, Folder, Slash, MousePointer, Save,
  Search, Moon, Plus, Hash,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

const FEATURES = [
  {
    icon: <FileText size={18} />,
    title: '富文本编辑',
    desc: '标题、列表、引用、代码块、表格、任务清单，应有尽有',
  },
  {
    icon: <Slash size={18} />,
    title: '斜杠命令',
    desc: '输入 / 唤出命令菜单，用键盘快速插入任意内容块',
  },
  {
    icon: <MousePointer size={18} />,
    title: '浮动工具栏',
    desc: '选中文字后浮现格式工具栏，点击即可加粗、高亮、转标题',
  },
  {
    icon: <Save size={18} />,
    title: '自动保存',
    desc: '停止输入 1 秒后自动写入本地 IndexedDB，无需手动保存',
  },
  {
    icon: <Folder size={18} />,
    title: '文件夹管理',
    desc: '创建多级文件夹，右键可重命名或删除，拖拽随意整理',
  },
  {
    icon: <Search size={18} />,
    title: '全文搜索',
    desc: '侧边栏搜索框实时过滤笔记标题和标签',
  },
  {
    icon: <Hash size={18} />,
    title: '标签系统',
    desc: '为笔记添加多个标签，跨文件夹快速定位相关内容',
  },
  {
    icon: <Moon size={18} />,
    title: '深色模式',
    desc: '点击左上角图标一键切换亮色 / 暗色主题',
  },
]

const SHORTCUTS = [
  { keys: ['⌘', 'B'], desc: '粗体' },
  { keys: ['⌘', 'I'], desc: '斜体' },
  { keys: ['⌘', 'U'], desc: '下划线' },
  { keys: ['⌘', 'Z'], desc: '撤销' },
  { keys: ['/'], desc: '命令菜单' },
]

export function WelcomeView() {
  const { createNote } = useAppStore()

  return (
    <div
      className="flex-1 overflow-y-auto h-full"
      style={{ background: 'var(--bg)' }}
    >
      <div className="max-w-2xl mx-auto px-12 pt-16 pb-20">

        {/* Hero */}
        <div className="mb-12">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 text-2xl"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
          >
            ✏️
          </div>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}
          >
            欢迎使用笔记
          </h1>
          <p className="text-base" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            一款基于 Vite + React + TipTap 构建的现代笔记应用。
            <br />
            点击左侧笔记开始阅读，或新建一篇属于你的笔记。
          </p>
          <button
            onClick={() => createNote(null)}
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={15} />
            新建笔记
          </button>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '2.5rem' }} />

        {/* Features */}
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-5"
          style={{ color: 'var(--text-faint)' }}
        >
          功能一览
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-12">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              <div
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                {f.icon}
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{f.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Shortcuts */}
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-faint)' }}
        >
          常用快捷键
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {SHORTCUTS.map((s, i) => (
            <div
              key={s.desc}
              className="flex items-center justify-between px-5 py-3"
              style={{
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                background: 'var(--bg-subtle)',
              }}
            >
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      minWidth: 28,
                      boxShadow: '0 1px 0 var(--border)',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
