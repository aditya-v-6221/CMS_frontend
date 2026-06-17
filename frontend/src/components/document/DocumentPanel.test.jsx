import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import DocumentPanel from './DocumentPanel'

vi.mock('./DiffViewer', () => ({
  default: ({ contractId, isAdmin, onStatusChange }) => (
    <div data-testid="diff-viewer">
      DiffViewer-{contractId}-{isAdmin ? 'admin' : 'notadmin'}
    </div>
  )
}))

vi.mock('./FinalPreviewPane', () => ({
  default: ({ contractId, hasReviewedContent }) => (
    <div data-testid="final-preview">
      FinalPreview-{contractId}-{hasReviewedContent ? 'hasReviewed' : 'noReviewed'}
    </div>
  )
}))

vi.mock('./PdfPreviewPane', () => ({
  default: ({ contractId }) => (
    <div data-testid="pdf-preview">PdfPreview-{contractId}</div>
  )
}))

vi.mock('./ReviewerEditorPane', () => ({
  default: ({ contractId, initialContent, onSaved }) => (
    <div data-testid="reviewer-editor">
      ReviewerEditor-{contractId}-{initialContent || 'empty'}
    </div>
  )
}))

vi.mock('./TextPreviewPane', () => ({
  default: ({ contractId }) => (
    <div data-testid="text-preview">TextPreview-{contractId}</div>
  )
}))

describe('DocumentPanel', () => {
  const defaultProps = {
    contractId: 123,
    fileType: 'text',
    isDrafter: false,
    isReviewer: false,
    isAdmin: false,
    reviewedContent: null,
    contractMeta: null,
    onSaved: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('panel header', () => {
    it('should show "Review Editor" label for reviewer', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} />)
      expect(screen.getByText('Review Editor')).toBeTruthy()
    })

    it('should show "Document Preview" label for non-reviewer', () => {
      render(<DocumentPanel {...defaultProps} />)
      expect(screen.getByText('Document Preview')).toBeTruthy()
    })

    it('should show "Document Preview" label for admin', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} />)
      expect(screen.getByText('Document Preview')).toBeTruthy()
    })

    it('should show "Document Preview" label for drafter', () => {
      render(<DocumentPanel {...defaultProps} isDrafter={true} />)
      expect(screen.getByText('Document Preview')).toBeTruthy()
    })

    it('should show reviewed version badge for admin with reviewed content', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="reviewed text" />)
      expect(screen.getByText('Reviewed version available')).toBeTruthy()
    })

    it('should not show reviewed version badge for admin without reviewed content', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent={null} />)
      expect(screen.queryByText('Reviewed version available')).toBeNull()
    })

    it('should not show reviewed version badge for non-admin', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} reviewedContent="content" />)
      expect(screen.queryByText('Reviewed version available')).toBeNull()
    })
  })

  describe('expand/collapse functionality', () => {
    it('should render expanded by default', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} />)
      expect(screen.getByTestId('reviewer-editor')).toBeTruthy()
    })

    it('should show Collapse text when expanded', () => {
      render(<DocumentPanel {...defaultProps} />)
      expect(screen.getByText(/Collapse/i)).toBeTruthy()
    })

    it('should collapse panel on header click', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isReviewer={true} />)

      const header = screen.getByText('Review Editor').closest('button')
      await user.click(header)

      expect(screen.queryByTestId('reviewer-editor')).toBeNull()
    })

    it('should show Expand text when collapsed', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} />)

      const header = screen.getByText('Document Preview').closest('button')
      await user.click(header)

      expect(screen.getByText(/Expand/i)).toBeTruthy()
    })

    it('should toggle expand/collapse on multiple clicks', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isReviewer={true} />)

      const header = screen.getByText('Review Editor').closest('button')

      await user.click(header)
      expect(screen.queryByTestId('reviewer-editor')).toBeNull()

      await user.click(header)
      expect(screen.getByTestId('reviewer-editor')).toBeTruthy()

      await user.click(header)
      expect(screen.queryByTestId('reviewer-editor')).toBeNull()
    })
  })

  describe('reviewer view', () => {
    it('should render ReviewerEditorPane for reviewer', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} reviewedContent="initial content" />)
      expect(screen.getByTestId('reviewer-editor')).toBeTruthy()
      expect(screen.getByText(/ReviewerEditor-123-initial content/)).toBeTruthy()
    })

    it('should show instruction banner for reviewer', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} />)
      expect(screen.getByText(/Edit the contract text below/i)).toBeTruthy()
      expect(screen.getByText(/Save changes/i)).toBeTruthy()
    })

    it('should pass null as initialContent when reviewedContent is null', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} reviewedContent={null} />)
      expect(screen.getByText(/ReviewerEditor-123-empty/)).toBeTruthy()
    })

    it('should not render admin tabs for reviewer', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} />)
      expect(screen.queryByText('Original')).toBeNull()
      expect(screen.queryByText('Reviewed')).toBeNull()
      expect(screen.queryByText('Final')).toBeNull()
    })
  })

  describe('admin view - tab rendering', () => {
    it('should render Original tab button', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} />)
      expect(screen.getByText('Original')).toBeTruthy()
    })

    it('should render Reviewed tab button', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} />)
      expect(screen.getByText('Reviewed')).toBeTruthy()
    })

    it('should render Final tab button', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} />)
      expect(screen.getByText('Final')).toBeTruthy()
    })

    it('should default to Original tab when no reviewed content', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} fileType="text" />)
      expect(screen.getByTestId('text-preview')).toBeTruthy()
    })

    it('should default to Reviewed tab when reviewed content exists', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="reviewed" />)
      expect(screen.getByTestId('diff-viewer')).toBeTruthy()
    })

    it('should disable Reviewed tab when no reviewed content', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent={null} />)
      const reviewedTab = screen.getByText('Reviewed').closest('button')
      expect(reviewedTab.disabled).toBe(true)
    })

    it('should not disable Reviewed tab when reviewed content exists', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="content" />)
      const reviewedTab = screen.getByText('Reviewed').closest('button')
      expect(reviewedTab.disabled).toBe(false)
    })

    it('should show (none yet) suffix on disabled Reviewed tab', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent={null} />)
      expect(screen.getByText('(none yet)')).toBeTruthy()
    })
  })

  describe('admin view - tab switching', () => {
    it('should switch to Original tab on click', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="content" fileType="text" />)

      await user.click(screen.getByText('Original'))

      expect(screen.getByTestId('text-preview')).toBeTruthy()
      expect(screen.queryByTestId('diff-viewer')).toBeNull()
    })

    it('should switch to Reviewed tab on click when content exists', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="reviewed" />)

      await user.click(screen.getByText('Original'))
      expect(screen.queryByTestId('diff-viewer')).toBeNull()

      await user.click(screen.getByText('Reviewed'))
      expect(screen.getByTestId('diff-viewer')).toBeTruthy()
    })

    it('should switch to Final tab on click', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} />)

      await user.click(screen.getByText('Final'))

      expect(screen.getByTestId('final-preview')).toBeTruthy()
    })

    it('should render PdfPreviewPane for pdf file type on Original tab', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} fileType="pdf" reviewedContent="content" />)

      await user.click(screen.getByText('Original'))

      expect(screen.getByTestId('pdf-preview')).toBeTruthy()
    })

    it('should render TextPreviewPane for text file type on Original tab', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} fileType="text" reviewedContent="content" />)

      await user.click(screen.getByText('Original'))

      expect(screen.getByTestId('text-preview')).toBeTruthy()
    })

    it('should show "No reviewed version saved yet" when Reviewed tab has no content', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="" />)

      await user.click(screen.getByText('Reviewed'))

      expect(screen.getByText('No reviewed version saved yet.')).toBeTruthy()
    })

    it('should render reviewed content text in details element', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="Test reviewed content here" />)

      await user.click(screen.getByText('Reviewed'))

      const details = screen.getByText('Show full reviewed text ▸')
      expect(details).toBeTruthy()
    })
  })

  describe('admin view - Final tab', () => {
    it('should pass hasReviewedContent=false when no reviewed content', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent={null} />)

      await user.click(screen.getByText('Final'))

      expect(screen.getByText(/FinalPreview-123-noReviewed/)).toBeTruthy()
    })

    it('should pass hasReviewedContent=true when reviewed content exists', async () => {
      const user = userEvent.setup()
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="content" />)

      await user.click(screen.getByText('Final'))

      expect(screen.getByText(/FinalPreview-123-hasReviewed/)).toBeTruthy()
    })
  })

  describe('drafter view', () => {
    it('should render TextPreviewPane for drafter without reviewed content', () => {
      render(<DocumentPanel {...defaultProps} isDrafter={true} fileType="text" reviewedContent={null} />)
      expect(screen.getByTestId('text-preview')).toBeTruthy()
    })

    it('should render PdfPreviewPane for drafter with pdf file type', () => {
      render(<DocumentPanel {...defaultProps} isDrafter={true} fileType="pdf" reviewedContent={null} />)
      expect(screen.getByTestId('pdf-preview')).toBeTruthy()
    })

    it('should render substituted text when reviewed content exists', () => {
      const meta = {
        counterparty_name: 'Acme Corp',
        effective_date: '2024-01-01',
        title: 'NDA Agreement'
      }
      const reviewedContent = 'Contract with {{counterparty_name}} effective {{effective_date}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={reviewedContent} contractMeta={meta} />)

      expect(screen.getByText(/Contract with Acme Corp effective 2024-01-01/)).toBeTruthy()
    })

    it('should not render admin tabs for drafter', () => {
      render(<DocumentPanel {...defaultProps} isDrafter={true} />)
      expect(screen.queryByText('Original')).toBeNull()
      expect(screen.queryByText('Reviewed')).toBeNull()
      expect(screen.queryByText('Final')).toBeNull()
    })

    it('should not render reviewer editor for drafter', () => {
      render(<DocumentPanel {...defaultProps} isDrafter={true} />)
      expect(screen.queryByTestId('reviewer-editor')).toBeNull()
    })
  })

  describe('substituteFields function', () => {
    it('should replace {{counterparty_name}} placeholder', () => {
      const meta = { counterparty_name: 'Test Company' }
      const content = 'Agreement with {{counterparty_name}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Agreement with Test Company/)).toBeTruthy()
    })

    it('should replace {{effective_date}} placeholder', () => {
      const meta = { effective_date: '2024-06-17' }
      const content = 'Effective: {{effective_date}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Effective: 2024-06-17/)).toBeTruthy()
    })

    it('should replace {{expiry_date}} placeholder', () => {
      const meta = { expiry_date: '2025-12-31' }
      const content = 'Expires: {{expiry_date}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Expires: 2025-12-31/)).toBeTruthy()
    })

    it('should replace {{governing_law}} placeholder', () => {
      const meta = { governing_law: 'California' }
      const content = 'Governed by {{governing_law}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Governed by California/)).toBeTruthy()
    })

    it('should replace {{jurisdiction}} placeholder', () => {
      const meta = { jurisdiction: 'US' }
      const content = 'Jurisdiction: {{jurisdiction}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Jurisdiction: US/)).toBeTruthy()
    })

    it('should replace {{contract_type}} placeholder', () => {
      const meta = { contract_type: 'NDA' }
      const content = 'Type: {{contract_type}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Type: NDA/)).toBeTruthy()
    })

    it('should replace {{department}} placeholder', () => {
      const meta = { department: 'Legal' }
      const content = 'Department: {{department}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Department: Legal/)).toBeTruthy()
    })

    it('should replace {{title}} placeholder', () => {
      const meta = { title: 'Service Agreement' }
      const content = 'Title: {{title}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Title: Service Agreement/)).toBeTruthy()
    })

    it('should replace multiple placeholders in one string', () => {
      const meta = {
        counterparty_name: 'ABC Inc',
        effective_date: '2024-01-15',
        jurisdiction: 'EU'
      }
      const content = '{{counterparty_name}} - {{effective_date}} - {{jurisdiction}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/ABC Inc - 2024-01-15 - EU/)).toBeTruthy()
    })

    it('should replace with empty string when meta field is missing', () => {
      const meta = { counterparty_name: 'Test' }
      const content = 'Name: {{counterparty_name}}, Date: {{effective_date}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Name: Test, Date:/)).toBeTruthy()
    })

    it('should handle null contractMeta', () => {
      const content = 'Test {{counterparty_name}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={null} />)

      expect(screen.getByText(/Test {{counterparty_name}}/)).toBeTruthy()
    })

    it('should handle empty contractMeta object', () => {
      const content = 'Test {{counterparty_name}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={{}} />)

      expect(screen.getByText(/Test/)).toBeTruthy()
    })

    it('should not replace invalid placeholders', () => {
      const meta = { counterparty_name: 'Test' }
      const content = 'Name: {{invalid_field}}'

      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent={content} contractMeta={meta} />)

      expect(screen.getByText(/Name: {{invalid_field}}/)).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('should handle empty reviewedContent string', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} reviewedContent="" />)

      const reviewedTab = screen.getByText('Reviewed').closest('button')
      expect(reviewedTab.disabled).toBe(true)
    })

    it('should handle null contractMeta for drafter', () => {
      render(<DocumentPanel {...defaultProps} isDrafter={true} reviewedContent="test" contractMeta={null} />)

      expect(screen.getByText(/test/)).toBeTruthy()
    })

    it('should handle undefined onSaved callback', () => {
      const props = { ...defaultProps, onSaved: undefined }

      render(<DocumentPanel {...props} isReviewer={true} />)

      expect(screen.getByTestId('reviewer-editor')).toBeTruthy()
    })

    it('should handle contractId as string', () => {
      render(<DocumentPanel {...defaultProps} contractId="abc-123" fileType="text" />)

      expect(screen.getByTestId('text-preview')).toBeTruthy()
    })

    it('should handle fileType other than pdf or text', () => {
      render(<DocumentPanel {...defaultProps} fileType="unknown" />)

      expect(screen.getByTestId('text-preview')).toBeTruthy()
    })
  })

  describe('role priority', () => {
    it('should show reviewer view when both isReviewer and isAdmin are true', () => {
      render(<DocumentPanel {...defaultProps} isReviewer={true} isAdmin={true} />)

      expect(screen.getByTestId('reviewer-editor')).toBeTruthy()
      expect(screen.queryByText('Original')).toBeNull()
    })

    it('should show admin tabs when isAdmin=true but isReviewer=false', () => {
      render(<DocumentPanel {...defaultProps} isAdmin={true} isReviewer={false} />)

      expect(screen.getByText('Original')).toBeTruthy()
      expect(screen.queryByTestId('reviewer-editor')).toBeNull()
    })
  })
})
