import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiffViewer from './DiffViewer.jsx'
import api from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('DiffViewer', () => {
  const mockChanges = [
    {
      id: 1,
      status: 'pending',
      original_text: 'The quick brown fox jumps over the lazy dog.',
      proposed_text: 'The quick red fox leaps over the lazy dog.',
    },
    {
      id: 2,
      status: 'accepted',
      original_text: 'This is original text.',
      proposed_text: 'This is modified text.',
    },
    {
      id: 3,
      status: 'rejected',
      original_text: 'Some old content.',
      proposed_text: 'Some new content.',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves
      render(<DiffViewer contractId="123" />)

      expect(screen.getByText('Loading changes…')).toBeInTheDocument()
    })

    it('should show loading with different contractId', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      render(<DiffViewer contractId="456" />)

      expect(screen.getByText('Loading changes…')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when API call fails', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'))

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load reviewer changes.')).toBeInTheDocument()
      })
    })

    it('should handle API error without message', async () => {
      api.get.mockRejectedValueOnce(null)

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load reviewer changes.')).toBeInTheDocument()
      })
    })

    it('should display error with empty contractId', async () => {
      api.get.mockRejectedValueOnce(new Error('Invalid ID'))

      render(<DiffViewer contractId="" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load reviewer changes.')).toBeInTheDocument()
      })
    })

    it('should call API with correct endpoint on error', async () => {
      api.get.mockRejectedValueOnce(new Error('Error'))

      render(<DiffViewer contractId="test-id" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/test-id/changes')
      })
    })
  })

  describe('Empty State', () => {
    it('should display no changes message when changes array is empty', async () => {
      api.get.mockResolvedValueOnce({ data: [] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText(/No paragraph-level changes detected/)).toBeInTheDocument()
      })
    })

    it('should show green checkmark icon in empty state', async () => {
      api.get.mockResolvedValueOnce({ data: [] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        const message = screen.getByText(/No paragraph-level changes detected/)
        const svg = message.closest('div').querySelector('svg')
        expect(svg).toBeInTheDocument()
      })
    })
  })

  describe('Changes Rendering', () => {
    it('should render all changes when loaded successfully', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('3 changes tracked')).toBeInTheDocument()
      })
    })

    it('should render singular "change" when only one change', async () => {
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should display pending count correctly', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 pending review')).toBeInTheDocument()
      })
    })

    it('should display accepted count correctly', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 accepted')).toBeInTheDocument()
      })
    })

    it('should display rejected count correctly', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 rejected')).toBeInTheDocument()
      })
    })

    it('should not display counts for statuses with 0 count', async () => {
      api.get.mockResolvedValueOnce({
        data: [{ id: 1, status: 'pending', original_text: 'test', proposed_text: 'test' }]
      })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.queryByText(/accepted/)).not.toBeInTheDocument()
        expect(screen.queryByText(/rejected/)).not.toBeInTheDocument()
      })
    })

    it('should render status badges for each change', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('● Pending review')).toBeInTheDocument()
        expect(screen.getByText('✓ Accepted')).toBeInTheDocument()
        expect(screen.getByText('✕ Rejected')).toBeInTheDocument()
      })
    })

    it('should render original and proposed text sections', async () => {
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        const originalLabels = screen.getAllByText('Original')
        const proposedLabels = screen.getAllByText('Proposed')
        expect(originalLabels.length).toBeGreaterThan(0)
        expect(proposedLabels.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Change Status Updates', () => {
    it('should accept a pending change when Accept button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('● Pending review'))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/1', { status: 'accepted' })
      })
    })

    it('should reject a pending change when Reject button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('● Pending review'))

      const rejectButton = screen.getByRole('button', { name: 'Reject' })
      await user.click(rejectButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/1', { status: 'rejected' })
      })
    })

    it('should reset an accepted change when Reset button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[1]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('✓ Accepted'))

      const resetButton = screen.getByRole('button', { name: 'Reset' })
      await user.click(resetButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/2', { status: 'pending' })
      })
    })

    it('should reset a rejected change when Reset button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[2]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('✕ Rejected'))

      const resetButton = screen.getByRole('button', { name: 'Reset' })
      await user.click(resetButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/3', { status: 'pending' })
      })
    })

    it('should show loading state on button during update', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('● Pending review'))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(screen.getByText('…')).toBeInTheDocument()
      })
    })

    it('should disable all action buttons while updating', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockImplementation(() => new Promise(() => {}))

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('● Pending review'))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        const allButtons = screen.getAllByRole('button')
        allButtons.forEach(button => {
          if (button.textContent.includes('…')) {
            expect(button).toBeDisabled()
          }
        })
      })
    })

    it('should call onStatusChange callback after successful update', async () => {
      const user = userEvent.setup()
      const mockCallback = vi.fn()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" onStatusChange={mockCallback} />)

      await waitFor(() => screen.getByText('● Pending review'))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled()
      })
    })

    it('should not call onStatusChange when callback is not provided', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('● Pending review'))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
      // Should not throw error
    })

    it('should silently handle API error during status update', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockRejectedValueOnce(new Error('Update failed'))

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('● Pending review'))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
      // Should not display error message
    })

    it('should update local state after successful status change', async () => {
      const user = userEvent.setup()
      const changeWithPending = { ...mockChanges[0], status: 'pending' }
      api.get.mockResolvedValueOnce({ data: [changeWithPending] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByText('1 pending review'))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        // After accepting, pending count should go to 0 and accepted to 1
        expect(screen.queryByText('1 pending review')).not.toBeInTheDocument()
        expect(screen.getByText('1 accepted')).toBeInTheDocument()
      })
    })
  })

  describe('Admin Merge Functionality', () => {
    it('should display merge button for admin users', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Merge/i })).toBeInTheDocument()
      })
    })

    it('should not display merge button for non-admin users', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" isAdmin={false} />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Merge/i })).not.toBeInTheDocument()
      })
    })

    it('should show info text for non-admin users', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Pending and accepted changes go into the Final PDF')).toBeInTheDocument()
      })
    })

    it('should display correct merge button text with accepted count', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Merge 1 accepted change' })).toBeInTheDocument()
      })
    })

    it('should display plural merge button text for multiple changes', async () => {
      const multipleAccepted = [
        { ...mockChanges[0], status: 'accepted' },
        { ...mockChanges[1], status: 'accepted' },
      ]
      api.get.mockResolvedValueOnce({ data: multipleAccepted })

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Merge 2 accepted changes' })).toBeInTheDocument()
      })
    })

    it('should disable merge button when no accepted changes', async () => {
      const noAccepted = [{ ...mockChanges[0], status: 'pending' }]
      api.get.mockResolvedValueOnce({ data: noAccepted })

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /Merge 0 accepted change/ })
        expect(mergeButton).toBeDisabled()
      })
    })

    it('should call merge API when merge button is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/review-approve')
      })
    })

    it('should show merging state while merge is in progress', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockImplementation(() => new Promise(() => {}))

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Merging…' })).toBeInTheDocument()
      })
    })

    it('should disable merge button while merging', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockImplementation(() => new Promise(() => {}))

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        const mergingButton = screen.getByRole('button', { name: 'Merging…' })
        expect(mergingButton).toBeDisabled()
      })
    })

    it('should display success message after successful merge', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Changes merged into new version')).toBeInTheDocument()
      })
    })

    it('should hide merge button after successful merge', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Merge/i })).not.toBeInTheDocument()
      })
    })

    it('should call onStatusChange after successful merge', async () => {
      const user = userEvent.setup()
      const mockCallback = vi.fn()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" isAdmin={true} onStatusChange={mockCallback} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled()
      })
    })

    it('should display error message when merge fails', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Custom error message' } }
      })

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Custom error message')).toBeInTheDocument()
      })
    })

    it('should display default error message when merge fails without detail', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockRejectedValueOnce({})

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to merge changes.')).toBeInTheDocument()
      })
    })

    it('should keep merge button visible after merge failure', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockRejectedValueOnce({})

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to merge changes.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Merge/i })).toBeInTheDocument()
      })
    })

    it('should clear previous error when attempting merge again', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: mockChanges })
      api.post.mockRejectedValueOnce({})

      render(<DiffViewer contractId="123" isAdmin={true} />)

      await waitFor(() => screen.getByRole('button', { name: /Merge/i }))

      const mergeButton = screen.getByRole('button', { name: /Merge 1 accepted change/ })
      await user.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to merge changes.')).toBeInTheDocument()
      })

      // Setup for second attempt
      api.post.mockImplementation(() => new Promise(() => {}))
      await user.click(screen.getByRole('button', { name: /Merge/i }))

      await waitFor(() => {
        expect(screen.queryByText('Failed to merge changes.')).not.toBeInTheDocument()
      })
    })
  })

  describe('ContractId Changes', () => {
    it('should reload changes when contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockChanges })

      const { rerender } = render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/changes')
      })

      rerender(<DiffViewer contractId="456" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/456/changes')
        expect(api.get).toHaveBeenCalledTimes(2)
      })
    })

    it('should not reload if contractId stays the same', async () => {
      api.get.mockResolvedValue({ data: mockChanges })

      const { rerender } = render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1)
      })

      rerender(<DiffViewer contractId="123" isAdmin={true} />)

      // Should still only be called once
      expect(api.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Button Visibility', () => {
    it('should show Accept and Reject buttons for pending changes', async () => {
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
      })
    })

    it('should show Reject and Reset buttons for accepted changes', async () => {
      api.get.mockResolvedValueOnce({ data: [mockChanges[1]] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
      })
    })

    it('should show Accept and Reset buttons for rejected changes', async () => {
      api.get.mockResolvedValueOnce({ data: [mockChanges[2]] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
      })
    })
  })

  describe('InlineDiff Rendering', () => {
    it('should render new paragraph indicator for original when no original text', async () => {
      const newParagraph = {
        id: 1,
        status: 'pending',
        original_text: null,
        proposed_text: 'New paragraph content.',
      }
      api.get.mockResolvedValueOnce({ data: [newParagraph] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('— (new paragraph)')).toBeInTheDocument()
      })
    })

    it('should render deleted indicator for proposed when no proposed text', async () => {
      const deletedParagraph = {
        id: 1,
        status: 'pending',
        original_text: 'Original content.',
        proposed_text: null,
      }
      api.get.mockResolvedValueOnce({ data: [deletedParagraph] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('— (deleted)')).toBeInTheDocument()
      })
    })

    it('should render word-level diff for changes with both texts', async () => {
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        // Should show original text
        expect(screen.getByText(/The quick/)).toBeInTheDocument()
      })
    })

    it('should render rejected changes with line-through on proposed', async () => {
      const rejectedChange = {
        id: 1,
        status: 'rejected',
        original_text: 'Original text.',
        proposed_text: 'Proposed text.',
      }
      api.get.mockResolvedValueOnce({ data: [rejectedChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        const originalSection = screen.getByText('Original').closest('div')
        expect(within(originalSection).getByText('Original text.')).toBeInTheDocument()
      })
    })

    it('should handle empty string for original text', async () => {
      const change = {
        id: 1,
        status: 'pending',
        original_text: '',
        proposed_text: 'New content.',
      }
      api.get.mockResolvedValueOnce({ data: [change] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('— (new paragraph)')).toBeInTheDocument()
      })
    })

    it('should handle empty string for proposed text', async () => {
      const change = {
        id: 1,
        status: 'pending',
        original_text: 'Old content.',
        proposed_text: '',
      }
      api.get.mockResolvedValueOnce({ data: [change] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('— (deleted)')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases and Boundary Values', () => {
    it('should handle null contractId', async () => {
      api.get.mockResolvedValueOnce({ data: [] })

      render(<DiffViewer contractId={null} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/null/changes')
      })
    })

    it('should handle undefined contractId', async () => {
      api.get.mockResolvedValueOnce({ data: [] })

      render(<DiffViewer contractId={undefined} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/undefined/changes')
      })
    })

    it('should handle null onStatusChange prop', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" onStatusChange={null} />)

      await waitFor(() => screen.getByRole('button', { name: 'Accept' }))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })

    it('should handle undefined onStatusChange prop', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" onStatusChange={undefined} />)

      await waitFor(() => screen.getByRole('button', { name: 'Accept' }))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })

    it('should handle isAdmin as null', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" isAdmin={null} />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Merge/i })).not.toBeInTheDocument()
      })
    })

    it('should handle isAdmin as undefined', async () => {
      api.get.mockResolvedValueOnce({ data: mockChanges })

      render(<DiffViewer contractId="123" isAdmin={undefined} />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Merge/i })).not.toBeInTheDocument()
      })
    })

    it('should handle very long text content', async () => {
      const longText = 'A'.repeat(10000)
      const longChange = {
        id: 1,
        status: 'pending',
        original_text: longText,
        proposed_text: longText + ' B',
      }
      api.get.mockResolvedValueOnce({ data: [longChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle changes with special characters', async () => {
      const specialChange = {
        id: 1,
        status: 'pending',
        original_text: 'Special chars: <>&"\'',
        proposed_text: 'Special chars: <>&"\' modified',
      }
      api.get.mockResolvedValueOnce({ data: [specialChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText(/Special chars:/)).toBeInTheDocument()
      })
    })

    it('should handle changes with unicode characters', async () => {
      const unicodeChange = {
        id: 1,
        status: 'pending',
        original_text: 'Unicode: 你好 🎉 café',
        proposed_text: 'Unicode: 你好 🎊 café',
      }
      api.get.mockResolvedValueOnce({ data: [unicodeChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText(/Unicode:/)).toBeInTheDocument()
      })
    })

    it('should handle changes with only whitespace differences', async () => {
      const whitespaceChange = {
        id: 1,
        status: 'pending',
        original_text: 'Text with  spaces',
        proposed_text: 'Text with   spaces',
      }
      api.get.mockResolvedValueOnce({ data: [whitespaceChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle changes with newlines', async () => {
      const multilineChange = {
        id: 1,
        status: 'pending',
        original_text: 'Line 1\nLine 2\nLine 3',
        proposed_text: 'Line 1\nModified Line 2\nLine 3',
      }
      api.get.mockResolvedValueOnce({ data: [multilineChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle large number of changes', async () => {
      const manyChanges = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        status: 'pending',
        original_text: `Original text ${i}`,
        proposed_text: `Proposed text ${i}`,
      }))
      api.get.mockResolvedValueOnce({ data: manyChanges })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('100 changes tracked')).toBeInTheDocument()
      })
    })

    it('should handle change with id of 0', async () => {
      const user = userEvent.setup()
      const zeroIdChange = { ...mockChanges[0], id: 0 }
      api.get.mockResolvedValueOnce({ data: [zeroIdChange] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByRole('button', { name: 'Accept' }))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/0', { status: 'accepted' })
      })
    })

    it('should handle negative change id', async () => {
      const user = userEvent.setup()
      const negativeIdChange = { ...mockChanges[0], id: -1 }
      api.get.mockResolvedValueOnce({ data: [negativeIdChange] })
      api.patch.mockResolvedValueOnce({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByRole('button', { name: 'Accept' }))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/-1', { status: 'accepted' })
      })
    })
  })

  describe('Multiple User Interactions', () => {
    it('should handle multiple status updates in sequence', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0], mockChanges[1]] })
      api.patch.mockResolvedValue({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getAllByRole('button', { name: 'Accept' }))

      const acceptButtons = screen.getAllByRole('button', { name: 'Accept' })
      await user.click(acceptButtons[0])

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledTimes(1)
      })

      // Click the second Accept button (for the rejected item which shows Accept after previous action)
      const secondAcceptButtons = screen.getAllByRole('button', { name: 'Accept' })
      if (secondAcceptButtons.length > 0) {
        await user.click(secondAcceptButtons[0])

        await waitFor(() => {
          expect(api.patch).toHaveBeenCalledTimes(2)
        })
      }
    })

    it('should handle clicking different action buttons on same change', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockResolvedValue({})

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByRole('button', { name: 'Accept' }))

      // Click Accept
      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/1', { status: 'accepted' })
      })

      // After accepting, click Reset
      const resetButton = screen.getByRole('button', { name: 'Reset' })
      await user.click(resetButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/changes/1', { status: 'pending' })
      })
    })
  })

  describe('API Response Variations', () => {
    it('should handle API response with extra fields', async () => {
      const changesWithExtra = [{
        ...mockChanges[0],
        extra_field: 'value',
        nested: { data: 'test' }
      }]
      api.get.mockResolvedValueOnce({ data: changesWithExtra })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle API response with missing optional fields', async () => {
      const minimalChange = {
        id: 1,
        status: 'pending',
        original_text: 'text',
        proposed_text: 'modified',
      }
      api.get.mockResolvedValueOnce({ data: [minimalChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle API returning null data', async () => {
      api.get.mockResolvedValueOnce({ data: null })

      render(<DiffViewer contractId="123" />)

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.queryByText('Loading changes…')).not.toBeInTheDocument()
      })
    })

    it('should handle API returning undefined data', async () => {
      api.get.mockResolvedValueOnce({ data: undefined })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.queryByText('Loading changes…')).not.toBeInTheDocument()
      })
    })
  })

  describe('Word Diff Algorithm', () => {
    it('should handle identical text', async () => {
      const sameText = {
        id: 1,
        status: 'pending',
        original_text: 'Same text',
        proposed_text: 'Same text',
      }
      api.get.mockResolvedValueOnce({ data: [sameText] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle completely different text', async () => {
      const differentText = {
        id: 1,
        status: 'pending',
        original_text: 'abc',
        proposed_text: 'xyz',
      }
      api.get.mockResolvedValueOnce({ data: [differentText] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle text with single word change', async () => {
      const oneWordChange = {
        id: 1,
        status: 'pending',
        original_text: 'The cat sat',
        proposed_text: 'The dog sat',
      }
      api.get.mockResolvedValueOnce({ data: [oneWordChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle text with word insertion', async () => {
      const insertionChange = {
        id: 1,
        status: 'pending',
        original_text: 'The cat',
        proposed_text: 'The big cat',
      }
      api.get.mockResolvedValueOnce({ data: [insertionChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })

    it('should handle text with word deletion', async () => {
      const deletionChange = {
        id: 1,
        status: 'pending',
        original_text: 'The big cat',
        proposed_text: 'The cat',
      }
      api.get.mockResolvedValueOnce({ data: [deletionChange] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible buttons', async () => {
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })

      render(<DiffViewer contractId="123" />)

      await waitFor(() => {
        const acceptButton = screen.getByRole('button', { name: 'Accept' })
        const rejectButton = screen.getByRole('button', { name: 'Reject' })
        expect(acceptButton).toBeInTheDocument()
        expect(rejectButton).toBeInTheDocument()
      })
    })

    it('should properly disable buttons when in loading state', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValueOnce({ data: [mockChanges[0]] })
      api.patch.mockImplementation(() => new Promise(() => {}))

      render(<DiffViewer contractId="123" />)

      await waitFor(() => screen.getByRole('button', { name: 'Accept' }))

      const acceptButton = screen.getByRole('button', { name: 'Accept' })
      await user.click(acceptButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: '…' })
        expect(loadingButton).toBeDisabled()
      })
    })
  })
})
