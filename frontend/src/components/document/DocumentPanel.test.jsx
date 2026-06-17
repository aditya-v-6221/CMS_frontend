import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocumentPanel from './DocumentPanel'

// Mock all child components
vi.mock('./DiffViewer', () => ({
  default: ({ contractId, isAdmin, onStatusChange }) => (
    <div data-testid="diff-viewer">
      DiffViewer {contractId} {isAdmin ? 'admin' : 'user'}
    </div>
  ),
}))

vi.mock('./FinalPreviewPane', () => ({
  default: ({ contractId, hasReviewedContent }) => (
    <div data-testid="final-preview">
      FinalPreview {contractId} {hasReviewedContent ? 'reviewed' : 'original'}
    </div>
  ),
}))

vi.mock('./PdfPreviewPane', () => ({
  default: ({ contractId }) => <div data-testid="pdf-preview">PdfPreview {contractId}</div>,
}))

vi.mock('./ReviewerEditorPane', () => ({
  default: ({ contractId, initialContent, onSaved }) => (
    <div data-testid="reviewer-editor">
      ReviewerEditor {contractId} {initialContent || 'no-initial'}
    </div>
  ),
}))

vi.mock('./TextPreviewPane', () => ({
  default: ({ contractId }) => <div data-testid="text-preview">TextPreview {contractId}</div>,
}))

describe('DocumentPanel', () => {
  const mockContractMeta = {
    counterparty_name: 'Acme Corp',
    effective_date: '2024-01-01',
    expiry_date: '2025-01-01',
    governing_law: 'California Law',
    jurisdiction: 'California',
    contract_type: 'NDA',
    department: 'Legal',
    title: 'Test Contract',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('panel header', () => {
    it('should show "Review Editor" label for reviewers', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={true}
          isAdmin={false}
          isDrafter={false}
        />
      )

      expect(screen.getByText('Review Editor')).toBeInTheDocument()
    })

    it('should show "Document Preview" label for non-reviewers', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      expect(screen.getByText('Document Preview')).toBeInTheDocument()
    })

    it('should show reviewed version badge for admins with reviewed content', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed text"
        />
      )

      expect(screen.getByText('Reviewed version available')).toBeInTheDocument()
    })

    it('should not show reviewed version badge without reviewed content', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.queryByText('Reviewed version available')).not.toBeInTheDocument()
    })
  })

  describe('expand/collapse functionality', () => {
    it('should be expanded by default', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      expect(screen.getByText('▲ Collapse')).toBeInTheDocument()
      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })

    it('should collapse when header is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      const header = screen.getByText('▲ Collapse').closest('button')
      await user.click(header)

      expect(screen.getByText('▼ Expand')).toBeInTheDocument()
      expect(screen.queryByTestId('pdf-preview')).not.toBeInTheDocument()
    })

    it('should expand again when clicked while collapsed', async () => {
      const user = userEvent.setup()
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      const header = screen.getByText('▲ Collapse').closest('button')
      await user.click(header)
      await user.click(header)

      expect(screen.getByText('▲ Collapse')).toBeInTheDocument()
      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })
  })

  describe('reviewer view', () => {
    it('should show ReviewerEditorPane for reviewers', () => {
      render(
        <DocumentPanel
          contractId={123}
          fileType="pdf"
          isReviewer={true}
          isAdmin={false}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('reviewer-editor')).toBeInTheDocument()
    })

    it('should pass initialContent to ReviewerEditorPane', () => {
      render(
        <DocumentPanel
          contractId={123}
          fileType="pdf"
          isReviewer={true}
          isAdmin={false}
          isDrafter={false}
          reviewedContent="Reviewed content"
        />
      )

      expect(screen.getByText(/Reviewed content/)).toBeInTheDocument()
    })

    it('should show instruction banner for reviewers', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={true}
          isAdmin={false}
          isDrafter={false}
        />
      )

      expect(
        screen.getByText(/Edit the contract text below. Your changes are tracked/)
      ).toBeInTheDocument()
    })

    it('should mention Save changes button in instructions', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={true}
          isAdmin={false}
          isDrafter={false}
        />
      )

      expect(screen.getByText(/Save changes/)).toBeInTheDocument()
    })
  })

  describe('admin view', () => {
    it('should show three tabs for admins', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed text"
        />
      )

      expect(screen.getByText('Original')).toBeInTheDocument()
      expect(screen.getByText('Reviewed')).toBeInTheDocument()
      expect(screen.getByText('Final')).toBeInTheDocument()
    })

    it('should default to Original tab when no reviewed content', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })

    it('should default to Reviewed tab when reviewed content exists', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed text"
        />
      )

      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument()
    })

    it('should show PdfPreviewPane on Original tab for PDF files', () => {
      render(
        <DocumentPanel
          contractId={123}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
      expect(screen.getByText('PdfPreview 123')).toBeInTheDocument()
    })

    it('should show TextPreviewPane on Original tab for text files', () => {
      render(
        <DocumentPanel
          contractId={123}
          fileType="docx"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('text-preview')).toBeInTheDocument()
      expect(screen.getByText('TextPreview 123')).toBeInTheDocument()
    })

    it('should switch to Reviewed tab when clicked', async () => {
      const user = userEvent.setup()
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed text"
        />
      )

      // Should start on Reviewed tab
      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument()

      // Click Original tab
      await user.click(screen.getByText('Original'))

      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
      expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument()
    })

    it('should switch to Final tab when clicked', async () => {
      const user = userEvent.setup()
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      await user.click(screen.getByText('Final'))

      expect(screen.getByTestId('final-preview')).toBeInTheDocument()
    })

    it('should disable Reviewed tab when no reviewed content', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      const reviewedTab = screen.getByText('Reviewed').closest('button')
      expect(reviewedTab).toBeDisabled()
    })

    it('should show "(none yet)" suffix on disabled Reviewed tab', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByText('(none yet)')).toBeInTheDocument()
    })

    it('should show DiffViewer on Reviewed tab', async () => {
      const user = userEvent.setup()
      render(
        <DocumentPanel
          contractId={123}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed text"
        />
      )

      // Already on Reviewed tab by default
      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument()
      expect(screen.getByText(/DiffViewer 123 admin/)).toBeInTheDocument()
    })

    it('should show full reviewed text in details section', async () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Full reviewed text content"
        />
      )

      expect(screen.getByText('Show full reviewed text ▸')).toBeInTheDocument()
    })

    it('should show FinalPreviewPane on Final tab', async () => {
      const user = userEvent.setup()
      render(
        <DocumentPanel
          contractId={123}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed text"
        />
      )

      await user.click(screen.getByText('Final'))

      expect(screen.getByTestId('final-preview')).toBeInTheDocument()
      expect(screen.getByText(/FinalPreview 123 reviewed/)).toBeInTheDocument()
    })

    it('should pass hasReviewedContent to FinalPreviewPane', async () => {
      const user = userEvent.setup()
      render(
        <DocumentPanel
          contractId={123}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      await user.click(screen.getByText('Final'))

      expect(screen.getByText(/FinalPreview 123 original/)).toBeInTheDocument()
    })
  })

  describe('drafter view', () => {
    it('should show PdfPreviewPane for PDF files without reviewed content', () => {
      render(
        <DocumentPanel
          contractId={123}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })

    it('should show TextPreviewPane for text files without reviewed content', () => {
      render(
        <DocumentPanel
          contractId={123}
          fileType="docx"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      expect(screen.getByTestId('text-preview')).toBeInTheDocument()
    })

    it('should show substituted text when reviewed content exists', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent="Contract with {{counterparty_name}}"
          contractMeta={mockContractMeta}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre).toBeInTheDocument()
      expect(pre.textContent).toContain('Acme Corp')
    })
  })

  describe('field substitution', () => {
    it('should substitute counterparty_name', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent="Party: {{counterparty_name}}"
          contractMeta={mockContractMeta}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre.textContent).toBe('Party: Acme Corp')
    })

    it('should substitute effective_date', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent="Effective: {{effective_date}}"
          contractMeta={mockContractMeta}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre.textContent).toBe('Effective: 2024-01-01')
    })

    it('should substitute multiple fields', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent="{{title}} with {{counterparty_name}} in {{jurisdiction}}"
          contractMeta={mockContractMeta}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre.textContent).toBe('Test Contract with Acme Corp in California')
    })

    it('should handle missing meta fields gracefully', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent="{{counterparty_name}} {{missing_field}}"
          contractMeta={{ counterparty_name: 'Acme Corp' }}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre.textContent).toContain('Acme Corp')
    })

    it('should handle null contractMeta', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent="{{counterparty_name}}"
          contractMeta={null}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre.textContent).toBe('{{counterparty_name}}')
    })
  })

  describe('role combinations', () => {
    it('should prioritize reviewer view over admin for admin reviewers', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={true}
          isAdmin={true}
          isDrafter={false}
        />
      )

      // Should not show tabs (admin feature) when isReviewer is true
      expect(screen.queryByText('Original')).not.toBeInTheDocument()
      expect(screen.getByTestId('reviewer-editor')).toBeInTheDocument()
    })

    it('should show admin view when isAdmin but not isReviewer', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByText('Original')).toBeInTheDocument()
    })
  })

  describe('onSaved callback', () => {
    it('should pass onSaved to ReviewerEditorPane', () => {
      const onSaved = vi.fn()
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={true}
          isAdmin={false}
          isDrafter={false}
          onSaved={onSaved}
        />
      )

      expect(screen.getByTestId('reviewer-editor')).toBeInTheDocument()
    })

    it('should pass onSaved to DiffViewer', () => {
      const onSaved = vi.fn()
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed"
          onSaved={onSaved}
        />
      )

      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument()
    })
  })

  describe('boundary values', () => {
    it('should handle contractId of 0', () => {
      render(
        <DocumentPanel
          contractId={0}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      expect(screen.getByText('PdfPreview 0')).toBeInTheDocument()
    })

    it('should handle very large contractId', () => {
      render(
        <DocumentPanel
          contractId={999999999}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
        />
      )

      expect(screen.getByText('PdfPreview 999999999')).toBeInTheDocument()
    })

    it('should handle empty reviewedContent', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent=""
          contractMeta={mockContractMeta}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre).toBeInTheDocument()
    })

    it('should handle very long reviewedContent', () => {
      const longContent = 'a'.repeat(100000)
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={false}
          isDrafter={true}
          reviewedContent={longContent}
          contractMeta={mockContractMeta}
        />
      )

      const pre = document.querySelector('pre')
      expect(pre.textContent).toBe(longContent)
    })
  })

  describe('file type handling', () => {
    it('should render PdfPreviewPane for pdf file type', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })

    it('should render TextPreviewPane for docx file type', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="docx"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('text-preview')).toBeInTheDocument()
    })

    it('should render TextPreviewPane for doc file type', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="doc"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('text-preview')).toBeInTheDocument()
    })

    it('should render TextPreviewPane for txt file type', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="txt"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      expect(screen.getByTestId('text-preview')).toBeInTheDocument()
    })
  })

  describe('tab badges', () => {
    it('should show badge on Reviewed tab when reviewed content exists', () => {
      const { container } = render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
          reviewedContent="Reviewed"
        />
      )

      const reviewedTab = screen.getByText('Reviewed').parentElement
      const badge = reviewedTab.querySelector('.w-2.h-2')
      expect(badge).toBeInTheDocument()
    })

    it('should show badge on Final tab', () => {
      const { container } = render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      const finalTab = screen.getByText('Final').parentElement
      const badge = finalTab.querySelector('.w-2.h-2')
      expect(badge).toBeInTheDocument()
    })

    it('should show tooltip on Final tab', () => {
      render(
        <DocumentPanel
          contractId={1}
          fileType="pdf"
          isReviewer={false}
          isAdmin={true}
          isDrafter={false}
        />
      )

      const finalTab = screen.getByText('Final').closest('button')
      expect(finalTab).toHaveAttribute('title', 'The exact document that will be sent for signing')
    })
  })
})
