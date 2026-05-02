import { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { Editor } from './components/editor/Editor'
import { AiPanel } from './components/ai/AiPanel'
import { useAppStore } from './stores/appStore'
import { seedIfEmpty, deduplicateDB } from './db'

export default function App() {
  const { loadAll, theme, focusMode, aiPanelOpen, toggleFocusMode, toggleAiPanel, createNote, activeFolderId } = useAppStore()

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
      <div className={`sidebar-panel${focusMode ? ' hidden' : ''}`} style={{ width: 260 }}>
        <Sidebar />
      </div>
      <Editor />
      {aiPanelOpen && <AiPanel />}
    </div>
  )
}
