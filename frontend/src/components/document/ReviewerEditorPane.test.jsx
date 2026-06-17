import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewerEditorPane from './ReviewerEditorPane'
import api from '../../api/client'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  }
}))

describe('ReviewerEditorPane', () => {
  const mockContractId = 'contract-123'
  const mockContractText = 'This is the original contract text.'
  const mockInitialContent = 'This is initial content provided by parent.'
  const mockOnSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial loading state', () => {
    it('should display loading message while fetching contract', () => {
      api.get.mockReturnValue(new Promise(() => {})) // Never resolves

      render(<ReviewerEditorPane contractId={mockContractId} />)

      expect(screen.getByText('Loading contract text…')).toBeInTheDocument()
      const loadingContainer = screen.getByText('Loading contract text…').parentElement
      expect(loadingContainer).toHaveClass('h-[600px]', 'flex', 'items-center', 'justify-center', 'text-gray-400')
    })

    it('should call API with correct contractId on mount', () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      expect(api.get).toHaveBeenCalledWith(`/contracts/${mockContractId}/preview`)
      expect(api.get).toHaveBeenCalledTimes(1)
    })

    it('should handle different contractId values', async () => {
      const differentId = 'different-contract-456'
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={differentId} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/contracts/${differentId}/preview`)
      })
    })

    it('should handle numeric contractId', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={123} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/preview')
      })
    })
  })

  describe('successful data loading', () => {
    it('should render textarea with contract text after loading', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading contract text…')).not.toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue(mockContractText)
    })

    it('should use initialContent when provided instead of fetched text', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          initialContent={mockInitialContent}
        />
      )

      await waitFor(() => {
        expect(screen.queryByText('Loading contract text…')).not.toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue(mockInitialContent)
    })

    it('should handle empty text response', async () => {
      api.get.mockResolvedValue({ data: { text: '' } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue('')
      })
    })

    it('should handle missing text field in response', async () => {
      api.get.mockResolvedValue({ data: {} })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue('')
      })
    })

    it('should handle null text in response', async () => {
      api.get.mockResolvedValue({ data: { text: null } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue('')
      })
    })

    it('should handle undefined text in response', async () => {
      api.get.mockResolvedValue({ data: { text: undefined } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue('')
      })
    })

    it('should display character count', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByText(`${mockContractText.length} characters`)).toBeInTheDocument()
      })
    })

    it('should display save button after loading', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /save changes/i })
        expect(button).toBeInTheDocument()
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('loading error handling', () => {
    it('should display error message when loading fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load contract text.')).toBeInTheDocument()
      })
    })

    it('should still render editor on loading error', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
    })

    it('should handle API 404 error', async () => {
      api.get.mockRejectedValue({ response: { status: 404 } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load contract text.')).toBeInTheDocument()
      })
    })

    it('should handle API 500 error', async () => {
      api.get.mockRejectedValue({ response: { status: 500 } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load contract text.')).toBeInTheDocument()
      })
    })

    it('should handle network timeout', async () => {
      api.get.mockRejectedValue({ code: 'ECONNABORTED' })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load contract text.')).toBeInTheDocument()
      })
    })
  })

  describe('textarea interaction', () => {
    beforeEach(async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
    })

    it('should allow user to type in textarea', async () => {
      const user = userEvent.setup()
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'New text content')

      expect(textarea).toHaveValue('New text content')
    })

    it('should update character count when text changes', async () => {
      const user = userEvent.setup()
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Test')

      expect(screen.getByText('4 characters')).toBeInTheDocument()
    })

    it('should show zero characters for empty textarea', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: '' } })
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByText('0 characters')).toBeInTheDocument()
      })
    })

    it('should handle large text input', async () => {
      const user = userEvent.setup()
      const largeText = 'a'.repeat(10000)
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, largeText)

      expect(screen.getByText('10000 characters')).toBeInTheDocument()
    })

    it('should have correct textarea attributes', async () => {
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveAttribute('placeholder', 'Contract text will appear here for editing…')
        expect(textarea).toHaveAttribute('spellCheck', 'true')
      })
    })

    it('should have correct textarea styling classes', async () => {
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveClass(
          'w-full',
          'h-[560px]',
          'border',
          'border-gray-300',
          'rounded-lg',
          'p-4',
          'text-sm',
          'font-mono',
          'text-gray-800',
          'resize-none'
        )
      })
    })
  })

  describe('dirty state tracking', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
    })

    it('should show unsaved changes indicator when text is modified', async () => {
      const user = userEvent.setup()
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' Modified')

      expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()
    })

    it('should not show unsaved changes when text matches original', async () => {
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
    })

    it('should not show unsaved changes when text matches initialContent', async () => {
      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          initialContent={mockInitialContent}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
    })

    it('should hide unsaved changes indicator after text reverted', async () => {
      const user = userEvent.setup()
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' Modified')
      expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()

      await user.clear(textarea)
      await user.type(textarea, mockContractText)
      expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
    })

    it('should show unsaved changes with correct styling', async () => {
      const user = userEvent.setup()
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' Modified')

      const unsavedIndicator = screen.getByText('● Unsaved changes')
      expect(unsavedIndicator).toHaveClass('ml-2', 'text-amber-600')
    })
  })

  describe('save functionality', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
    })

    it('should call API to save changes when save button is clicked', async () => {
      const user = userEvent.setup()
      const newText = 'Updated contract text'
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, newText)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          `/contracts/${mockContractId}/reviewed-content`,
          { reviewed_content: newText }
        )
      })
    })

    it('should fetch changes after successful save', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/contracts/${mockContractId}/changes`)
      })
    })

    it('should display success message with change count', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — 3 changes tracked for admin review')).toBeInTheDocument()
      })
    })

    it('should display singular form for one change', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [{ id: 1 }] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — 1 change tracked for admin review')).toBeInTheDocument()
      })
    })

    it('should display no differences message when changes array is empty', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — no differences detected')).toBeInTheDocument()
      })
    })

    it('should disable save button while saving', async () => {
      const user = userEvent.setup()
      let resolveSave
      api.put.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
      })

      resolveSave({})
    })

    it('should show "Saving…" text while saving', async () => {
      const user = userEvent.setup()
      let resolveSave
      api.put.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
      })

      resolveSave({})
    })

    it('should call onSaved callback after successful save', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          onSaved={mockOnSaved}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalledTimes(1)
      })
    })

    it('should not call onSaved callback if not provided', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
      })
      // No error should occur
    })

    it('should handle undefined onSaved prop', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          onSaved={undefined}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
      })
    })

    it('should handle null onSaved prop', async () => {
      const user = userEvent.setup()
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          onSaved={null}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
      })
    })
  })

  describe('save error handling', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
    })

    it('should display error message when save fails', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValue(new Error('Network error'))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })
    })

    it('should display API error detail when available', async () => {
      const user = userEvent.setup()
      const errorDetail = 'Validation error: Invalid content'
      api.put.mockRejectedValue({
        response: {
          data: { detail: errorDetail }
        }
      })
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(errorDetail)).toBeInTheDocument()
      })
    })

    it('should handle 403 forbidden error', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValue({
        response: {
          status: 403,
          data: { detail: 'Permission denied' }
        }
      })
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument()
      })
    })

    it('should handle 500 server error', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      })
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument()
      })
    })

    it('should re-enable save button after error', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValue(new Error('Network error'))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })

      const enabledButton = screen.getByRole('button', { name: /save changes/i })
      expect(enabledButton).not.toBeDisabled()
    })

    it('should clear previous error on new save attempt', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })

      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByText('Save failed')).not.toBeInTheDocument()
      })
    })

    it('should not call onSaved when save fails', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValue(new Error('Network error'))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          onSaved={mockOnSaved}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })

      expect(mockOnSaved).not.toHaveBeenCalled()
    })

    it('should handle error without response object', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValue(new Error('Network timeout'))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })
    })
  })

  describe('saved changes message clearing', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
    })

    it('should clear saved changes message when user types', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [{ id: 1 }] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' new text')

      expect(screen.queryByText(/saved/i)).not.toBeInTheDocument()
    })

    it('should clear saved changes message on new save attempt', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [{ id: 1 }] })
        .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — 1 change tracked for admin review')).toBeInTheDocument()
      })

      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — 2 changes tracked for admin review')).toBeInTheDocument()
      })
      expect(screen.queryByText('Saved — 1 change tracked for admin review')).not.toBeInTheDocument()
    })
  })

  describe('prop variations', () => {
    it('should handle null contractId', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={null} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/null/preview')
      })
    })

    it('should handle undefined contractId', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={undefined} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/undefined/preview')
      })
    })

    it('should handle empty string contractId', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId="" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts//preview')
      })
    })

    it('should handle null initialContent', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          initialContent={null}
        />
      )

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue(mockContractText)
      })
    })

    it('should handle undefined initialContent', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          initialContent={undefined}
        />
      )

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue(mockContractText)
      })
    })

    it('should handle empty string initialContent', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          initialContent=""
        />
      )

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue('')
      })
    })

    it('should handle very long initialContent', async () => {
      const longContent = 'x'.repeat(100000)
      api.get.mockResolvedValue({ data: { text: mockContractText } })

      render(
        <ReviewerEditorPane
          contractId={mockContractId}
          initialContent={longContent}
        />
      )

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue(longContent)
        expect(screen.getByText('100000 characters')).toBeInTheDocument()
      })
    })
  })

  describe('edge cases and boundary values', () => {
    it('should handle special characters in contract text', async () => {
      const specialText = 'Contract with <special> & "characters" and \'quotes\''
      api.get.mockResolvedValue({ data: { text: specialText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue(specialText)
      })
    })

    it('should handle newlines in contract text', async () => {
      const textWithNewlines = 'Line 1\nLine 2\nLine 3'
      api.get.mockResolvedValue({ data: { text: textWithNewlines } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue(textWithNewlines)
      })
    })

    it('should handle unicode characters', async () => {
      const unicodeText = 'Contract with emoji 🎉 and unicode ñ á é'
      api.get.mockResolvedValue({ data: { text: unicodeText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue(unicodeText)
      })
    })

    it('should handle zero changes from API', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })
      api.put.mockResolvedValue({})

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — no differences detected')).toBeInTheDocument()
      })
    })

    it('should handle large number of changes', async () => {
      const user = userEvent.setup()
      const manyChanges = Array.from({ length: 999 }, (_, i) => ({ id: i }))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: manyChanges })
      api.put.mockResolvedValue({})

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — 999 changes tracked for admin review')).toBeInTheDocument()
      })
    })

    it('should handle rapid consecutive saves', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })

      // Click multiple times rapidly
      await user.click(saveButton)
      await user.click(saveButton)
      await user.click(saveButton)

      // Should still work and not cause errors
      await waitFor(() => {
        expect(api.put).toHaveBeenCalled()
      })
    })

    it('should handle contractId change during loading', async () => {
      let resolveFirstLoad
      api.get.mockReturnValueOnce(new Promise((resolve) => { resolveFirstLoad = resolve }))
        .mockResolvedValueOnce({ data: { text: 'Second contract text' } })

      const { rerender } = render(<ReviewerEditorPane contractId="contract-1" />)

      // Change contractId before first load completes
      rerender(<ReviewerEditorPane contractId="contract-2" />)

      resolveFirstLoad({ data: { text: 'First contract text' } })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/contract-2/preview')
      })
    })
  })

  describe('success message styling', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
    })

    it('should apply correct styling to success message', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [{ id: 1 }] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        const successMessage = screen.getByText(/saved/i)
        expect(successMessage).toHaveClass('text-xs', 'text-green-700', 'font-medium')
      })
    })

    it('should apply correct styling to error message', async () => {
      const user = userEvent.setup()
      api.put.mockRejectedValue(new Error('Network error'))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        const errorMessage = screen.getByText('Save failed')
        expect(errorMessage).toHaveClass('text-xs', 'text-red-600')
      })
    })
  })

  describe('button styling and states', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
    })

    it('should have correct styling for enabled save button', async () => {
      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).toHaveClass(
          'bg-indigo-600',
          'text-white',
          'text-sm',
          'px-4',
          'py-1.5',
          'rounded-lg'
        )
      })
    })

    it('should have disabled styling when saving', async () => {
      const user = userEvent.setup()
      let resolveSave
      api.put.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        const disabledButton = screen.getByRole('button', { name: /saving/i })
        expect(disabledButton).toHaveClass('disabled:opacity-50')
        expect(disabledButton).toBeDisabled()
      })

      resolveSave({})
    })
  })

  describe('API response variations', () => {
    it('should handle changes response with null data', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: null })
      api.put.mockResolvedValue({})

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Should handle gracefully - will try to read length of null
      await waitFor(() => {
        expect(api.put).toHaveBeenCalled()
      })
    })

    it('should handle changes response with undefined data', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: undefined })
      api.put.mockResolvedValue({})

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.put).toHaveBeenCalled()
      })
    })

    it('should handle changes response with non-array data', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: { not: 'an array' } })
      api.put.mockResolvedValue({})

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.put).toHaveBeenCalled()
      })
    })
  })

  describe('multiple save cycles', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
    })

    it('should handle multiple save operations', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [{ id: 1 }] })
        .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] })
        .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] })

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })

      // First save
      await user.click(saveButton)
      await waitFor(() => {
        expect(screen.getByText('Saved — 1 change tracked for admin review')).toBeInTheDocument()
      })

      // Second save
      await user.click(saveButton)
      await waitFor(() => {
        expect(screen.getByText('Saved — 2 changes tracked for admin review')).toBeInTheDocument()
      })

      // Third save
      await user.click(saveButton)
      await waitFor(() => {
        expect(screen.getByText('Saved — 3 changes tracked for admin review')).toBeInTheDocument()
      })

      expect(api.put).toHaveBeenCalledTimes(3)
    })

    it('should handle save error followed by successful save', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
        .mockResolvedValueOnce({ data: [] })
      api.put.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({})

      render(<ReviewerEditorPane contractId={mockContractId} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /save changes/i })

      // First save fails
      await user.click(saveButton)
      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })

      // Second save succeeds
      await user.click(saveButton)
      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
        expect(screen.queryByText('Save failed')).not.toBeInTheDocument()
      })
    })
  })
})
