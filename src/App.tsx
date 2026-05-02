import { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { Editor } from './components/editor/Editor'
import { AiPanel } from './components/ai/AiPanel'
import { useAppStore } from './stores/appStore'
import { seedIfEmpty, deduplicateDB } from './db'

export default function App() {
  const { loadAll, theme, focusMode, aiPanelOpen } = useAppStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    seedIfEmpty()
      .then(() => deduplicateDB())
      .then(() => loadAll())
  }, [])

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className={`sidebar-panel${focusMode ? ' hidden' : ''}`} style={{ width: 260 }}>
        <Sidebar />
      </div>
      <Editor />
      {aiPanelOpen && !focusMode && <AiPanel />}
    </div>
  )
}
