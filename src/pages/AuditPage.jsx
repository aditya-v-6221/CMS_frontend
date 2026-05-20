import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

const ACTION_META = {
  created:                      { label: 'Created',           color: 'bg-blue-500',   icon: 'document' },
  created_from_template:        { label: 'From template',     color: 'bg-blue-500',   icon: 'document' },
  updated:                      { label: 'Updated',           color: 'bg-gray-400',   icon: 'edit' },
  deleted:                      { label: 'Deleted',           color: 'bg-red-500',    icon: 'trash' },
  reviewers_assigned:           { label: 'Reviewer set',      color: 'bg-indigo-400', icon: 'users' },
  reviewer_removed:             { label: 'Reviewer removed',  color: 'bg-gray-400',   icon: 'users' },
  version_created:              { label: 'v1 snapshot',       color: 'bg-gray-300',   icon: 'git' },
  review_version_created:       { label: 'Review saved',      color: 'bg-amber-400',  icon: 'edit' },
  'review_decision:approved':   { label: 'Review approved',   color: 'bg-green-500',  icon: 'check' },
  'review_decision:rejected':   { label: 'Review rejected',   color: 'bg-red-400',    icon: 'x' },
  'approval_decision:approved': { label: 'Approved',          color: 'bg-green-600',  icon: 'check' },
  'approval_decision:rejected': { label: 'Rejected',          color: 'bg-red-500',    icon: 'x' },
  'esign:sent':                 { label: 'Sent for sign',     color: 'bg-purple-500', icon: 'mail' },
  'esign:webhook:signed':       { label: 'Signed',            color: 'bg-green-500',  icon: 'pen' },
  'esign:webhook:viewed':       { label: 'Viewed',            color: 'bg-sky-400',    icon: 'eye' },
  'esign:webhook:declined':     { label: 'Declined',          color: 'bg-red-500',    icon: 'x' },
  'external_token:created':     { label: 'Link created',      color: 'bg-purple-400', icon: 'link' },
  'external_token:used':        { label: 'Link used',         color: 'bg-purple-600', icon: 'pen' },
}

function getActionMeta(action) {
  if (ACTION_META[action]) return ACTION_META[action]
  if (action.startsWith('lifecycle:')) {
    const to = action.split('->')[1]?.replace(/_/g, ' ')
    return { label: to ? `→ ${to}` : 'Status change', color: 'bg-indigo-500', icon: 'arrow' }
  }
  return { label: action.replace(/_/g, ' '), color: 'bg-gray-400', icon: 'dot' }
}

function ActionIcon({ type }) {
  const cls = 'w-3.5 h-3.5 text-white'
  if (type === 'check') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
  if (type === 'x') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
  if (type === 'document') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  if (type === 'edit') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
  if (type === 'trash') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16"/></svg>
  if (type === 'users') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  if (type === 'mail') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
  if (type === 'pen') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3.536 3.536-6 6H9v-2.828z"/></svg>
  if (type === 'eye') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
  if (type === 'arrow') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
  if (type === 'link') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
  if (type === 'git') return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6M3 12h6m6 0h6"/></svg>
  return <span className="w-2 h-2 rounded-full bg-white inline-block" />
}

export default function AuditPage() {
  const [contracts, setContracts] = useState([])  // [{id, title, events:[]}]
  const [userNames, setUserNames] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const perPage = 10

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Fetch all audit logs in pages (backend max limit=200)
        const logs = []
        let skip = 0
        while (true) {
          const res = await api.get(`/audit?skip=${skip}&limit=200`)
          const batch = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
          logs.push(...batch)
          const total = res.data?.total ?? batch.length
          skip += batch.length
          if (batch.length === 0 || logs.length >= total) break
        }

        // Resolve user names — fail silently if not admin
        try {
          const usersRes = await api.get('/auth/users?limit=200')
          const nameMap = {}
          usersRes.data.forEach(u => { nameMap[u.id] = u.full_name || u.email })
          setUserNames(nameMap)
        } catch {}

        // Resolve contract titles — fail silently
        const titleMap = {}
        try {
          const contractsRes = await api.get('/contracts?limit=200')
          const items = Array.isArray(contractsRes.data) ? contractsRes.data : (contractsRes.data?.items ?? [])
          items.forEach(c => { titleMap[c.id] = c.title || c.original_filename })
        } catch {}

        // Group by contract entity only
        const grouped = {}
        logs.forEach(l => {
          if (l.entity_type !== 'contract') return
          if (!grouped[l.entity_id]) grouped[l.entity_id] = []
          grouped[l.entity_id].push(l)
        })

        const contractList = Object.entries(grouped)
          .map(([id, events]) => ({
            id: Number(id),
            title: titleMap[id] || `Contract #${id}`,
            events: [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
            latestAt: Math.max(...events.map(e => new Date(e.created_at))),
          }))
          .sort((a, b) => b.latestAt - a.latestAt)

        setContracts(contractList)
        setTotal(contractList.length)
      } catch (e) {
        console.error('Audit load failed:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const paged = contracts.slice(page * perPage, (page + 1) * perPage)

  return (
    <div className="p-6 max-w-full mx-auto space-y-4 px-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Audit log <span className="text-base font-normal text-gray-400">({total} contracts)</span>
      </h1>

      {loading ? (
        <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>
      ) : (
        <div className="space-y-4">
          {paged.map(contract => (
            <ContractTimeline
              key={contract.id}
              contract={contract}
              userNames={userNames}
            />
          ))}
        </div>
      )}

      {total > perPage && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, total)} of {total} contracts
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * perPage >= total}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContractTimeline({ contract, userNames }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 truncate">{contract.title}</h2>
        <Link
          to={`/contracts/${contract.id}`}
          className="ml-4 flex-shrink-0 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 font-medium"
        >
          View contract →
        </Link>
      </div>

      {/* Horizontal timeline */}
      <div className="overflow-x-auto pb-1">
        <div className="flex items-start min-w-max">
          {contract.events.map((event, idx) => {
            const meta = getActionMeta(event.action)
            const userName = event.user_id
              ? (userNames[event.user_id] || `User #${event.user_id}`)
              : 'system'
            const time = new Date(event.created_at).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })

            return (
              <div key={event.id} className="flex items-start">
                {/* Node */}
                <div className="flex flex-col items-center w-24">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${meta.color}`}>
                    <ActionIcon type={meta.icon} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-gray-700 text-center leading-tight px-1">
                    {meta.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 text-center leading-tight px-1 truncate w-full">
                    {userName.split(' ')[0]}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 text-center leading-tight">
                    {time}
                  </p>
                </div>

                {/* Connector */}
                {idx < contract.events.length - 1 && (
                  <div className="w-6 h-0.5 bg-gray-200 mt-4 flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
