import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

const JURISDICTIONS = ['', 'IN', 'EU', 'US', 'APAC', 'GLOBAL']
const CONTRACT_TYPES = ['', 'NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']
const LIFECYCLE_STATUSES = ['', 'draft', 'review', 'approval', 'pending_signature', 'executed', 'expired', 'terminated']

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [contractType, setContractType] = useState('')
  const [lifecycleStatus, setLifecycleStatus] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  async function search(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const params = {}
      if (q.trim()) params.q = q.trim()
      if (jurisdiction) params.jurisdiction = jurisdiction
      if (contractType) params.contract_type = contractType
      if (lifecycleStatus) params.lifecycle_status = lifecycleStatus

      // Use /search/repository which supports both text + filters
      const res = await api.get('/search/repository', { params })
      setResults(res.data)
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setQ('')
    setJurisdiction('')
    setContractType('')
    setLifecycleStatus('')
    setResults(null)
  }

  const hasFilters = q || jurisdiction || contractType || lifecycleStatus

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Search</h1>
      <p className="text-sm text-gray-500 -mt-4">Search by keyword, jurisdiction, type, or status — or combine all filters.</p>

      <form onSubmit={search} className="space-y-3">
        {/* Text search */}
        <div className="flex gap-3">
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search contracts by keyword…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          <button type="submit" disabled={loading}
            className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3">
          <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All jurisdictions</option>
            {JURISDICTIONS.filter(Boolean).map(j => <option key={j} value={j}>{j}</option>)}
          </select>

          <select value={contractType} onChange={e => setContractType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All types</option>
            {CONTRACT_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={lifecycleStatus} onChange={e => setLifecycleStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All statuses</option>
            {LIFECYCLE_STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>

          {hasFilters && (
            <button type="button" onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-gray-600 px-2">
              Clear
            </button>
          )}
        </div>
      </form>

      {results && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 text-sm text-gray-500">
            {results.total} result{results.total !== 1 ? 's' : ''}
            {q && <> for <strong>"{q}"</strong></>}
            {jurisdiction && <> · <span className="font-medium">{jurisdiction}</span></>}
            {contractType && <> · <span className="font-medium">{contractType}</span></>}
            {lifecycleStatus && <> · <span className="font-medium">{lifecycleStatus.replace('_', ' ')}</span></>}
          </div>
          {results.total === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No matches found</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.items.map(c => (
                <li key={c.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <Link to={`/contracts/${c.id}`} className="text-indigo-600 hover:underline font-medium text-sm">
                      {c.title || c.original_filename}
                    </Link>
                    <div className="flex gap-2 mt-1">
                      {c.contract_type && <span className="text-xs text-gray-400">{c.contract_type}</span>}
                      {c.counterparty_name && <span className="text-xs text-gray-400">· {c.counterparty_name}</span>}
                      {c.jurisdiction && <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{c.jurisdiction}</span>}
                    </div>
                  </div>
                  <StatusBadge status={c.lifecycle_status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
