import { useState, useRef, useEffect } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { apiSendEmailVerify, apiVerifyEmail, apiGetMe } from '../../lib/auth'
import { useAppStore } from '../../stores/appStore'

type Step = 'enter-email' | 'enter-code'

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { currentUser, setCurrentUser } = useAppStore()
  const [step, setStep] = useState<Step>('enter-email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  function startCountdown() {
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(timerRef.current!); return 0 }
        return n - 1
      })
    }, 1000)
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiSendEmailVerify(email)
      setStep('enter-code')
      startCountdown()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setLoading(true)
    try {
      await apiSendEmailVerify(email)
      startCountdown()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiVerifyEmail(code)
      const updated = await apiGetMe()
      setCurrentUser(updated)
      onClose()
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
            {currentUser?.emailVerified ? '邮箱已绑定' : '绑定邮箱'}
          </h2>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--text-faint)' }}>
            <X size={14} />
          </button>
        </div>

        {currentUser?.emailVerified ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--text)' }}>{currentUser.email}</span>
          </div>
        ) : step === 'enter-email' ? (
          <form onSubmit={handleSendCode} className="flex flex-col gap-3">
            <input
              style={inputStyle}
              type="email"
              placeholder="输入邮箱地址"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
            {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? '发送中…' : '发送验证码'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              验证码已发送至 {email}，10 分钟内有效
            </p>
            <input
              style={inputStyle}
              placeholder="输入 6 位验证码"
              value={code}
              onChange={e => setCode(e.target.value)}
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
              {loading ? '验证中…' : '验证'}
            </button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep('enter-email'); setError(''); setCode('') }}
                className="text-xs"
                style={{ color: 'var(--text-faint)' }}
              >
                重新输入邮箱
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className="text-xs"
                style={{ color: countdown > 0 ? 'var(--text-faint)' : 'var(--accent)', cursor: countdown > 0 ? 'default' : 'pointer' }}
              >
                {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
