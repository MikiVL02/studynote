import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { apiLogin, apiRegister, apiRegisterSendCode, apiActivate, setToken, apiForgotPassword, apiResetPassword } from '../../lib/auth'
import { useAppStore } from '../../stores/appStore'

type Tab = 'login' | 'register' | 'activate'
type RegisterStep = 'form' | 'verify'
type ForgotStep = 'email' | 'reset'

export function LoginModal({ onClose, initialTab }: { onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser, syncFromCloud, currentUser } = useAppStore()

  // 注册两步流程
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regCode, setRegCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 忘记密码状态
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotPassword, setForgotPassword] = useState('')

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])

  function startCountdown() {
    setCountdown(60)
    countdownRef.current = setInterval(() => {
      setCountdown(v => {
        if (v <= 1) { clearInterval(countdownRef.current!); return 0 }
        return v - 1
      })
    }, 1000)
  }

  function resetRegister() {
    setRegisterStep('form')
    setRegUsername('')
    setRegEmail('')
    setRegPassword('')
    setRegCode('')
    setCountdown(0)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setError('')
  }

  function resetForgot() {
    setForgotMode(false)
    setForgotStep('email')
    setForgotEmail('')
    setForgotCode('')
    setForgotPassword('')
    setError('')
  }

  async function handleRegisterSend(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiRegisterSendCode(regUsername, regPassword, regEmail)
      setRegisterStep('verify')
      startCountdown()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await apiRegister(regEmail, regCode)
      setToken(token)
      setCurrentUser(user)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0) return
    setError('')
    setLoading(true)
    try {
      await apiRegisterSendCode(regUsername, regPassword, regEmail)
      startCountdown()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotSend(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiForgotPassword(forgotEmail)
      setForgotStep('reset')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiResetPassword(forgotEmail, forgotCode, forgotPassword)
      resetForgot()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
            {forgotMode
              ? (forgotStep === 'email' ? '找回密码' : '重置密码')
              : (tab === 'login' ? '登录' : tab === 'register'
                ? (registerStep === 'form' ? '注册' : '验证邮箱')
                : '激活云存储')}
          </h2>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--text-faint)' }}>
            <X size={14} />
          </button>
        </div>

        {/* 忘记密码流程 */}
        {forgotMode ? (
          forgotStep === 'email' ? (
            <form onSubmit={handleForgotSend} className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                输入绑定的邮箱，我们将发送验证码
              </p>
              <input
                style={inputStyle}
                type="email"
                placeholder="邮箱地址"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetForgot}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? '发送中…' : '发送验证码'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotReset} className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                验证码已发送至 {forgotEmail}，10 分钟内有效
              </p>
              <input
                style={inputStyle}
                placeholder="6 位验证码"
                value={forgotCode}
                onChange={e => setForgotCode(e.target.value)}
                maxLength={6}
                autoFocus
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="新密码（至少 6 位）"
                value={forgotPassword}
                onChange={e => setForgotPassword(e.target.value)}
              />
              {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setForgotStep('email'); setError('') }}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}
                >
                  返回
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? '重置中…' : '重置密码'}
                </button>
              </div>
            </form>
          )
        ) : tab === 'register' ? (
          // 注册两步流程
          registerStep === 'form' ? (
            <form onSubmit={handleRegisterSend} className="flex flex-col gap-3">
              <input
                style={inputStyle}
                placeholder="用户名（2-20 位）"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
                autoFocus
              />
              <input
                style={inputStyle}
                type="email"
                placeholder="邮箱地址"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="密码（至少 6 位）"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
              />
              {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError('') }}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}
                >
                  去登录
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? '发送中…' : '发送验证码'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterVerify} className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                验证码已发送至 <strong style={{ color: 'var(--text)' }}>{regEmail}</strong>，10 分钟内有效
              </p>
              <input
                style={inputStyle}
                placeholder="6 位验证码"
                value={regCode}
                onChange={e => setRegCode(e.target.value)}
                maxLength={6}
                autoFocus
              />
              {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? '注册中…' : '完成注册'}
              </button>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => { resetRegister() }}
                  className="text-xs"
                  style={{ color: 'var(--text-faint)' }}
                >
                  修改信息
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className="text-xs"
                  style={{ color: countdown > 0 ? 'var(--text-faint)' : 'var(--accent)' }}
                >
                  {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送'}
                </button>
              </div>
            </form>
          )
        ) : (
          <>
            {tab !== 'activate' && (
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
                {(['login', 'register'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError('') }}
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
                {loading ? '请稍候…' : tab === 'login' ? '登录' : '激活'}
              </button>

              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError('') }}
                  className="text-xs text-center"
                  style={{ color: 'var(--text-faint)' }}
                >
                  忘记密码？
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
