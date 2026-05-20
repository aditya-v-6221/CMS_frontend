import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function UrgencyBadge({ days }) {
  if (days <= 7)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{days}d left</span>
  if (days <= 14) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{days}d left</span>
  return              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{days}d left</span>
}

export default function DeadlineTrackerPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.get('/contracts?limit=200')
        const all = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
        const today = new Date()
        const cutoff = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

        const expiring = all
          .filter(c => {
            if (!c.expiry_date) return false
            const d = new Date(c.expiry_date)
            return d >= today && d <= cutoff
          })
          .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))

        setContracts(expiring)
      } catch (e) {
        console.error('Deadline tracker load failed:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const critical = contracts.filter(c => daysUntil(c.expiry_date) <= 7)
  const warning  = contracts.filter(c => { const d = daysUntil(c.expiry_date); return d > 7 && d <= 14 })
  const upcoming = contracts.filter(c => daysUntil(c.expiry_date) > 14)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 px-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deadline Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">Contracts expiring within the next 30 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border-l-4 border-red-500 shadow-sm p-4">
          <p className="text-3xl font-bold text-gray-900">{loading ? '—' : critical.length}</p>
          <p className="text-sm text-gray-500 mt-1">Critical (≤7 days)</p>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-orange-400 shadow-sm p-4">
          <p className="text-3xl font-bold text-gray-900">{loading ? '—' : warning.length}</p>
          <p className="text-sm text-gray-500 mt-1">Warning (8–14 days)</p>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-yellow-400 shadow-sm p-4">
          <p className="text-3xl font-bold text-gray-900">{loading ? '—' : upcoming.length}</p>
          <p className="text-sm text-gray-500 mt-1">Upcoming (15–30 days)</p>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-700 font-medium">No contracts expiring in the next 30 days</p>
          <p className="text-sm text-gray-400 mt-1">You're all clear.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Counterparty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map(c => {
                const days = daysUntil(c.expiry_date)
                const rowHighlight = days <= 7 ? 'bg-red-50' : days <= 14 ? 'bg-orange-50' : ''
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 ${rowHighlight}`}>
                    <td className="px-4 py-3">
                      <Link to={`/contracts/${c.id}`} className="text-indigo-600 hover:underline font-medium">
                        {c.title || c.original_filename}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.contract_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{c.counterparty_name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.lifecycle_status} /></td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{c.expiry_date}</td>
                    <td className="px-4 py-3"><UrgencyBadge days={days} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
