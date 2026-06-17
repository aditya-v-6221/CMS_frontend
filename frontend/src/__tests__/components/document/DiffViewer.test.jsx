import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiffViewer from '../../../components/document/DiffViewer'
import api from '../../../api/client'

jest.mock('../../../api/client')

describe('DiffViewer', () => {
  const mockOnStatusChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading state', () => {
    it('should show loading message initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      expect(screen.getByText('Loading changes…')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('should display error message when API call fails', async () => {
      api.get.mockRejectedValue(new Error('API Error'))

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load reviewer changes.')).toBeInTheDocument()
      })
    })
  })

  describe('No changes state', () => {
    it('should display success message when no changes exist', async () => {
      api.get.mockResolvedValue({ data: [] })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText(/No paragraph-level changes detected/)).toBeInTheDocument()
      })
    })
  })

  describe('Changes display', () => {
    const mockChanges = [
      {
        id: 1,
        original_text: 'Original paragraph text',
        proposed_text: 'Modified paragraph text',
        status: 'pending',
      },
      {
        id: 2,
        original_text: 'Second original',
        proposed_text: 'Second modified',
        status: 'accepted',
      },
      {
        id: 3,
        original_text: 'Third original',
        proposed_text: 'Third modified',
        status: 'rejected',
      },
    ]

    it('should display all changes', async () => {
      api.get.mockResolvedValue({ data: mockChanges })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText(/3 changes tracked/)).toBeInTheDocument()
      })
    })

    it('should display summary counts correctly', async () => {
      api.get.mockResolvedValue({ data: mockChanges })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('1 pending review')).toBeInTheDocument()
        expect(screen.getByText('1 accepted')).toBeInTheDocument()
        expect(screen.getByText('1 rejected')).toBeInTheDocument()
      })
    })

    it('should display original and proposed text', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            original_text: 'Original text here',
            proposed_text: 'Proposed text here',
            status: 'pending',
          },
        ],
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Original')).toBeInTheDocument()
        expect(screen.getByText('Proposed')).toBeInTheDocument()
      })
    })

    it('should handle single change with singular text', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            original_text: 'Text',
            proposed_text: 'Modified',
            status: 'pending',
          },
        ],
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })
  })

  describe('Status change actions', () => {
    const mockChange = {
      id: 10,
      original_text: 'Original',
      proposed_text: 'Proposed',
      status: 'pending',
    }

    it('should call API to accept a change', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChange] })
      api.patch.mockResolvedValue({ data: { ...mockChange, status: 'accepted' } })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/1/changes/10', { status: 'accepted' })
      })
    })

    it('should call API to reject a change', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChange] })
      api.patch.mockResolvedValue({ data: { ...mockChange, status: 'rejected' } })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Reject'))

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/1/changes/10', { status: 'rejected' })
      })
    })

    it('should call onStatusChange callback after status update', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChange] })
      api.patch.mockResolvedValue({ data: { ...mockChange, status: 'accepted' } })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalled()
      })
    })

    it('should handle status update API failure gracefully', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChange] })
      api.patch.mockRejectedValue(new Error('Update failed'))

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Accept'))

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })

    it('should show loading state on button during update', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [mockChange] })
      api.patch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })

      const acceptButton = screen.getByText('Accept')
      await user.click(acceptButton)

      expect(screen.getByText('…')).toBeInTheDocument()
    })
  })

  describe('Admin merge functionality', () => {
    const acceptedChange = {
      id: 1,
      original_text: 'Original',
      proposed_text: 'Accepted change',
      status: 'accepted',
    }

    it('should show merge button for admin users', async () => {
      api.get.mockResolvedValue({ data: [acceptedChange] })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Merge 1 accepted change/ })).toBeInTheDocument()
      })
    })

    it('should not show merge button for non-admin users', async () => {
      api.get.mockResolvedValue({ data: [acceptedChange] })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Merge/ })).not.toBeInTheDocument()
      })
    })

    it('should disable merge button when no accepted changes', async () => {
      api.get.mockResolvedValue({
        data: [{ id: 1, original_text: 'A', proposed_text: 'B', status: 'pending' }],
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /Merge 0 accepted change/ })
        expect(mergeButton).toBeDisabled()
      })
    })

    it('should call merge API endpoint on merge button click', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [acceptedChange] })
      api.post.mockResolvedValue({ data: {} })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Merge 1 accepted change/ })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Merge 1 accepted change/ }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/1/review-approve')
      })
    })

    it('should show success message after successful merge', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [acceptedChange] })
      api.post.mockResolvedValue({ data: {} })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Merge/ })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Merge/ }))

      await waitFor(() => {
        expect(screen.getByText('Changes merged into new version')).toBeInTheDocument()
      })
    })

    it('should show error message on merge failure', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [acceptedChange] })
      api.post.mockRejectedValue({
        response: { data: { detail: 'Merge conflict occurred' } },
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Merge/ })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Merge/ }))

      await waitFor(() => {
        expect(screen.getByText('Merge conflict occurred')).toBeInTheDocument()
      })
    })

    it('should show generic error when detail is not provided', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [acceptedChange] })
      api.post.mockRejectedValue({ response: { data: {} } })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Merge/ })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Merge/ }))

      await waitFor(() => {
        expect(screen.getByText('Failed to merge changes.')).toBeInTheDocument()
      })
    })

    it('should use plural form for multiple accepted changes', async () => {
      api.get.mockResolvedValue({
        data: [
          { id: 1, original_text: 'A', proposed_text: 'B', status: 'accepted' },
          { id: 2, original_text: 'C', proposed_text: 'D', status: 'accepted' },
        ],
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Merge 2 accepted changes' })).toBeInTheDocument()
      })
    })

    it('should call onStatusChange after successful merge', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: [acceptedChange] })
      api.post.mockResolvedValue({ data: {} })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Merge/ })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Merge/ }))

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalled()
      })
    })
  })

  describe('Reload on contractId change', () => {
    it('should reload changes when contractId prop changes', async () => {
      api.get.mockResolvedValue({ data: [] })

      const { rerender } = render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/changes')
      })

      rerender(<DiffViewer contractId={2} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/2/changes')
      })
    })
  })

  describe('Boundary cases', () => {
    it('should handle null original_text', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            original_text: null,
            proposed_text: 'New paragraph',
            status: 'pending',
          },
        ],
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText(/new paragraph/i)).toBeInTheDocument()
      })
    })

    it('should handle null proposed_text', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            original_text: 'Deleted paragraph',
            proposed_text: null,
            status: 'pending',
          },
        ],
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText(/deleted/i)).toBeInTheDocument()
      })
    })

    it('should handle empty strings', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            original_text: '',
            proposed_text: 'Text',
            status: 'pending',
          },
        ],
      })

      render(<DiffViewer contractId={1} onStatusChange={mockOnStatusChange} isAdmin={false} />)

      await waitFor(() => {
        expect(screen.getByText('1 change tracked')).toBeInTheDocument()
      })
    })
  })
})
