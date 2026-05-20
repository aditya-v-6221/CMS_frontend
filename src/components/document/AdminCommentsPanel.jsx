import api from '../../api/client'

export default function AdminCommentsPanel({ contractId, comments, onResolved }) {
  async function resolve(commentId) {
    try {
      await api.patch(`/contracts/${contractId}/comments/${commentId}`)
      if (onResolved) onResolved()
    } catch {
      // parent will reload on next action
    }
  }

  if (comments.length === 0) return (
    <p className="text-sm text-gray-400">No comments yet</p>
  )

  return (
    <div className="space-y-3">
      {comments.map(c => (
        <div
          key={c.id}
          className={`p-3 rounded-lg border text-sm ${
            c.is_resolved
              ? 'bg-gray-50 border-gray-100 text-gray-400'
              : 'bg-indigo-50 border-indigo-100 text-gray-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">
                  {c.user_name || `User #${c.user_id}`}
                </span>
                {c.comment_type && c.comment_type !== 'general' && (
                  <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                    {c.comment_type.replace('_', ' ')}
                  </span>
                )}
                {c.is_resolved && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">
                    resolved
                  </span>
                )}
              </div>
              <p className={`mt-1 break-words ${c.is_resolved ? 'line-through' : ''}`}>
                {c.content}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
            {!c.is_resolved && (
              <button
                onClick={() => resolve(c.id)}
                className="flex-shrink-0 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
              >
                Resolve
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
