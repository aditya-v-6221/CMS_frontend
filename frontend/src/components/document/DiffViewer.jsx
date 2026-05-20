import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function DiffViewer({ contractId, onStatusChange, isAdmin }) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)
  const [merging, setMerging] = useState(false)
  const [mergeSuccess, setMergeSuccess] = useState(false)
  const [mergeError, setMergeError] = useState('')

  useEffect(() => {
    load()
  }, [contractId])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/contracts/${contractId}/changes`)
      setChanges(res.data)
    } catch (err) {
      setError('Could not load reviewer changes.')
    } finally {
      setLoading(false)
    }
  }

  async function mergeAccepted() {
    setMerging(true)
    setMergeError('')
    try {
      await api.post(`/contracts/${contractId}/review-approve`)
      setMergeSuccess(true)
      onStatusChange?.()
    } catch (err) {
      setMergeError(err?.response?.data?.detail || 'Failed to merge changes.')
    } finally {
      setMerging(false)
    }
  }

  async function setStatus(changeId, status) {
    setUpdating(changeId)
    try {
      await api.patch(`/contracts/${contractId}/changes/${changeId}`, { status })
      setChanges(prev => prev.map(c => c.id === changeId ? { ...c, status } : c))
      onStatusChange?.()
    } catch {
      // ignore
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
      Loading changes…
    </div>
  )

  if (error) return (
    <div className="text-red-500 text-sm">{error}</div>
  )

  if (changes.length === 0) return (
    <div className="flex items-center gap-2 px-3 py-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      No paragraph-level changes detected (reviewer may have made minor inline edits).
    </div>
  )

  const pending = changes.filter(c => c.status === 'pending').length
  const accepted = changes.filter(c => c.status === 'accepted').length
  const rejected = changes.filter(c => c.status === 'rejected').length

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-xs text-gray-500 pb-1 border-b border-gray-100">
        <span>{changes.length} change{changes.length !== 1 ? 's' : ''} tracked</span>
        {pending > 0 && <span className="text-amber-600">{pending} pending review</span>}
        {accepted > 0 && <span className="text-green-600">{accepted} accepted</span>}
        {rejected > 0 && <span className="text-red-600">{rejected} rejected</span>}
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            {mergeSuccess && (
              <span className="text-green-600 font-medium">Changes merged into new version</span>
            )}
            {mergeError && (
              <span className="text-red-500">{mergeError}</span>
            )}
            {!mergeSuccess && (
              <button
                onClick={mergeAccepted}
                disabled={merging || accepted === 0}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {merging ? 'Merging…' : `Merge ${accepted} accepted change${accepted !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        )}
        {!isAdmin && <span className="ml-auto text-gray-400">Pending and accepted changes go into the Final PDF</span>}
      </div>

      {changes.map(change => (
        <ChangeCard
          key={change.id}
          change={change}
          updating={updating === change.id}
          onAccept={() => setStatus(change.id, 'accepted')}
          onReject={() => setStatus(change.id, 'rejected')}
          onReset={() => setStatus(change.id, 'pending')}
        />
      ))}
    </div>
  )
}

// Word-level LCS diff — returns [{type:'equal'|'delete'|'insert', text}]
function wordDiff(original, proposed) {
  const a = original.split(/(\s+)/).filter(Boolean)
  const b = proposed.split(/(\s+)/).filter(Boolean)
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])
  const tokens = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
      tokens.unshift({ type: 'equal', text: a[i-1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      tokens.unshift({ type: 'insert', text: b[j-1] }); j--
    } else {
      tokens.unshift({ type: 'delete', text: a[i-1] }); i--
    }
  }
  return tokens
}

function InlineDiff({ original, proposed, side }) {
  if (!original && side === 'original') return <em className="not-italic text-gray-400">— (new paragraph)</em>
  if (!proposed && side === 'proposed') return <em className="not-italic text-gray-400">— (deleted)</em>
  if (!original || !proposed) return <span className="text-gray-700">{side === 'original' ? original : proposed}</span>

  const tokens = wordDiff(original, proposed)
  return (
    <>
      {tokens
        .filter(t => t.type !== (side === 'original' ? 'insert' : 'delete'))
        .map((t, i) => {
          const isChanged = t.type !== 'equal'
          if (side === 'original')
            return <span key={i} className={isChanged ? 'text-red-600 line-through decoration-red-400' : 'text-gray-700'}>{t.text}</span>
          return <span key={i} className={isChanged ? 'text-green-700 bg-green-100 rounded px-0.5' : 'text-gray-700'}>{t.text}</span>
        })}
    </>
  )
}

function ChangeCard({ change, updating, onAccept, onReject, onReset }) {
  const isPending = change.status === 'pending'
  const isAccepted = change.status === 'accepted'
  const isRejected = change.status === 'rejected'

  const borderColor = isAccepted ? 'border-green-300' : isRejected ? 'border-red-300' : 'border-amber-300'
  const bgColor = isAccepted ? 'bg-green-50' : isRejected ? 'bg-red-50' : 'bg-amber-50'

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      {/* Status badge */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-inherit">
        <span className={`text-xs font-medium ${
          isAccepted ? 'text-green-700' : isRejected ? 'text-red-700' : 'text-amber-700'
        }`}>
          {isAccepted ? '✓ Accepted' : isRejected ? '✕ Rejected' : '● Pending review'}
        </span>
        <div className="flex gap-1.5">
          {!isAccepted && (
            <ActionBtn label="Accept" onClick={onAccept} loading={updating} className="bg-green-600 hover:bg-green-700 text-white" />
          )}
          {!isRejected && (
            <ActionBtn label="Reject" onClick={onReject} loading={updating} className="bg-red-600 hover:bg-red-700 text-white" />
          )}
          {!isPending && (
            <ActionBtn label="Reset" onClick={onReset} loading={updating} className="bg-gray-200 hover:bg-gray-300 text-gray-700" />
          )}
        </div>
      </div>

      {/* Before / After with inline word-level diff */}
      <div className="grid grid-cols-2 divide-x divide-inherit">
        <div className="p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Original</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {isRejected
              ? <span className="text-gray-700">{change.original_text || <em className="not-italic text-gray-400">— (new paragraph)</em>}</span>
              : <InlineDiff original={change.original_text} proposed={change.proposed_text} side="original" />
            }
          </p>
        </div>
        <div className="p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Proposed</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {isRejected
              ? <span className="text-gray-400 line-through">{change.proposed_text || <em className="not-italic text-gray-400">— (deleted)</em>}</span>
              : <InlineDiff original={change.original_text} proposed={change.proposed_text} side="proposed" />
            }
          </p>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, loading, className }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-xs px-2 py-0.5 rounded font-medium disabled:opacity-50 transition-colors ${className}`}
    >
      {loading ? '…' : label}
    </button>
  )
}
