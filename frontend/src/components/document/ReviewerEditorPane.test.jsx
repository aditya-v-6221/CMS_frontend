import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewerEditorPane from './ReviewerEditorPane'
import api from '../../api/client'

vi.mock('../../api/client')

describe('ReviewerEditorPane', () => {
  const mockContractText = 'This is the original contract text.'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      render(<ReviewerEditorPane contractId={1} />)

      expect(screen.getByText('Loading contract text…')).toBeInTheDocument()
    })

    it('should fetch contract text on mount', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={123} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/preview')
      })
    })

    it('should refetch when contractId changes', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      const { rerender } = render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/preview')
      })

      rerender(<ReviewerEditorPane contractId={2} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/2/preview')
      })
    })
  })

  describe('text editor rendering', () => {
    it('should render textarea with fetched text', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea.value).toBe(mockContractText)
      })
    })

    it('should use initialContent if provided', async () => {
      const initialContent = 'Initial content override'
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} initialContent={initialContent} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea.value).toBe(initialContent)
      })
    })

    it('should use fetched text when initialContent is null', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} initialContent={null} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea.value).toBe(mockContractText)
      })
    })

    it('should render textarea with placeholder', async () => {
      api.get.mockResolvedValue({ data: { text: '' } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/Contract text will appear here/)
        expect(textarea).toBeInTheDocument()
      })
    })

    it('should enable spell check', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveAttribute('spellcheck')
      })
    })
  })

  describe('text editing', () => {
    it('should update text when user types', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'New text')

      expect(textarea.value).toBe('New text')
    })

    it('should show character count', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(`${mockContractText.length} characters`)).toBeInTheDocument()
      })
    })

    it('should update character count when text changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: '' } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello')

      expect(screen.getByText('5 characters')).toBeInTheDocument()
    })

    it('should show unsaved changes indicator when text is dirty', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' Modified')

      await waitFor(() => {
        expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()
      })
    })

    it('should not show unsaved indicator when text matches original', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
      })
    })
  })

  describe('save functionality', () => {
    it('should call API to save changes when save button clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Modified text')

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/contracts/123/reviewed-content', {
          reviewed_content: 'Modified text',
        })
      })
    })

    it('should fetch changes count after save', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] })

      render(<ReviewerEditorPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/changes')
      })
    })

    it('should show success message with change count', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] })

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — 2 changes tracked for admin review')).toBeInTheDocument()
      })
    })

    it('should show message when no changes detected', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — no differences detected')).toBeInTheDocument()
      })
    })

    it('should use singular form for 1 change', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [{ id: 1 }] })

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saved — 1 change tracked for admin review')).toBeInTheDocument()
      })
    })

    it('should show saving state during save', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockImplementation(() => new Promise(() => {}))

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saving…')).toBeInTheDocument()
      })
    })

    it('should disable save button during save', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockImplementation(() => new Promise(() => {}))

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })
    })

    it('should show error message when save fails', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockRejectedValue({
        response: { data: { detail: 'Save failed due to conflict' } },
      })

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed due to conflict')).toBeInTheDocument()
      })
    })

    it('should show generic error when save fails without detail', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockRejectedValue(new Error('Network error'))

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })
    })

    it('should call onSaved callback after successful save', async () => {
      const user = userEvent.setup()
      const onSaved = vi.fn()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={1} onSaved={onSaved} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled()
      })
    })

    it('should not crash if onSaved is not provided', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.put).toHaveBeenCalled()
      })
    })

    it('should clear success message when user starts typing again', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      api.put.mockResolvedValue({})
      api.get.mockResolvedValueOnce({ data: { text: mockContractText } })
      api.get.mockResolvedValueOnce({ data: [] })

      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Saved/)).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' more text')

      expect(screen.queryByText(/Saved/)).not.toBeInTheDocument()
    })
  })

  describe('load error handling', () => {
    it('should show error when preview load fails', async () => {
      api.get.mockRejectedValue(new Error('Load failed'))
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load contract text.')).toBeInTheDocument()
      })
    })

    it('should not render textarea when load fails', async () => {
      api.get.mockRejectedValue(new Error('Load failed'))
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle empty text', async () => {
      api.get.mockResolvedValue({ data: { text: '' } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea.value).toBe('')
      })
    })

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(100000)
      api.get.mockResolvedValue({ data: { text: longText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea.value).toBe(longText)
      })
    })

    it('should handle null text', async () => {
      api.get.mockResolvedValue({ data: { text: null } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea.value).toBe('')
      })
    })

    it('should handle contractId of 0', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={0} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/0/preview')
      })
    })

    it('should handle very large contractId', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={999999999} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/999999999/preview')
      })
    })
  })

  describe('dirty state detection', () => {
    it('should not be dirty when text matches original', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
      })
    })

    it('should not be dirty when text matches initialContent', async () => {
      const initialContent = 'Initial content'
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} initialContent={initialContent} />)

      await waitFor(() => {
        expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
      })
    })

    it('should be dirty when text differs from both original and initialContent', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} initialContent="Initial" />)

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Different text')

      await waitFor(() => {
        expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()
      })
    })
  })

  describe('textarea styling', () => {
    it('should apply monospace font', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveClass('font-mono')
      })
    })

    it('should have fixed height', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveClass('h-[560px]')
      })
    })

    it('should disable resize', async () => {
      api.get.mockResolvedValue({ data: { text: mockContractText } })
      render(<ReviewerEditorPane contractId={1} />)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveClass('resize-none')
      })
    })
  })
})
