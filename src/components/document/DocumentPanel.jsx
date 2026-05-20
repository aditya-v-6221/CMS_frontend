import { useState } from 'react'
import DiffViewer from './DiffViewer'
import FinalPreviewPane from './FinalPreviewPane'
import PdfPreviewPane from './PdfPreviewPane'
import ReviewerEditorPane from './ReviewerEditorPane'
import TextPreviewPane from './TextPreviewPane'

export default function DocumentPanel({
  contractId,
  fileType,
  isDrafter,
  isReviewer,
  isAdmin,
  reviewedContent,
  contractMeta,
  onSaved,
}) {
  const [expanded, setExpanded] = useState(true)
  // Admins default to 'reviewed' tab when reviewed content exists, else 'original'
  const [adminTab, setAdminTab] = useState(reviewedContent ? 'reviewed' : 'original')

  const panelLabel = isReviewer ? 'Review Editor' : 'Document Preview'
  const hasReviewedVersion = isAdmin && reviewedContent

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-gray-900">{panelLabel}</span>
          {hasReviewedVersion && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              Reviewed version available
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm select-none">
          {expanded ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-5">
          {/* Reviewer: always text editor */}
          {isReviewer && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>
                  Edit the contract text below. Your changes are tracked as a diff for the admin to review.
                  Click <strong>Save changes</strong> when done — you can save multiple times.
                </span>
              </div>
              <ReviewerEditorPane
                contractId={contractId}
                initialContent={reviewedContent}
                onSaved={onSaved}
              />
            </div>
          )}

          {/* Admin: tab switcher — Original | Reviewed | Final */}
          {isAdmin && !isReviewer && (
            <div>
              <div className="flex gap-1 mb-4 border-b border-gray-200">
                <TabBtn
                  label="Original"
                  active={adminTab === 'original'}
                  onClick={() => setAdminTab('original')}
                  color="indigo"
                />
                <TabBtn
                  label="Reviewed"
                  active={adminTab === 'reviewed'}
                  onClick={() => setAdminTab('reviewed')}
                  color="amber"
                  badge={reviewedContent ? 'amber' : null}
                  disabled={!reviewedContent}
                  suffix={!reviewedContent ? '(none yet)' : null}
                />
                <TabBtn
                  label="Final"
                  active={adminTab === 'final'}
                  onClick={() => setAdminTab('final')}
                  color="green"
                  badge="green"
                  tooltip="The exact document that will be sent for signing"
                />
              </div>

              {adminTab === 'original' && (
                fileType === 'pdf'
                  ? <PdfPreviewPane contractId={contractId} />
                  : <TextPreviewPane contractId={contractId} />
              )}

              {adminTab === 'reviewed' && reviewedContent && (
                <div className="space-y-4">
                  <DiffViewer contractId={contractId} isAdmin={isAdmin} onStatusChange={onSaved} />
                  <details className="group">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                      Show full reviewed text ▸
                    </summary>
                    <pre className="mt-2 w-full max-h-[400px] overflow-auto bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-gray-800 font-mono whitespace-pre-wrap">
                      {reviewedContent}
                    </pre>
                  </details>
                </div>
              )}
              {adminTab === 'reviewed' && !reviewedContent && (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                  No reviewed version saved yet.
                </div>
              )}

              {adminTab === 'final' && (
                <FinalPreviewPane
                  contractId={contractId}
                  hasReviewedContent={!!reviewedContent}
                />
              )}
            </div>
          )}

          {/* Drafter (non-admin, non-reviewer): substituted template text if available, else original doc */}
          {!isReviewer && !isAdmin && (
            reviewedContent
              ? <DrafterTextPane content={substituteFields(reviewedContent, contractMeta)} />
              : fileType === 'pdf'
                ? <PdfPreviewPane contractId={contractId} />
                : <TextPreviewPane contractId={contractId} />
          )}
        </div>
      )}
    </div>
  )
}

function substituteFields(text, meta) {
  if (!text || !meta) return text
  return text
    .replace(/\{\{counterparty_name\}\}/g, meta.counterparty_name || '')
    .replace(/\{\{effective_date\}\}/g,    meta.effective_date    || '')
    .replace(/\{\{expiry_date\}\}/g,       meta.expiry_date       || '')
    .replace(/\{\{governing_law\}\}/g,     meta.governing_law     || '')
    .replace(/\{\{jurisdiction\}\}/g,      meta.jurisdiction      || '')
    .replace(/\{\{contract_type\}\}/g,     meta.contract_type     || '')
    .replace(/\{\{department\}\}/g,        meta.department        || '')
    .replace(/\{\{title\}\}/g,             meta.title             || '')
}

function DrafterTextPane({ content }) {
  return (
    <pre className="w-full max-h-[600px] overflow-auto bg-gray-50 border border-gray-200 rounded-lg p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
      {content || 'No document content available.'}
    </pre>
  )
}

function TabBtn({ label, active, onClick, color, badge, disabled, suffix, tooltip }) {
  const colors = {
    indigo: { active: 'border-indigo-600 text-indigo-600', dot: 'bg-indigo-500' },
    amber:  { active: 'border-amber-500 text-amber-700',   dot: 'bg-amber-500' },
    green:  { active: 'border-green-600 text-green-700',   dot: 'bg-green-500' },
  }
  const scheme = colors[color] || colors.indigo
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? scheme.active : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {badge && <span className={`w-2 h-2 rounded-full ${scheme.dot}`} />}
      {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
    </button>
  )
}
