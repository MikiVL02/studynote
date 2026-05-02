import { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { Editor } from './components/editor/Editor'
import { useAppStore } from './stores/appStore'
import { seedIfEmpty } from './db'

export default function App() {
  const { loadAll, theme } = useAppStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    seedIfEmpty().then(() => loadAll())
  }, [])

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <Editor />
    </div>
  )
}
