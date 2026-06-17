import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiffViewer from './DiffViewer'
import api from '../../api/client'

vi.mock('../../api/client')

describe('DiffViewer', () => {
  const mockChanges = [
    {
      id: 1,
      status: 'pending',
      original_text: 'Original paragraph text',
      proposed_text: 'Modified paragraph text',
    },
    {
      id: 2,
      status: 'accepted',
      original_text: 'Another original text',
      proposed_text: 'Another modified text',
    },
    {
      id: 3,
      status: 'rejected',
      original_text: 'Rejected original',
      proposed_text: 'Rejected proposed',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      render(<DiffViewer contractId={1} />)

      expect(screen.getByText('Loading changes…')).toBeInTheDocument()
    })

    it('should fetch changes on mount', async () => {
      api.get.mockResolvedValue({ data: [] })
      render(<DiffViewer contractId={123} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/changes')
      })
    })

    it('should refetch changes when contractId changes', async () => {
      api.get.mockResolvedValue({ data: [] })
      const { rerender } = render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/changes')
      })

      rerender(<DiffViewer contractId={2} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/2/changes')
      })
    })
  })

  describe('error state', () => {
    it('should show error message when API call fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'))
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load reviewer changes.')).toBeInTheDocument()
      })
    })

    it('should handle API errors without crashing', async () => {
      api.get.mockRejectedValue({ response: { status: 500 } })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load reviewer changes.')).toBeInTheDocument()
      })
    })
  })

  describe('empty state', () => {
    it('should show success message when no changes detected', async () => {
      api.get.mockResolvedValue({ data: [] })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(/No paragraph-level changes detected/)).toBeInTheDocument()
      })
    })

    it('should show checkmark icon in empty state', async () => {
      api.get.mockResolvedValue({ data: [] })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        const svg = document.querySelector('svg')
        expect(svg).toBeInTheDocument()
      })
    })
  })

  describe('changes display', () => {
    it('should render all changes', async () => {
      api.get.mockResolvedValue({ data: mockChanges })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('3 changes tracked')).toBeInTheDocument()
      })
    })

    it('should show summary counts', async () => {
      api.get.mockResolvedValue({ data: mockChanges })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('1 pending review')).toBeInTheDocument()
        expect(screen.getByText('1 accepted')).toBeInTheDocument()
        expect(screen.getByText('1 rejected')).toBeInTheDocument()
      })
    })

    it('should use singular form when count is 1', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should display original and proposed text', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Original')).toBeInTheDocument()
        expect(screen.getByText('Proposed')).toBeInTheDocument()
      })
    })

    it('should show status badges for each change', async () => {
      api.get.mockResolvedValue({ data: mockChanges })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('● Pending review')).toBeInTheDocument()
        expect(screen.getByText('✓ Accepted')).toBeInTheDocument()
        expect(screen.getByText('✕ Rejected')).toBeInTheDocument()
      })
    })
  })

  describe('status change actions', () => {
    it('should accept a change when Accept button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      api.patch.mockResolvedValue({})

      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/1/changes/1', { status: 'accepted' })
      })
    })

    it('should reject a change when Reject button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      api.patch.mockResolvedValue({})

      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Reject'))

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/1/changes/1', { status: 'rejected' })
      })
    })

    it('should reset a change when Reset button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChanges[1]] })
      api.patch.mockResolvedValue({})

      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Reset'))

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/1/changes/2', { status: 'pending' })
      })
    })

    it('should show loading state on button during update', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      api.patch.mockImplementation(() => new Promise(() => {}))

      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      await waitFor(() => {
        expect(screen.getByText('…')).toBeInTheDocument()
      })
    })

    it('should call onStatusChange callback after status update', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn()
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      api.patch.mockResolvedValue({})

      render(<DiffViewer contractId={1} onStatusChange={onStatusChange} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalled()
      })
    })

    it('should not call onStatusChange if not provided', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      api.patch.mockResolvedValue({})

      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      // Should not crash without onStatusChange callback
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })

    it('should silently handle status change errors', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      api.patch.mockRejectedValue(new Error('Update failed'))

      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      // Should not show error, just silently fail
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })
  })

  describe('admin merge functionality', () => {
    it('should show merge button for admin', async () => {
      api.get.mockResolvedValue({ data: mockChanges })
      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })
    })

    it('should not show merge button for non-admin', async () => {
      api.get.mockResolvedValue({ data: mockChanges })
      render(<DiffViewer contractId={1} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.queryByText(/Merge/)).not.toBeInTheDocument()
      })
    })

    it('should use plural form for multiple accepted changes', async () => {
      const multiAccepted = [
        { ...mockChanges[1], id: 2 },
        { ...mockChanges[1], id: 3 },
      ]
      api.get.mockResolvedValue({ data: multiAccepted })
      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 2 accepted changes')).toBeInTheDocument()
      })
    })

    it('should disable merge button when no accepted changes', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        const mergeBtn = screen.getByText('Merge 0 accepted changes')
        expect(mergeBtn).toBeDisabled()
      })
    })

    it('should call merge endpoint when merge button clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: mockChanges })
      api.post.mockResolvedValue({})

      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Merge 1 accepted change'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/1/review-approve')
      })
    })

    it('should show success message after merge', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: mockChanges })
      api.post.mockResolvedValue({})

      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Merge 1 accepted change'))

      await waitFor(() => {
        expect(screen.getByText('Changes merged into new version')).toBeInTheDocument()
      })
    })

    it('should hide merge button after successful merge', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: mockChanges })
      api.post.mockResolvedValue({})

      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Merge 1 accepted change'))

      await waitFor(() => {
        expect(screen.queryByText(/Merge/)).not.toBeInTheDocument()
      })
    })

    it('should show error message when merge fails', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: mockChanges })
      api.post.mockRejectedValue({
        response: { data: { detail: 'Merge conflict detected' } },
      })

      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Merge 1 accepted change'))

      await waitFor(() => {
        expect(screen.getByText('Merge conflict detected')).toBeInTheDocument()
      })
    })

    it('should show generic error when merge fails without detail', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: mockChanges })
      api.post.mockRejectedValue(new Error('Network error'))

      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Merge 1 accepted change'))

      await waitFor(() => {
        expect(screen.getByText('Failed to merge changes.')).toBeInTheDocument()
      })
    })

    it('should show merging state during merge', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: mockChanges })
      api.post.mockImplementation(() => new Promise(() => {}))

      render(<DiffViewer contractId={1} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Merge 1 accepted change'))

      await waitFor(() => {
        expect(screen.getByText('Merging…')).toBeInTheDocument()
      })
    })

    it('should call onStatusChange after successful merge', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn()
      api.get.mockResolvedValue({ data: mockChanges })
      api.post.mockResolvedValue({})

      render(<DiffViewer contractId={1} isAdmin={true} onStatusChange={onStatusChange} />)

      await waitFor(() => {
        expect(screen.getByText('Merge 1 accepted change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Merge 1 accepted change'))

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalled()
      })
    })
  })

  describe('change card rendering', () => {
    it('should apply correct styling for pending changes', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[0]] })
      const { container } = render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        const card = container.querySelector('.border-amber-300')
        expect(card).toBeInTheDocument()
      })
    })

    it('should apply correct styling for accepted changes', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[1]] })
      const { container } = render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        const card = container.querySelector('.border-green-300')
        expect(card).toBeInTheDocument()
      })
    })

    it('should apply correct styling for rejected changes', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[2]] })
      const { container } = render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        const card = container.querySelector('.border-red-300')
        expect(card).toBeInTheDocument()
      })
    })

    it('should not show Accept button for accepted changes', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[1]] })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        const acceptButtons = screen.queryAllByText('Accept')
        expect(acceptButtons).toHaveLength(0)
      })
    })

    it('should not show Reject button for rejected changes', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[2]] })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        const rejectButtons = screen.queryAllByText('Reject')
        expect(rejectButtons).toHaveLength(0)
      })
    })

    it('should show Reset button for non-pending changes', async () => {
      api.get.mockResolvedValue({ data: [mockChanges[1], mockChanges[2]] })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        const resetButtons = screen.getAllByText('Reset')
        expect(resetButtons).toHaveLength(2)
      })
    })
  })

  describe('edge cases with change text', () => {
    it('should handle new paragraphs with no original text', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            status: 'pending',
            original_text: null,
            proposed_text: 'New paragraph',
          },
        ],
      })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('— (new paragraph)')).toBeInTheDocument()
      })
    })

    it('should handle deleted paragraphs with no proposed text', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            status: 'pending',
            original_text: 'Deleted paragraph',
            proposed_text: null,
          },
        ],
      })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('— (deleted)')).toBeInTheDocument()
      })
    })

    it('should handle empty strings', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            status: 'pending',
            original_text: '',
            proposed_text: '',
          },
        ],
      })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('● Pending review')).toBeInTheDocument()
      })
    })

    it('should handle very long text content', async () => {
      const longText = 'word '.repeat(1000)
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            status: 'pending',
            original_text: longText,
            proposed_text: longText + 'additional',
          },
        ],
      })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle special characters in text', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            status: 'pending',
            original_text: 'Text with <html> & "quotes"',
            proposed_text: 'Modified <html> & "quotes"',
          },
        ],
      })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle contractId of 0', async () => {
      api.get.mockResolvedValue({ data: [] })
      render(<DiffViewer contractId={0} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/0/changes')
      })
    })

    it('should handle very large contractId', async () => {
      api.get.mockResolvedValue({ data: [] })
      render(<DiffViewer contractId={999999999} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/999999999/changes')
      })
    })

    it('should handle large number of changes', async () => {
      const manyChanges = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        status: 'pending',
        original_text: `Original ${i}`,
        proposed_text: `Proposed ${i}`,
      }))
      api.get.mockResolvedValue({ data: manyChanges })
      render(<DiffViewer contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('100 changes tracked')).toBeInTheDocument()
      })
    })
  })

  describe('non-admin view', () => {
    it('should show helper text instead of merge button for non-admin', async () => {
      api.get.mockResolvedValue({ data: mockChanges })
      render(<DiffViewer contractId={1} isAdmin={false} />)

      await waitFor(() => {
        expect(
          screen.getByText('Pending and accepted changes go into the Final PDF')
        ).toBeInTheDocument()
      })
    })

    it('should not show any admin-only features for non-admin', async () => {
      api.get.mockResolvedValue({ data: mockChanges })
      render(<DiffViewer contractId={1} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.queryByText(/Merge/)).not.toBeInTheDocument()
        expect(screen.queryByText(/merged into new version/)).not.toBeInTheDocument()
      })
    })
  })
})
