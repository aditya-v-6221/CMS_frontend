import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function ReviewerEditorPane({ contractId, initialContent, onSaved }) {
  const [originalText, setOriginalText] = useState('')
  const [editorText, setEditorText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedChanges, setSavedChanges] = useState(null)

  useEffect(() => {
    api.get(`/contracts/${contractId}/preview`)
      .then(res => {
        const text = res.data.text || ''
        setOriginalText(text)
        setEditorText(initialContent ?? text)
      })
      .catch(() => setSaveError('Could not load contract text.'))
      .finally(() => setLoading(false))
  }, [contractId])

  async function save() {
    setSaving(true)
    setSaveError('')
    setSavedChanges(null)
    try {
      await api.put(`/contracts/${contractId}/reviewed-content`, { reviewed_content: editorText })
      const changesRes = await api.get(`/contracts/${contractId}/changes`)
      setSavedChanges(changesRes.data.length)
      if (onSaved) onSaved()
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="h-[600px] flex items-center justify-center text-gray-400">
      Loading contract text…
    </div>
  )

  const isDirty = editorText !== originalText && editorText !== (initialContent ?? originalText)

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={editorText}
        onChange={e => { setEditorText(e.target.value); setSavedChanges(null) }}
        className="w-full h-[560px] border border-gray-300 rounded-lg p-4 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        placeholder="Contract text will appear here for editing…"
        spellCheck
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {editorText.length} characters
          {isDirty && <span className="ml-2 text-amber-600">● Unsaved changes</span>}
        </span>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-xs text-red-600">{saveError}</span>}
          {savedChanges !== null && (
            <span className="text-xs text-green-700 font-medium">
              {savedChanges === 0
                ? 'Saved — no differences detected'
                : `Saved — ${savedChanges} change${savedChanges !== 1 ? 's' : ''} tracked for admin review`}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
