import { useState } from 'react'
import { User, Cloud, Key } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { LoginModal } from './LoginModal'
import { ProfileModal } from './ProfileModal'

export function UserMenu() {
  const { currentUser, syncStatus, syncFromCloud } = useAppStore()
  const [showLogin, setShowLogin] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  if (!currentUser) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-all"
          style={{ color: 'var(--text-faint)', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <User size={13} />
          <span>登录 / 注册</span>
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    )
  }

  const displayName = currentUser.nickname || currentUser.username

  return (
    <>
      <div className="px-3 py-2 flex flex-col gap-1">
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 w-full text-left rounded-lg transition-all"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="头像" className="w-full h-full object-cover" />
            ) : (
              displayName[0]?.toUpperCase()
            )}
          </div>
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
            {displayName}
          </span>
        </button>

        {currentUser.cloudEnabled ? (
          <button
            onClick={syncFromCloud}
            disabled={syncStatus === 'syncing'}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: syncStatus === 'error' ? '#ef4444' : 'var(--accent)' }}
          >
            <Cloud size={11} />
            {syncStatus === 'syncing' ? '同步中…' : syncStatus === 'error' ? '同步失败' : '云端已开启'}
          </button>
        ) : (
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
          >
            <Key size={11} />
            <span>输入邀请码开启云存储</span>
          </button>
        )}
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}
