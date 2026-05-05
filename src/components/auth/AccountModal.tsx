import { useState } from 'react'
import { X, CheckCircle, Mail } from 'lucide-react'
import { apiSendEmailVerify, apiVerifyEmail, apiGetMe } from '../../lib/auth'
import { useAppStore } from '../../stores/appStore'

type Step = 'status' | 'enter-email' | 'enter-code'

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { currentUser, setCurrentUser } = useAppStore()
  const [step, setStep] = useState<Step>('status')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiSendEmailVerify(email)
      setStep('enter-code')
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
      await apiSendEmailVerify(currentUser?.email ?? '')
      setStep('enter-code')
      setEmail(currentUser?.email ?? '')
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
      setStep('status')
      setCode('')
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
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>账号管理</h2>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--text-faint)' }}>
            <X size={14} />
          </button>
        </div>

        {step === 'status' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>绑定邮箱</span>
              {currentUser?.emailVerified ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{currentUser.email}</span>
                </div>
              ) : currentUser?.email ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} style={{ color: 'var(--text-faint)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {currentUser.email}（未验证）
                    </span>
                  </div>
                  {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleResend}
                      disabled={loading}
                      className="text-xs"
                      style={{ color: 'var(--accent)', opacity: loading ? 0.7 : 1 }}
                    >
                      {loading ? '发送中…' : '重新发送验证码'}
                    </button>
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>·</span>
                    <button
                      onClick={() => { setEmail(currentUser.email ?? ''); setStep('enter-code') }}
                      className="text-xs"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      输入验证码
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setStep('enter-email')}
                  className="text-xs text-left"
                  style={{ color: 'var(--accent)' }}
                >
                  + 绑定邮箱
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'enter-email' && (
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setStep('status'); setError('') }}
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
        )}

        {step === 'enter-code' && (
          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              验证码已发送至 {email || currentUser?.email}，10 分钟内有效
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setStep('enter-email'); setError(''); setCode('') }}
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
                {loading ? '验证中…' : '验证'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
