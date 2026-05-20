import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import AdminCommentsPanel from '../components/document/AdminCommentsPanel'
import DocumentPanel from '../components/document/DocumentPanel'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

const LIFECYCLE_STEPS = [
  { key: 'draft',              label: 'Draft',            desc: 'Contract created' },
  { key: 'review',             label: 'Legal Review',     desc: 'Under legal review' },
  { key: 'approval',           label: 'Approval',         desc: 'Awaiting approval' },
  { key: 'pending_signature',  label: 'Pending Signature',desc: 'Sent for signing' },
  { key: 'executed',           label: 'Executed',         desc: 'Agreement executed' },
]

function getStepEntry(stepKey, history) {
  switch (stepKey) {
    case 'draft':
      return history.find(h => h.action === 'created' || h.action === 'created_from_template')
    case 'review':
      // Who completed the review (reviewer's approval decision)
      return history.find(h => h.action === 'review_decision:approved')
    case 'approval':
      // Who gave the admin approval
      return history.find(h => h.action === 'approval_decision:approved')
    case 'pending_signature':
      return history.find(h => h.action.includes('->pending_signature'))
    case 'executed':
      return history.find(h => h.action.includes('->executed'))
    default:
      return null
  }
}

export default function ContractDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [comments, setComments] = useState([])
  const [userNames, setUserNames] = useState({})
  const [newComment, setNewComment] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [reviewerSearch, setReviewerSearch] = useState('')
  const [reviewerResults, setReviewerResults] = useState([])
  const searchTimer = useRef(null)

  const canEdit = ['editor', 'admin'].includes(user?.role)
  const isAdmin = user?.role === 'admin'

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const [cRes, sRes, hRes, cmRes] = await Promise.all([
        api.get(`/contracts/${id}`),
        api.get(`/contracts/${id}/status`),
        api.get(`/audit/contracts/${id}?limit=100`),
        api.get(`/contracts/${id}/comments`),
      ])
      setContract(cRes.data)
      setStatus(sRes.data)
      setHistory(hRes.data.items)
      setComments(cmRes.data)
      try {
        const usersRes = await api.get('/auth/users?limit=200')
        const nameMap = {}
        usersRes.data.forEach(u => { nameMap[u.id] = u.full_name || u.email })
        setUserNames(nameMap)
      } catch {
        // non-admins can't list users — stepper falls back to "User #X"
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load contract')
    }
  }

  async function action(endpoint, label, body = {}) {
    setActionLoading(label)
    setError('')
    try {
      await api.post(`/contracts/${id}/${endpoint}`, body)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || `${label} failed`)
    } finally {
      setActionLoading('')
    }
  }

  async function postComment() {
    if (!newComment.trim()) return
    await api.post(`/contracts/${id}/comments`, { content: newComment })
    setNewComment('')
    await load()
  }

  function searchReviewers(q) {
    setReviewerSearch(q)
    clearTimeout(searchTimer.current)
    if (!q.trim()) { setReviewerResults([]); return }
    searchTimer.current = setTimeout(async () => {
      const res = await api.get(`/auth/users/search?q=${encodeURIComponent(q)}`)
      setReviewerResults(res.data)
    }, 300)
  }

  async function assignReviewer(userId) {
    await api.post(`/contracts/${id}/reviewers`, {
      assignments: [{ user_id: userId, review_order: 1 }]
    })
    setReviewerSearch('')
    setReviewerResults([])
    await load()
  }

  async function deleteContract() {
    if (!confirm('Delete this contract? This cannot be undone.')) return
    await api.delete(`/contracts/${id}`)
    navigate('/')
  }

  if (error && !contract) return <div className="p-8 text-red-600">{error}</div>
  if (!contract) return <div className="p-8 text-gray-400">Loading…</div>

  const lc = contract.lifecycle_status
  const isOwner = contract.owner_id === user?.id
  const isAssignedReviewer =
    lc === 'review' &&
    (status?.reviewers ?? []).some(r => r.reviewer_id === user?.id)
  const isReviewer = isAssignedReviewer

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{contract.title || contract.original_filename}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={lc} />
            {contract.contract_type && <span className="text-sm text-gray-500">{contract.contract_type}</span>}
            {contract.jurisdiction && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{contract.jurisdiction}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const res = await api.get(`/contracts/${id}/download`, { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a')
              a.href = url
              a.download = contract.original_filename || `contract_${id}.pdf`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Download PDF
          </button>
          {isAdmin && (
            <button onClick={deleteContract} className="text-sm text-red-600 hover:underline">Delete</button>
          )}
        </div>
      </div>

      {/* Lifecycle stepper */}
      <LifecycleStepper lc={lc} history={history} userNames={userNames} />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

      {isReviewer && !isAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3.536 3.536-6 6H9v-3.536z" />
          </svg>
          <span>
            <strong>You are assigned as a reviewer.</strong> Edit the contract text below and save your changes.
          </span>
        </div>
      )}

      <DocumentPanel
        contractId={id}
        fileType={contract.file_type}
        isDrafter={isOwner}
        isReviewer={isReviewer && !isAdmin}
        isAdmin={isAdmin}
        reviewedContent={contract.reviewed_content}
        contractMeta={{
          counterparty_name: contract.counterparty_name,
          effective_date:    contract.effective_date,
          expiry_date:       contract.expiry_date,
          governing_law:     contract.governing_law,
          jurisdiction:      contract.jurisdiction,
          contract_type:     contract.contract_type,
          department:        contract.department,
          title:             contract.title,
        }}
        onSaved={load}
      />

      <div className="space-y-4">
        {/* Metadata */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Counterparty', contract.counterparty_name],
              ['Email', contract.counterparty_email],
              ['Department', contract.department],
              ['Governing law', contract.governing_law],
              ['Effective', contract.effective_date],
              ['Expiry', contract.expiry_date],
              ['eSign provider', contract.esign_provider],
              ['eSign status', contract.esign_status],
            ].map(([label, val]) => val && (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{val}</dd>
              </div>
            ))}
            {status?.days_until_expiry != null && (
              <div>
                <dt className="text-gray-500">Days until expiry</dt>
                <dd className={`font-medium ${status.days_until_expiry < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                  {status.days_until_expiry}d
                </dd>
              </div>
            )}
          </dl>
          {contract.description && (
            <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">{contract.description}</p>
          )}
        </div>

        {/* Assign Reviewer (draft only) */}
        {canEdit && lc === 'draft' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Assign Legal Reviewer</h2>
            <div className="relative">
              <input
                value={reviewerSearch}
                onChange={e => searchReviewers(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {reviewerResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100">
                  {reviewerResults.map(u => (
                    <li key={u.id}
                      onClick={() => assignReviewer(u.id)}
                      className="px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{u.full_name || u.email}</span>
                        <span className="ml-2 text-gray-400 text-xs">{u.email}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{u.department || u.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {status?.reviewers?.length > 0 && (
              <p className="mt-2 text-xs text-green-600">{status.reviewers.length} reviewer(s) assigned</p>
            )}
          </div>
        )}

        {/* Workflow actions */}
        {(canEdit || isAdmin) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Actions</h2>
            <div className="flex flex-wrap gap-2">
              {canEdit && lc === 'draft' && (
                <ActionBtn label="Submit for review" onClick={() => action('submit-for-review', 'Submit for review')} loading={actionLoading} />
              )}
              {isAssignedReviewer && (
                <ActionBtn label="Approve review" onClick={() => action('reviewers/decision', 'Approve review', { decision: 'approved' })} loading={actionLoading} />
              )}
              {isAssignedReviewer && (
                <ActionBtn label="Reject review" onClick={() => action('reviewers/decision', 'Reject review', { decision: 'rejected' })} loading={actionLoading} danger />
              )}
              {isAdmin && lc === 'approval' && (
                <ActionBtn label="Approve" onClick={() => action('approve', 'Approve')} loading={actionLoading} />
              )}
              {isAdmin && lc === 'approval' && (
                <ActionBtn label="Reject" onClick={() => action('reject', 'Reject')} loading={actionLoading} danger />
              )}
              {canEdit && lc === 'pending_signature' && (
                <ActionBtn label="Mark executed" onClick={() => action('mark-executed', 'Mark executed')} loading={actionLoading} />
              )}
              {canEdit && lc === 'executed' && (
                <ActionBtn label="Mark expired" onClick={() => action('mark-expired', 'Mark expired')} loading={actionLoading} />
              )}
              {isAdmin && lc !== 'terminated' && (
                <ActionBtn label="Terminate" onClick={() => action('terminate', 'Terminate')} loading={actionLoading} danger />
              )}
            </div>
          </div>
        )}

        {/* Legal Reviewers */}
        {status?.reviewers?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Legal Review</h2>
            <ul className="space-y-2">
              {status.reviewers.map(r => (
                <li key={r.reviewer_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{r.reviewer_name || `Reviewer #${r.reviewer_id}`}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === 'approved' ? 'bg-green-100 text-green-700' :
                    r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Comments <span className="text-gray-400 font-normal">({status?.open_comment_count ?? 0} open)</span>
          </h2>
          {isAdmin ? (
            <AdminCommentsPanel contractId={id} comments={comments} onResolved={load} />
          ) : (
            <ul className="space-y-3 mb-4">
              {comments.length === 0 && <li className="text-sm text-gray-400">No comments yet</li>}
              {comments.map(c => (
                <li key={c.id} className={`text-sm p-3 rounded-lg ${c.is_resolved ? 'bg-gray-50 text-gray-400' : 'bg-indigo-50 text-gray-700'}`}>
                  <span className={`font-medium ${c.is_resolved ? 'line-through' : ''}`}>
                    {c.user_name || `User #${c.user_id}`}
                  </span>
                  <span className={c.is_resolved ? 'line-through' : ''}>: {c.content}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 mt-4">
            <input value={newComment} onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={postComment}
              className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700">
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LifecycleStepper({ lc, history, userNames }) {
  const isTerminal = lc === 'expired' || lc === 'terminated'
  const currentIdx = isTerminal
    ? LIFECYCLE_STEPS.length
    : LIFECYCLE_STEPS.findIndex(s => s.key === lc)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
      <div className="flex items-start">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = !isTerminal && idx === currentIdx
          const entry = (isDone || isCurrent) ? getStepEntry(step.key, history) : null
          const userName = entry?.user_id ? (userNames[entry.user_id] || `User #${entry.user_id}`) : null

          return (
            <div key={step.key} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Circle */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 ${
                  isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isDone
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    : <span className="text-sm">{idx + 1}</span>
                  }
                </div>
                {/* Step label */}
                <p className={`mt-2 text-xs font-semibold whitespace-nowrap ${
                  isDone ? 'text-green-700' : isCurrent ? 'text-indigo-700' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
                {/* User + timestamp */}
                {entry ? (
                  <div className="mt-1 text-center">
                    {userName && <p className="text-xs text-gray-700 font-medium">{userName}</p>}
                    <p className="text-xs text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ) : isCurrent ? (
                  <p className="text-xs text-indigo-400 mt-1 text-center">{step.desc}</p>
                ) : null}
              </div>

              {/* Connector line */}
              {idx < LIFECYCLE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mt-4 mx-3 ${
                  idx < currentIdx ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {isTerminal && (
        <div className={`mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
          lc === 'terminated' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
        }`}>
          {lc === 'terminated' ? 'Contract terminated' : 'Contract expired'}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, onClick, loading, danger }) {
  return (
    <button onClick={onClick} disabled={loading === label}
      className={`text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 ${
        danger
          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
      }`}>
      {loading === label ? '…' : label}
    </button>
  )
}
