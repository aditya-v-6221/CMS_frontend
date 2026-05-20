import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function FinalPreviewPane({ contractId, hasReviewedContent }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let url
    api.get(`/contracts/${contractId}/final-preview`, { responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/pdf' })
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
      })
      .catch(() => setError('Could not generate final document preview.'))
      .finally(() => setLoading(false))

    return () => { if (url) URL.revokeObjectURL(url) }
  }, [contractId])

  if (loading) return (
    <div className="h-[600px] flex flex-col items-center justify-center gap-2 text-gray-400">
      <svg className="animate-spin h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span className="text-sm">Generating final document…</span>
    </div>
  )

  if (error) return (
    <div className="h-[600px] flex items-center justify-center text-red-500 text-sm">{error}</div>
  )

  return (
    <div className="flex flex-col gap-3">
      {hasReviewedContent && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Reviewer changes applied — this is the exact document that will be sent for signing.
        </div>
      )}
      {!hasReviewedContent && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
          No reviewer edits yet — original document will be sent for signing.
        </div>
      )}
      <embed
        src={blobUrl}
        type="application/pdf"
        className="w-full h-[600px] rounded-lg border border-gray-200"
      />
    </div>
  )
}
