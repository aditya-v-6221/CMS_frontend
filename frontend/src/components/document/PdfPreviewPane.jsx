import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function PdfPreviewPane({ contractId }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let url
    api.get(`/contracts/${contractId}/download`, { responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/pdf' })
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
      })
      .catch(() => setError('Could not load document preview.'))
      .finally(() => setLoading(false))

    return () => { if (url) URL.revokeObjectURL(url) }
  }, [contractId])

  if (loading) return (
    <div className="h-[600px] flex items-center justify-center text-gray-400">
      Loading preview…
    </div>
  )
  if (error) return (
    <div className="h-[600px] flex items-center justify-center text-red-500">{error}</div>
  )

  return (
    <embed
      src={blobUrl}
      type="application/pdf"
      className="w-full h-[600px] rounded-lg border border-gray-200"
    />
  )
}
