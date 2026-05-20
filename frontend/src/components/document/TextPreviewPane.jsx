import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function TextPreviewPane({ contractId }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/contracts/${contractId}/preview`)
      .then(res => setText(res.data.text))
      .catch(err => {
        const detail = err.response?.data?.detail || ''
        if (err.response?.status === 404 && detail === 'File not found on server') {
          setError('Document file is missing from the server. Please delete this contract and re-upload the file.')
        } else if (err.response?.status === 500) {
          setError('Text extraction failed — the file may be corrupt or an unsupported format.')
        } else {
          setError('Could not load preview. Try restarting the backend server if this persists.')
        }
      })
      .finally(() => setLoading(false))
  }, [contractId])

  if (loading) return (
    <div className="h-[600px] flex items-center justify-center text-gray-400">
      Extracting text…
    </div>
  )
  if (error) return (
    <div className="p-4 text-red-500">{error}</div>
  )

  return (
    <pre className="w-full h-[600px] overflow-auto bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 font-mono whitespace-pre-wrap">
      {text || 'No text content found.'}
    </pre>
  )
}
