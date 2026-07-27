import { useState, useEffect, useCallback } from 'react'
import { X, Users, MessageSquare, Key, FileText, Plus, Ban, CheckCircle, Trash2, RefreshCw } from 'lucide-react'
import {
  apiAdminGetSiteContent, apiAdminUpdateSiteContent,
  apiAdminGetUsers, apiAdminBanUser, apiAdminUnbanUser,
  apiAdminGetComments, apiAdminDeleteComment,
  apiAdminGetInviteCodes, apiAdminCreateInviteCode,
  type AdminUser, type AdminComment, type InviteCode,
} from '../../lib/auth'

type Tab = 'site' | 'users' | 'comments' | 'invites'

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('site')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ width: 720, maxWidth: '96vw', maxHeight: '88vh', background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>管理员面板</span>
          <button onClick={onClose} style={{ color: 'var(--text-faint)' }} className="hover:opacity-70 transition-opacity">
            <X size={16} />
          </button>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-1 px-4 pt-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {([
            ['site', FileText, '站点内容'],
            ['users', Users, '用户管理'],
            ['comments', MessageSquare, '评论管理'],
            ['invites', Key, '邀请码'],
          ] as [Tab, typeof FileText, string][]).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-t transition-colors"
              style={{
                color: tab === id ? 'var(--accent)' : 'var(--text-faint)',
                borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'site' && <SiteContentTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'comments' && <CommentsTab />}
          {tab === 'invites' && <InvitesTab />}
        </div>
      </div>
    </div>
  )
}

// ── 站点内容 ──────────────────────────────────────────────────────────────────

function SiteContentTab() {
  const [content, setContent] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiAdminGetSiteContent().then(setContent).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    try {
      await apiAdminUpdateSiteContent(content)
      setMsg('已保存')
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-xs" style={{ color: 'var(--text-faint)' }}>加载中…</div>

  const fields: [string, string, boolean][] = [
    ['tagline', '标语', false],
    ['subtitle', '副标题', false],
    ['news', '动态列表（JSON 数组）', true],
    ['projects', '项目卡片（JSON 数组）', true],
  ]

  return (
    <div className="flex flex-col gap-4">
      {fields.map(([key, label, multi]) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>{label}</label>
          {multi ? (
            <textarea
              rows={6}
              value={content[key] ?? ''}
              onChange={e => setContent(prev => ({ ...prev, [key]: e.target.value }))}
              className="text-xs rounded-lg p-2.5 font-mono resize-y"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
            />
          ) : (
            <input
              type="text"
              value={content[key] ?? ''}
              onChange={e => setContent(prev => ({ ...prev, [key]: e.target.value }))}
              className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '保存中…' : '保存'}
        </button>
        {msg && <span className="text-xs" style={{ color: msg === '已保存' ? '#22c55e' : '#ef4444' }}>{msg}</span>}
      </div>
    </div>
  )
}

// ── 用户管理 ──────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    apiAdminGetUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleBan(user: AdminUser) {
    if (user.banned) await apiAdminUnbanUser(user.id)
    else await apiAdminBanUser(user.id)
    load()
  }

  if (loading) return <div className="text-xs" style={{ color: 'var(--text-faint)' }}>加载中…</div>

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>共 {users.length} 位用户</span>
        <button onClick={load} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-faint)' }}><RefreshCw size={11} />刷新</button>
      </div>
      {users.map(u => (
        <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{u.username}</span>
              {u.role === 'admin' && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#7c3aed22', color: '#a855f7' }}>管理员</span>}
              {u.banned && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#ef444422', color: '#ef4444' }}>已封禁</span>}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
              {u.email ?? '未绑定邮箱'} · {new Date(u.createdAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
          {u.role !== 'admin' && (
            <button
              onClick={() => toggleBan(u)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-opacity hover:opacity-70"
              style={{ background: u.banned ? '#22c55e22' : '#ef444422', color: u.banned ? '#22c55e' : '#ef4444' }}
            >
              {u.banned ? <><CheckCircle size={10} />解封</> : <><Ban size={10} />封禁</>}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 评论管理 ──────────────────────────────────────────────────────────────────

function CommentsTab() {
  const [items, setItems] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    apiAdminGetComments().then(setItems).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function del(id: string) {
    await apiAdminDeleteComment(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div className="text-xs" style={{ color: 'var(--text-faint)' }}>加载中…</div>
  if (!items.length) return <div className="text-xs" style={{ color: 'var(--text-faint)' }}>暂无评论</div>

  return (
    <div className="flex flex-col gap-2">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{item.username ?? '匿名'}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)', whiteSpace: 'pre-wrap' }}>{item.content}</p>
          </div>
          <button onClick={() => del(item.id)} className="flex-shrink-0 hover:opacity-70 transition-opacity" style={{ color: '#ef4444' }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── 邀请码管理 ────────────────────────────────────────────────────────────────

function InvitesTab() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiAdminGetInviteCodes().then(setCodes).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    setCreating(true)
    try {
      await apiAdminCreateInviteCode()
      load()
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="text-xs" style={{ color: 'var(--text-faint)' }}>加载中…</div>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>共 {codes.length} 个邀请码</span>
        <button
          onClick={create}
          disabled={creating}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff', opacity: creating ? 0.6 : 1 }}
        >
          <Plus size={11} />生成邀请码
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {codes.map(c => (
          <div key={c.code} className="flex items-center gap-3 px-3 py-2 rounded-lg font-mono text-xs" style={{ background: 'var(--bg-muted)' }}>
            <span className="flex-1" style={{ color: c.usedByUserId ? 'var(--text-faint)' : 'var(--text)' }}>{c.code}</span>
            {c.usedByUserId ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#6b728022', color: 'var(--text-faint)' }}>已使用</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#22c55e22', color: '#22c55e' }}>可用</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
