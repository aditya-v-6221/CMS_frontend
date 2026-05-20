import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const TYPES = ['NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']
const JURISDICTIONS = ['IN', 'EU', 'US', 'APAC', 'GLOBAL']

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', contract_type: '', department: '',
    jurisdiction: '', governing_law: '', counterparty_name: '',
    counterparty_email: '', effective_date: '', expiry_date: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleFileChange(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setExtracting(true)
    setExtracted(false)
    try {
      const fd = new FormData()
      fd.append('file', selected)
      const res = await api.post('/contracts/extract', fd)
      const data = res.data
      setForm(prev => ({
        ...prev,
        title:             prev.title             || data.title             || '',
        counterparty_name: prev.counterparty_name  || data.counterparty_name || '',
        governing_law:     prev.governing_law      || data.governing_law     || '',
        department:        prev.department         || data.department        || '',
        effective_date:    prev.effective_date     || data.effective_date    || '',
        expiry_date:       prev.expiry_date        || data.expiry_date       || '',
      }))
      setExtracted(true)
    } catch {
      // Silent — extraction failure never blocks upload
    } finally {
      setExtracting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setError('Please select a file'); return }
    setError(''); setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      const res = await api.post('/contracts', fd)
      navigate(`/contracts/${res.data.id}`)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const input = (key, label, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={set(key)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  )

  const select = (key, label, options) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={form[key]} onChange={set(key)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload contract</h1>
        <p className="text-sm text-gray-500 mt-1">Accepted formats: PDF, DOCX</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
        {/* File */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
          <input type="file" accept=".pdf,.docx" required onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          {extracting && <p className="text-sm text-indigo-600 mt-1">Analysing document…</p>}
          {extracted  && <p className="text-sm text-green-600 mt-1">Fields auto-filled from document. Review before submitting.</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {input('title', 'Title')}
          {select('contract_type', 'Contract type', TYPES)}
          {select('jurisdiction', 'Jurisdiction', JURISDICTIONS)}
          {input('department', 'Department')}
          {input('governing_law', 'Governing law')}
          {input('counterparty_name', 'Counterparty name')}
          {input('counterparty_email', 'Counterparty email', 'email')}
          {input('effective_date', 'Effective date', 'date')}
          {input('expiry_date', 'Expiry date', 'date')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={3} value={form.description} onChange={set('description')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Uploading…' : 'Upload'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
