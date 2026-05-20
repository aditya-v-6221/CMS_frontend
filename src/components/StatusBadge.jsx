const COLORS = {
  draft:             'bg-gray-100 text-gray-700',
  review:            'bg-yellow-100 text-yellow-800',
  approval:          'bg-blue-100 text-blue-800',
  pending_signature: 'bg-purple-100 text-purple-800',
  executed:          'bg-green-100 text-green-800',
  expired:           'bg-red-100 text-red-700',
  terminated:        'bg-red-200 text-red-900',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}
