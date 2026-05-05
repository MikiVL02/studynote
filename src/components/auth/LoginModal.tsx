import { useState } from 'react'
import { X } from 'lucide-react'
import { apiLogin, apiRegister, apiActivate, setToken } from '../../lib/auth'
import { useAppStore } from '../../stores/appStore'

type Tab = 'login' | 'register' | 'activate'

export function LoginModal({ onClose, initialTab }: { onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser, syncFromCloud, currentUser } = useAppStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        const { token, user } = await apiLogin(username, password)
        setToken(token)
        setCurrentUser(user)
        if (user.cloudEnabled) await syncFromCloud()
        onClose()
      } else if (tab === 'register') {
        const { token, user } = await apiRegister(username, password)
        setToken(token)
        setCurrentUser(user)
        onClose()
      } else {
        await apiActivate(code)
        setCurrentUser({ ...currentUser!, cloudEnabled: true })
        await syncFromCloud()
        onClose()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {tab === 'login' ? '登录' : tab === 'register' ? '注册' : '激活云存储'}
          </h2>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--text-faint)' }}>
            <X size={14} />
          </button>
        </div>

        {tab !== 'activate' && (
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1 rounded text-xs font-medium transition-all"
                style={{
                  background: tab === t ? 'var(--bg)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-faint)',
                }}
              >
                {t === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab !== 'activate' ? (
            <>
              <input
                style={inputStyle}
                placeholder="用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="密码（至少 6 位）"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </>
          ) : (
            <input
              style={inputStyle}
              placeholder="邀请码（如 MIKI-A7X2-KP9Q）"
              value={code}
              onChange={e => setCode(e.target.value)}
              autoFocus
            />
          )}

          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '请稍候…' : tab === 'login' ? '登录' : tab === 'register' ? '注册' : '激活'}
          </button>
        </form>
      </div>
    </div>
  )
}
