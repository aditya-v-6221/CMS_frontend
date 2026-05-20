import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['', 'draft', 'review', 'approval', 'pending_signature', 'executed', 'expired', 'terminated']
const TYPES = ['', 'NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']
const JURISDICTIONS = ['', 'IN', 'EU', 'US', 'APAC', 'GLOBAL']

export default function ContractsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [contracts, setContracts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 20

  const filters = {
    lifecycle_status: searchParams.get('status') || '',
    contract_type: searchParams.get('type') || '',
    jurisdiction: searchParams.get('jurisdiction') || '',
    counterparty: searchParams.get('counterparty') || '',
  }

  useEffect(() => { load() }, [searchParams, page])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.lifecycle_status) params.set('lifecycle_status', filters.lifecycle_status)
      if (filters.contract_type) params.set('contract_type', filters.contract_type)
      if (filters.jurisdiction) params.set('jurisdiction', filters.jurisdiction)
      if (filters.counterparty) params.set('counterparty', filters.counterparty)
      params.set('skip', page * limit)
      params.set('limit', limit)
      const res = await api.get(`/contracts?${params}`)
      setContracts(res.data.items)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next)
    setPage(0)
  }

  const canUpload = ['editor', 'admin'].includes(user?.role)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contracts <span className="text-base font-normal text-gray-400">({total})</span></h1>
        {canUpload && (
          <Link to="/contracts/upload"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">
            + Upload contract
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl p-4">
        <select value={filters.lifecycle_status} onChange={e => setFilter('status', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <select value={filters.contract_type} onChange={e => setFilter('type', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          {TYPES.map(t => <option key={t} value={t}>{t || 'All types'}</option>)}
        </select>
        <select value={filters.jurisdiction} onChange={e => setFilter('jurisdiction', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          {JURISDICTIONS.map(j => <option key={j} value={j}>{j || 'All jurisdictions'}</option>)}
        </select>
        <input placeholder="Counterparty…" value={filters.counterparty}
          onChange={e => setFilter('counterparty', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44" />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : contracts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No contracts found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jurisdiction</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Counterparty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/contracts/${c.id}`} className="text-indigo-600 hover:underline font-medium">
                      {c.title || c.original_filename}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.contract_type || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.jurisdiction || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{c.counterparty_name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.lifecycle_status} /></td>
                  <td className="px-4 py-3 text-gray-500">{c.expiry_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
