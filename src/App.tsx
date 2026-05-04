import { useEffect, useState } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { Editor } from './components/editor/Editor'
import { AiPanel } from './components/ai/AiPanel'
import { useAppStore } from './stores/appStore'
import { seedIfEmpty, deduplicateDB } from './db'

export default function App() {
  const { loadAll, theme, focusMode, aiPanelOpen, toggleFocusMode, toggleAiPanel, createNote, activeFolderId } = useAppStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    seedIfEmpty()
      .then(() => deduplicateDB())
      .then(() => loadAll())
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === '\\') { e.preventDefault(); toggleFocusMode() }
      if (mod && e.shiftKey && e.key === 'J') { e.preventDefault(); toggleAiPanel() }
      if (mod && e.key === 'n') { e.preventDefault(); createNote(activeFolderId as string | null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFocusMode, toggleAiPanel, createNote, activeFolderId])

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <>
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <div
          className={`sidebar-panel${focusMode ? ' hidden' : ''}`}
          style={{ width: 260 }}
          data-mobile-open={mobileSidebarOpen}
        >
          <Sidebar />
        </div>
        {!focusMode && (
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(v => !v)}
            aria-label="打开菜单"
          >
            ☰
          </button>
        )}
      </>
      <div className="flex-1 min-w-0 h-full flex flex-col editor-main">
        <Editor />
      </div>
      {aiPanelOpen && <AiPanel />}
    </div>
  )
}
