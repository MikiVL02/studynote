import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Check, Trash2, Bot, ChevronDown, ChevronUp } from 'lucide-react'

type ModelInfo = {
  id: string
  name: string
  baseURL: string
  modelId?: string
  isActive: boolean
}

export function ModelSettingsModal({ onClose }: { onClose: () => void }) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', apiKey: '', baseURL: '', modelId: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models')
      setModels(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchModels() }, [])

  const activate = async (id: string) => {
    await fetch(`/api/models/${id}/activate`, { method: 'PATCH' })
    setModels(prev => prev.map(m => ({ ...m, isActive: m.id === id })))
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/models/${id}`, { method: 'DELETE' })
    if (res.ok) setModels(prev => {
      const next = prev.filter(m => m.id !== id)
      if (prev.find(m => m.id === id)?.isActive && next.length > 0) next[0].isActive = true
      return next
    })
  }

  const submit = async () => {
    if (!form.name.trim()) { setFormError('请输入名称'); return }
    if (!form.apiKey.trim()) { setFormError('请输入 API Key'); return }
    if (!form.baseURL.trim()) { setFormError('请输入 Base URL'); return }
    setFormError('')
    setSaving(true)
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const model = await res.json()
      setModels(prev => [...prev, model])
      setForm({ name: '', apiKey: '', baseURL: '', modelId: '' })
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  const activeModel = models.find(m => m.isActive)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="rounded-2xl shadow-2xl flex flex-col"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 480, maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bot size={16} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>AI 模型管理</span>
          </div>
          <button onClick={onClose} className="toolbar-btn"><X size={15} /></button>
        </div>

        {/* Active model badge */}
        {activeModel && (
          <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>当前使用</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--accent)' }}>{activeModel.name}</p>
            {activeModel.baseURL && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>{activeModel.baseURL}</p>
            )}
          </div>
        )}

        {/* Model list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading && <p className="text-sm text-center py-4" style={{ color: 'var(--text-faint)' }}>加载中…</p>}
          {models.map(model => (
            <div
              key={model.id}
              className="rounded-xl"
              style={{ border: `1px solid ${model.isActive ? 'var(--accent)' : 'var(--border)'}`, background: model.isActive ? 'var(--accent-subtle)' : 'var(--bg-subtle)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{model.name}</span>
                    {model.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>使用中</span>
                    )}
                  </div>
                  {model.modelId && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>Model ID: {model.modelId}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="toolbar-btn"
                    title="展开详情"
                    onClick={() => setExpandedId(expandedId === model.id ? null : model.id)}
                  >
                    {expandedId === model.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {!model.isActive && (
                    <button
                      className="toolbar-btn"
                      title="设为当前模型"
                      onClick={() => activate(model.id)}
                    >
                      <Check size={13} style={{ color: 'var(--accent)' }} />
                    </button>
                  )}
                  {models.length > 1 && (
                    <button
                      className="toolbar-btn"
                      title="删除"
                      onClick={() => remove(model.id)}
                    >
                      <Trash2 size={13} style={{ color: '#ef4444' }} />
                    </button>
                  )}
                </div>
              </div>
              {expandedId === model.id && (
                <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>Base URL</p>
                  <p className="text-xs mt-0.5 break-all" style={{ color: 'var(--text-muted)' }}>{model.baseURL || '—'}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add model */}
        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm"
              style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Plus size={14} /> 添加模型
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-faint)' }}>添加新模型</p>
              {[
                { key: 'name', label: '名称', placeholder: '如：GPT-4o' },
                { key: 'apiKey', label: 'API Key', placeholder: 'sk-...' },
                { key: 'baseURL', label: 'Base URL', placeholder: 'https://api.openai.com/v1' },
                { key: 'modelId', label: 'Model ID（选填）', placeholder: 'gpt-4o' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs" style={{ color: 'var(--text-faint)' }}>{f.label}</label>
                  {f.key === 'apiKey' ? (
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        autoComplete="off"
                        value={form.apiKey}
                        onChange={e => setForm(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full mt-0.5 px-3 py-1.5 rounded-lg text-sm outline-none pr-12"
                        style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        {showKey ? '隐藏' : '显示'}
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                  )}
                </div>
              ))}
              {formError && <p className="text-xs" style={{ color: '#ef4444' }}>{formError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setAdding(false); setFormError(''); setForm({ name: '', apiKey: '', baseURL: '', modelId: '' }) }}
                  className="flex-1 py-1.5 rounded-lg text-sm"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}
                >取消</button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="flex-1 py-1.5 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
