import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const TYPES = ['NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']
const JURISDICTIONS = ['IN', 'EU', 'US', 'APAC', 'GLOBAL']

// ── Shared field components ────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}

function Select({ value, onChange, options, placeholder = '— Any —' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Textarea({ value, onChange, rows = 4, placeholder = '' }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}

// ── Modal wrapper ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  )
}

// ── Tag pills ──────────────────────────────────────────────────────────────────
function TagList({ tags }) {
  if (!tags?.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">{t}</span>
      ))}
    </div>
  )
}

// ── Create template form (admin) ───────────────────────────────────────────────
function CreateTemplateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', contract_type: '', jurisdiction: '',
    governing_law: '', content: '', tags: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        contract_type: form.contract_type || null,
        jurisdiction: form.jurisdiction || null,
        governing_law: form.governing_law || null,
        content: form.content || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      }
      await api.post('/templates', payload)
      onCreated()
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New template" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title *">
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Standard NDA – India" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contract type">
            <Select value={form.contract_type} onChange={set('contract_type')} options={TYPES} />
          </Field>
          <Field label="Jurisdiction">
            <Select value={form.jurisdiction} onChange={set('jurisdiction')} options={JURISDICTIONS} />
          </Field>
        </div>
        <Field label="Governing law">
          <Input value={form.governing_law} onChange={set('governing_law')} placeholder="e.g. Indian Contract Act, 1872" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} rows={2} placeholder="Short summary of this template's purpose…" />
        </Field>
        <Field label="Template body (plain text)">
          <Textarea
            value={form.content}
            onChange={set('content')}
            rows={8}
            placeholder="Paste the pre-approved contract text here. This becomes the reviewer's editable content when a contract is created from this template."
          />
          <p className="text-xs text-gray-400 mt-1">
            Use <code className="bg-gray-100 px-1 rounded">{'{{counterparty_name}}'}</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{effective_date}}'}</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{expiry_date}}'}</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{governing_law}}'}</code>{' '}
            as placeholders — they are filled automatically when a contract is created from this template.
          </p>
        </Field>
        <Field label="Tags (comma-separated)">
          <Input value={form.tags} onChange={set('tags')} placeholder="e.g. Short-form, Pre-approved" />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create template'}
          </button>
          <button type="button" onClick={onClose}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Instantiate modal (editor+) ────────────────────────────────────────────────
function InstantiateModal({ template, onClose, onCreated }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    counterparty_name: '',
    counterparty_email: '',
    effective_date: '',
    expiry_date: '',
    department: '',
    jurisdiction: template.jurisdiction || '',
    governing_law: template.governing_law || '',
    contract_type: template.contract_type || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {}
      Object.entries(form).forEach(([k, v]) => { if (v) payload[k] = v })
      const res = await api.post(`/templates/${template.id}/instantiate`, payload)
      onCreated()
      onClose()
      navigate(`/contracts/${res.data.id}`)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Failed to create contract')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Use template: ${template.title}`} onClose={onClose}>
      <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
        A new contract in <strong>draft</strong> status will be created from this template.
        {template.content && ' The template body will be pre-loaded for reviewer editing.'}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Contract title">
          <Input value={form.title} onChange={set('title')} placeholder={template.title} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contract type">
            <Select value={form.contract_type} onChange={set('contract_type')} options={TYPES} placeholder="— Inherit from template —" />
          </Field>
          <Field label="Jurisdiction">
            <Select value={form.jurisdiction} onChange={set('jurisdiction')} options={JURISDICTIONS} placeholder="— Inherit from template —" />
          </Field>
        </div>
        <Field label="Governing law">
          <Input value={form.governing_law} onChange={set('governing_law')} placeholder={template.governing_law || 'Inherit from template'} />
        </Field>
        <Field label="Department">
          <Input value={form.department} onChange={set('department')} />
        </Field>
        <Field label="Counterparty name">
          <Input value={form.counterparty_name} onChange={set('counterparty_name')} />
        </Field>
        <Field label="Counterparty email">
          <Input value={form.counterparty_email} onChange={set('counterparty_email')} type="email" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Effective date">
            <Input value={form.effective_date} onChange={set('effective_date')} type="date" />
          </Field>
          <Field label="Expiry date">
            <Input value={form.expiry_date} onChange={set('expiry_date')} type="date" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} rows={2} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating contract…' : 'Create contract'}
          </button>
          <button type="button" onClick={onClose}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Template card ──────────────────────────────────────────────────────────────
function TemplateCard({ template, isAdmin, canInstantiate, onDeactivate, onUse }) {
  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col gap-3 ${!template.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">{template.title}</h3>
            {!template.is_active && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inactive</span>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {canInstantiate && template.is_active && (
            <button
              onClick={() => onUse(template)}
              className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Use template
            </button>
          )}
          {isAdmin && template.is_active && (
            <button
              onClick={() => onDeactivate(template)}
              className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-lg font-medium transition-colors"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {template.contract_type && (
          <span className="px-2 py-0.5 bg-gray-100 rounded-full">{template.contract_type}</span>
        )}
        {template.jurisdiction && (
          <span className="px-2 py-0.5 bg-gray-100 rounded-full">{template.jurisdiction}</span>
        )}
        {template.governing_law && (
          <span className="text-gray-400">· {template.governing_law}</span>
        )}
      </div>

      {template.tags?.length > 0 && <TagList tags={template.tags} />}

      {template.content && (
        <p className="text-xs text-gray-400 font-mono line-clamp-2 bg-gray-50 rounded p-2 border border-gray-100">
          {template.content}
        </p>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canInstantiate = ['editor', 'admin'].includes(user?.role)

  const [templates, setTemplates] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterJurisdiction, setFilterJurisdiction] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [instantiating, setInstantiating] = useState(null) // template object

  useEffect(() => { load() }, [filterType, filterJurisdiction, showInactive])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('contract_type', filterType)
      if (filterJurisdiction) params.set('jurisdiction', filterJurisdiction)
      if (showInactive && isAdmin) params.set('include_inactive', 'true')
      params.set('limit', '100')
      const res = await api.get(`/templates?${params}`)
      setTemplates(res.data.items)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(template) {
    if (!confirm(`Deactivate "${template.title}"? It will no longer be available for new contracts.`)) return
    try {
      await api.delete(`/templates/${template.id}`)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to deactivate template')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Templates{' '}
          <span className="text-base font-normal text-gray-400">({total})</span>
        </h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            + New template
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl p-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterJurisdiction}
          onChange={e => setFilterJurisdiction(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All jurisdictions</option>
          {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        )}
      </div>

      {/* Template grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {isAdmin ? 'No templates yet. Create one with the button above.' : 'No templates available.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              isAdmin={isAdmin}
              canInstantiate={canInstantiate}
              onDeactivate={handleDeactivate}
              onUse={setInstantiating}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
      {instantiating && (
        <InstantiateModal
          template={instantiating}
          onClose={() => setInstantiating(null)}
          onCreated={load}
        />
      )}
    </div>
  )
}
