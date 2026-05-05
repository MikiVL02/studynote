import { useState, useRef, useEffect } from 'react'
import { X, CheckCircle, Mail, Camera, Key, LogOut, Cloud } from 'lucide-react'
import {
  apiUpdateProfile, apiChangePassword,
  apiSendEmailVerify, apiVerifyEmail, apiActivate, apiGetMe,
} from '../../lib/auth'
import { useAppStore } from '../../stores/appStore'

type Section = 'main' | 'email' | 'email-code' | 'password' | 'change-password'

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser, setCurrentUser, logout, syncStatus, syncFromCloud } = useAppStore()
  const [section, setSection] = useState<Section>('main')

  // 头像/昵称
  const [nickname, setNickname] = useState(currentUser?.nickname ?? '')
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar ?? null)
  const [avatarData, setAvatarData] = useState<string | undefined>(undefined)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 邀请码
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // 邮箱
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 修改密码
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdOk, setPwdOk] = useState(false)

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])

  function startCountdown() {
    setResendCountdown(60)
    countdownRef.current = setInterval(() => {
      setResendCountdown(n => {
        if (n <= 1) { clearInterval(countdownRef.current!); return 0 }
        return n - 1
      })
    }, 1000)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
      setAvatarData(result)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg('')
    try {
      const updated = await apiUpdateProfile(nickname, avatarData)
      setCurrentUser(updated)
      setAvatarData(undefined)
      setProfileMsg('保存成功')
      setTimeout(() => setProfileMsg(''), 2000)
    } catch (err: any) {
      setProfileMsg(err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteLoading(true)
    try {
      await apiActivate(inviteCode)
      const updated = await apiGetMe()
      setCurrentUser(updated)
      await syncFromCloud()
      setInviteCode('')
    } catch (err: any) {
      setInviteError(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleSendEmailCode(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailLoading(true)
    try {
      await apiSendEmailVerify(email)
      setSection('email-code')
      startCountdown()
    } catch (err: any) {
      setEmailError(err.message)
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleResendEmailCode() {
    setEmailError('')
    setEmailLoading(true)
    try {
      await apiSendEmailVerify(email)
      startCountdown()
    } catch (err: any) {
      setEmailError(err.message)
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailLoading(true)
    try {
      await apiVerifyEmail(emailCode)
      const updated = await apiGetMe()
      setCurrentUser(updated)
      setSection('main')
      setEmailCode('')
      setEmail('')
    } catch (err: any) {
      setEmailError(err.message)
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdError('')
    setPwdOk(false)
    setPwdLoading(true)
    try {
      await apiChangePassword(oldPwd, newPwd)
      setOldPwd('')
      setNewPwd('')
      setPwdOk(true)
      setTimeout(() => { setPwdOk(false); setSection('main') }, 1500)
    } catch (err: any) {
      setPwdError(err.message)
    } finally {
      setPwdLoading(false)
    }
  }

  const displayName = currentUser?.nickname || currentUser?.username || ''
  const avatarSrc = avatarPreview || currentUser?.avatar

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl p-6 w-96 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {section !== 'main' && (
              <button
                onClick={() => { setSection('main'); setEmailError(''); setPwdError('') }}
                className="text-xs"
                style={{ color: 'var(--text-faint)' }}
              >
                ←
              </button>
            )}
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {section === 'main' && '个人中心'}
              {section === 'email' && '绑定邮箱'}
              {section === 'email-code' && '验证邮箱'}
              {section === 'password' && '修改密码'}
              {section === 'change-password' && '修改密码'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--text-faint)' }}>
            <X size={14} />
          </button>
        </div>

        {/* 主界面 */}
        {section === 'main' && (
          <>
            {/* 头像 + 昵称 */}
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden cursor-pointer"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                    onClick={() => fileRef.current?.click()}
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      displayName[0]?.toUpperCase()
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <Camera size={10} style={{ color: 'var(--text-faint)' }} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-faint)' }}>昵称</label>
                  <input
                    style={inputStyle}
                    placeholder={currentUser?.username}
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
              {profileMsg && (
                <p className="text-xs" style={{ color: profileMsg === '保存成功' ? 'var(--accent)' : '#ef4444' }}>
                  {profileMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#fff', opacity: profileLoading ? 0.7 : 1 }}
              >
                {profileLoading ? '保存中…' : '保存'}
              </button>
            </form>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* 云存储 / 邀请码 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>云存储</span>
              {currentUser?.cloudEnabled ? (
                <button
                  onClick={syncFromCloud}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: syncStatus === 'error' ? '#ef4444' : 'var(--accent)' }}
                >
                  <Cloud size={13} />
                  {syncStatus === 'syncing' ? '同步中…' : syncStatus === 'error' ? '同步失败，点击重试' : '已开启，点击手动同步'}
                </button>
              ) : (
                <form onSubmit={handleActivate} className="flex flex-col gap-2">
                  <input
                    style={inputStyle}
                    placeholder="输入邀请码（如 MIKI-A7X2-KP9Q）"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                  />
                  {inviteError && <p className="text-xs" style={{ color: '#ef4444' }}>{inviteError}</p>}
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-muted)', color: 'var(--text)', border: '1px solid var(--border)', opacity: inviteLoading ? 0.7 : 1 }}
                  >
                    {inviteLoading ? '激活中…' : '激活云存储'}
                  </button>
                </form>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* 邮箱 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>绑定邮箱</span>
              {currentUser?.emailVerified ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{currentUser.email}</span>
                  <button
                    onClick={() => { setEmail(currentUser.email ?? ''); setSection('email') }}
                    className="text-xs ml-auto"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    更换
                  </button>
                </div>
              ) : currentUser?.email ? (
                <div className="flex items-center gap-2">
                  <Mail size={13} style={{ color: 'var(--text-faint)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{currentUser.email}（未验证）</span>
                  <button
                    onClick={() => { setEmail(currentUser.email ?? ''); setSection('email-code') }}
                    className="text-xs ml-auto"
                    style={{ color: 'var(--accent)' }}
                  >
                    输入验证码
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSection('email')}
                  className="text-sm text-left"
                  style={{ color: 'var(--accent)' }}
                >
                  + 绑定邮箱
                </button>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* 修改密码 */}
            <button
              onClick={() => setSection('change-password')}
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
            >
              <Key size={13} />
              修改密码
            </button>

            {/* 退出登录 */}
            <button
              onClick={() => { logout(); onClose() }}
              className="flex items-center gap-2 text-sm"
              style={{ color: '#ef4444' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <LogOut size={13} />
              退出登录
            </button>
          </>
        )}

        {/* 绑定邮箱 */}
        {section === 'email' && (
          <form onSubmit={handleSendEmailCode} className="flex flex-col gap-3">
            <input
              style={inputStyle}
              type="email"
              placeholder="输入邮箱地址"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
            {emailError && <p className="text-xs" style={{ color: '#ef4444' }}>{emailError}</p>}
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff', opacity: emailLoading ? 0.7 : 1 }}
            >
              {emailLoading ? '发送中…' : '发送验证码'}
            </button>
          </form>
        )}

        {/* 验证邮箱验证码 */}
        {section === 'email-code' && (
          <form onSubmit={handleVerifyEmail} className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              验证码已发送至 {email}，10 分钟内有效
            </p>
            <input
              style={inputStyle}
              placeholder="输入 6 位验证码"
              value={emailCode}
              onChange={e => setEmailCode(e.target.value)}
              maxLength={6}
              autoFocus
            />
            {emailError && <p className="text-xs" style={{ color: '#ef4444' }}>{emailError}</p>}
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff', opacity: emailLoading ? 0.7 : 1 }}
            >
              {emailLoading ? '验证中…' : '验证'}
            </button>
            <button
              type="button"
              onClick={handleResendEmailCode}
              disabled={resendCountdown > 0 || emailLoading}
              className="text-xs text-center"
              style={{ color: resendCountdown > 0 ? 'var(--text-faint)' : 'var(--accent)', cursor: resendCountdown > 0 ? 'default' : 'pointer' }}
            >
              {resendCountdown > 0 ? `${resendCountdown} 秒后可重新发送` : '重新发送验证码'}
            </button>
          </form>
        )}

        {/* 修改密码 */}
        {section === 'change-password' && (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <input
              style={inputStyle}
              type="password"
              placeholder="当前密码"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              autoFocus
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="新密码（至少 6 位）"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
            />
            {pwdError && <p className="text-xs" style={{ color: '#ef4444' }}>{pwdError}</p>}
            {pwdOk && <p className="text-xs" style={{ color: 'var(--accent)' }}>密码修改成功</p>}
            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff', opacity: pwdLoading ? 0.7 : 1 }}
            >
              {pwdLoading ? '修改中…' : '确认修改'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
