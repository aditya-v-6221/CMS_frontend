import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

const LIFECYCLE_STATUSES = ['draft', 'review', 'approval', 'pending_signature', 'executed', 'expired', 'terminated']
const FILTER_STATUSES = ['', 'draft', 'review', 'approval', 'pending_signature', 'executed', 'expired', 'terminated']
const TYPES = ['', 'NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']
const JURISDICTIONS = ['', 'IN', 'EU', 'US', 'APAC', 'GLOBAL']

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [counts, setCounts] = useState({})
  const [contracts, setContracts] = useState([])
  const [total, setTotal] = useState(0)
  const [countsLoaded, setCountsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 20

  const filters = {
    lifecycle_status: searchParams.get('status') || '',
    contract_type: searchParams.get('type') || '',
    jurisdiction: searchParams.get('jurisdiction') || '',
    counterparty: searchParams.get('counterparty') || '',
  }

  useEffect(() => {
    async function loadCounts() {
      const res = await api.get('/contracts?limit=200')
      const all = res.data.items
      const c = {}
      LIFECYCLE_STATUSES.forEach(s => { c[s] = all.filter(x => x.lifecycle_status === s).length })
      setCounts(c)
      setCountsLoaded(true)
    }
    loadCounts().catch(() => setCountsLoaded(true))
  }, [])

  useEffect(() => { loadContracts() }, [searchParams, page])

  async function loadContracts() {
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Draft', key: 'draft', color: 'border-gray-300' },
          { label: 'In Review', key: 'review', color: 'border-yellow-400' },
          { label: 'Approval', key: 'approval', color: 'border-blue-400' },
          { label: 'Pending Sign', key: 'pending_signature', color: 'border-purple-400' },
          { label: 'Executed', key: 'executed', color: 'border-green-400' },
          { label: 'Expired', key: 'expired', color: 'border-red-400' },
          { label: 'Terminated', key: 'terminated', color: 'border-red-600' },
        ].map(({ label, key, color }) => (
          <button
            key={key}
            onClick={() => setFilter('status', filters.lifecycle_status === key ? '' : key)}
            className={`bg-white rounded-xl border-l-4 ${color} shadow-sm p-4 hover:shadow-md transition-shadow text-left ${
              filters.lifecycle_status === key ? 'ring-2 ring-indigo-300' : ''
            }`}
          >
            <p className="text-3xl font-bold text-gray-900">{countsLoaded ? (counts[key] ?? 0) : '—'}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Contracts list */}
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          {total} contract{total !== 1 ? 's' : ''}{filters.lifecycle_status ? ` · ${filters.lifecycle_status}` : ''}
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl p-4">
          <select value={filters.lifecycle_status} onChange={e => setFilter('status', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            {FILTER_STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
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
    </div>
  )
}
