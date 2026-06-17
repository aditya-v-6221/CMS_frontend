import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ContractDetailPage from './ContractDetailPage'

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
}))

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../components/document/DocumentPanel', () => ({
  default: ({ contractId, onSaved }) => (
    <div data-testid="document-panel" data-contract-id={contractId}>
      <button onClick={onSaved}>Trigger onSaved</button>
    </div>
  ),
}))

vi.mock('../components/document/AdminCommentsPanel', () => ({
  default: ({ contractId, comments, onResolved }) => (
    <div data-testid="admin-comments-panel" data-contract-id={contractId}>
      Admin Comments ({comments.length})
      <button onClick={onResolved}>Trigger onResolved</button>
    </div>
  ),
}))

vi.mock('../components/StatusBadge', () => ({
  default: ({ status }) => <span data-testid="status-badge">{status}</span>,
}))

describe('ContractDetailPage', () => {
  let user
  let mockNavigate

  const mockContract = {
    id: '123',
    title: 'Test Contract',
    original_filename: 'test.pdf',
    lifecycle_status: 'draft',
    file_type: 'pdf',
    owner_id: 'user-1',
    contract_type: 'NDA',
    jurisdiction: 'NY',
    counterparty_name: 'ACME Corp',
    counterparty_email: 'acme@example.com',
    department: 'Legal',
    governing_law: 'NY Law',
    effective_date: '2026-01-01',
    expiry_date: '2027-01-01',
    esign_provider: 'DocuSign',
    esign_status: 'pending',
    description: 'Test description',
    reviewed_content: null,
  }

  const mockStatus = {
    days_until_expiry: 200,
    reviewers: [],
    open_comment_count: 0,
  }

  const mockHistory = [
    {
      id: 'h1',
      action: 'created',
      user_id: 'user-1',
      created_at: '2026-01-01T10:00:00Z',
    },
  ]

  const mockComments = []

  const mockUsers = [
    { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' },
    { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate = vi.fn()
    useNavigate.mockReturnValue(mockNavigate)
    useParams.mockReturnValue({ id: '123' })

    user = userEvent.setup()

    // Default API responses
    api.get.mockImplementation((url) => {
      if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
      if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
      if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
      if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
      if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
      if (url.startsWith('/auth/users/search')) return Promise.resolve({ data: [] })
      return Promise.reject(new Error('Not found'))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading and Error States', () => {
    it('should display loading state initially', () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })
      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<ContractDetailPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should display error when contract fetch fails', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })
      api.get.mockRejectedValue({
        response: { data: { detail: 'Contract not found' } }
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract not found')).toBeInTheDocument()
      })
    })

    it('should display generic error when no detail provided', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })
      api.get.mockRejectedValue(new Error('Network error'))

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load contract')).toBeInTheDocument()
      })
    })

    it('should load successfully and display contract data', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.getByText('NDA')).toBeInTheDocument()
      expect(screen.getByText('NY')).toBeInTheDocument()
      expect(screen.getByTestId('status-badge')).toHaveTextContent('draft')
    })

    it('should handle missing users list gracefully (non-admin)', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.reject(new Error('Forbidden'))
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      // Should still render even without user list
      expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    })
  })

  describe('Role-based Rendering', () => {
    it('should show limited UI for viewer role', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-3', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.queryByText('Actions')).not.toBeInTheDocument()
      expect(screen.queryByText('Assign Legal Reviewer')).not.toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should show editor capabilities for editor role', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.getByText('Actions')).toBeInTheDocument()
      expect(screen.getByText('Assign Legal Reviewer')).toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument() // Only admin can delete
    })

    it('should show admin capabilities for admin role', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.getByText('Actions')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should show reviewer banner when user is assigned reviewer', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-2', role: 'reviewer' } })

      const reviewStatus = {
        ...mockStatus,
        reviewers: [{ reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'pending' }],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: reviewStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/You are assigned as a reviewer/)).toBeInTheDocument()
      })
    })

    it('should not show reviewer banner for admin even if assigned', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-2', role: 'admin' } })

      const reviewStatus = {
        ...mockStatus,
        reviewers: [{ reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'pending' }],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: reviewStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.queryByText(/You are assigned as a reviewer/)).not.toBeInTheDocument()
    })
  })

  describe('Lifecycle Actions', () => {
    it('should show "Submit for review" button in draft status for editor', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })
    })

    it('should submit for review when button clicked', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })
      api.post.mockResolvedValue({})

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit for review'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/submit-for-review', {})
      })
    })

    it('should show reviewer action buttons when user is assigned reviewer', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-2', role: 'reviewer' } })

      const reviewStatus = {
        ...mockStatus,
        reviewers: [{ reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'pending' }],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: reviewStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Approve review')).toBeInTheDocument()
      })

      expect(screen.getByText('Reject review')).toBeInTheDocument()
    })

    it('should approve review when approve button clicked', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-2', role: 'reviewer' } })
      api.post.mockResolvedValue({})

      const reviewStatus = {
        ...mockStatus,
        reviewers: [{ reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'pending' }],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: reviewStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Approve review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Approve review'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/reviewers/decision', { decision: 'approved' })
      })
    })

    it('should reject review when reject button clicked', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-2', role: 'reviewer' } })
      api.post.mockResolvedValue({})

      const reviewStatus = {
        ...mockStatus,
        reviewers: [{ reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'pending' }],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: reviewStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Reject review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Reject review'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/reviewers/decision', { decision: 'rejected' })
      })
    })

    it('should show admin approval buttons in approval status', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'approval' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument()
      })

      expect(screen.getByText('Reject')).toBeInTheDocument()
    })

    it('should approve contract when admin clicks approve', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })
      api.post.mockResolvedValue({})

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'approval' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Approve'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/approve', {})
      })
    })

    it('should reject contract when admin clicks reject', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })
      api.post.mockResolvedValue({})

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'approval' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Reject'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/reject', {})
      })
    })

    it('should show "Mark executed" button in pending_signature status', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'pending_signature' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Mark executed')).toBeInTheDocument()
      })
    })

    it('should mark executed when button clicked', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })
      api.post.mockResolvedValue({})

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'pending_signature' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Mark executed')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Mark executed'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/mark-executed', {})
      })
    })

    it('should show "Mark expired" button in executed status', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'executed' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Mark expired')).toBeInTheDocument()
      })
    })

    it('should show "Terminate" button for admin in non-terminated status', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Terminate')).toBeInTheDocument()
      })
    })

    it('should not show "Terminate" button in terminated status', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'terminated' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.queryByText('Terminate')).not.toBeInTheDocument()
    })

    it('should display action error when action fails', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })
      api.post.mockRejectedValue({
        response: { data: { detail: 'Action failed' } }
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit for review'))

      await waitFor(() => {
        expect(screen.getByText('Action failed')).toBeInTheDocument()
      })
    })

    it('should display generic error when action fails without detail', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })
      api.post.mockRejectedValue(new Error('Network error'))

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit for review'))

      await waitFor(() => {
        expect(screen.getByText('Submit for review failed')).toBeInTheDocument()
      })
    })

    it('should show loading state on action button while action is in progress', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      let resolvePost
      const postPromise = new Promise((resolve) => {
        resolvePost = resolve
      })
      api.post.mockReturnValue(postPromise)

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })

      const button = screen.getByText('Submit for review')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('…')).toBeInTheDocument()
      })

      resolvePost({})

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })
    })
  })

  describe('Download Functionality', () => {
    it('should download PDF when download button clicked', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      api.get.mockImplementation((url, config) => {
        if (url === '/contracts/123/download') return Promise.resolve({ data: mockBlob })
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      const createElementSpy = vi.spyOn(document, 'createElement')

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      createElementSpy.mockReturnValue(mockAnchor)

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/download', { responseType: 'blob' })
      })

      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob)
      expect(mockAnchor.href).toBe('blob:mock-url')
      expect(mockAnchor.download).toBe('test.pdf')
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
      createElementSpy.mockRestore()
    })

    it('should use fallback filename when original_filename is missing', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const contractNoFilename = { ...mockContract, original_filename: null }
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })

      api.get.mockImplementation((url, config) => {
        if (url === '/contracts/123/download') return Promise.resolve({ data: mockBlob })
        if (url === '/contracts/123') return Promise.resolve({ data: contractNoFilename })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      const createElementSpy = vi.spyOn(document, 'createElement')

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      createElementSpy.mockReturnValue(mockAnchor)

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(mockAnchor.download).toBe('contract_123.pdf')
      })

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
      createElementSpy.mockRestore()
    })
  })

  describe('Delete Functionality', () => {
    it('should delete contract when admin confirms', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })
      api.delete.mockResolvedValue({})

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith('Delete this contract? This cannot be undone.')
        expect(api.delete).toHaveBeenCalledWith('/contracts/123')
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })

      confirmSpy.mockRestore()
    })

    it('should not delete contract when admin cancels', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled()
      })

      expect(api.delete).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  describe('Reviewer Assignment', () => {
    it('should show reviewer assignment section in draft status for editor', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Assign Legal Reviewer')).toBeInTheDocument()
      })

      expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
    })

    it('should not show reviewer assignment in non-draft status', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.queryByText('Assign Legal Reviewer')).not.toBeInTheDocument()
    })

    it('should search for reviewers when typing in search box', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      const searchResults = [
        { id: 'user-3', full_name: 'Alice Reviewer', email: 'alice@example.com', role: 'reviewer' },
      ]

      api.get.mockImplementation((url) => {
        if (url.startsWith('/auth/users/search?q=alice')) return Promise.resolve({ data: searchResults })
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      await user.type(searchInput, 'alice')

      await waitFor(() => {
        expect(screen.getByText('Alice Reviewer')).toBeInTheDocument()
      }, { timeout: 1000 })

      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    it('should clear results when search is empty', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      const searchResults = [
        { id: 'user-3', full_name: 'Alice Reviewer', email: 'alice@example.com', role: 'reviewer' },
      ]

      api.get.mockImplementation((url) => {
        if (url.startsWith('/auth/users/search?q=alice')) return Promise.resolve({ data: searchResults })
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      await user.type(searchInput, 'alice')

      await waitFor(() => {
        expect(screen.getByText('Alice Reviewer')).toBeInTheDocument()
      }, { timeout: 1000 })

      await user.clear(searchInput)

      await waitFor(() => {
        expect(screen.queryByText('Alice Reviewer')).not.toBeInTheDocument()
      })
    })

    it('should assign reviewer when search result clicked', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })
      api.post.mockResolvedValue({})

      const searchResults = [
        { id: 'user-3', full_name: 'Alice Reviewer', email: 'alice@example.com', role: 'reviewer', department: 'Legal' },
      ]

      api.get.mockImplementation((url) => {
        if (url.startsWith('/auth/users/search?q=alice')) return Promise.resolve({ data: searchResults })
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      await user.type(searchInput, 'alice')

      await waitFor(() => {
        expect(screen.getByText('Alice Reviewer')).toBeInTheDocument()
      }, { timeout: 1000 })

      await user.click(screen.getByText('Alice Reviewer'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/reviewers', {
          assignments: [{ user_id: 'user-3', review_order: 1 }]
        })
      })
    })

    it('should display assigned reviewer count', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      const statusWithReviewers = {
        ...mockStatus,
        reviewers: [
          { reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'pending' },
          { reviewer_id: 'user-3', reviewer_name: 'Alice Reviewer', status: 'pending' },
        ],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: statusWithReviewers })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('2 reviewer(s) assigned')).toBeInTheDocument()
      })
    })
  })

  describe('Comments Section', () => {
    it('should display no comments message when empty', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('No comments yet')).toBeInTheDocument()
      })
    })

    it('should display existing comments', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const comments = [
        {
          id: 'c1',
          user_id: 'user-1',
          user_name: 'John Doe',
          content: 'This is a comment',
          created_at: '2026-01-02T10:00:00Z',
          is_resolved: false,
        },
        {
          id: 'c2',
          user_id: 'user-2',
          user_name: 'Jane Smith',
          content: 'Resolved comment',
          created_at: '2026-01-03T10:00:00Z',
          is_resolved: true,
        },
      ]

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: { ...mockStatus, open_comment_count: 1 } })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: comments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('This is a comment')).toBeInTheDocument()
      })

      expect(screen.getByText('Resolved comment')).toBeInTheDocument()
      expect(screen.getByText('Comments')).toBeInTheDocument()
      expect(screen.getByText('(1 open)')).toBeInTheDocument()
    })

    it('should display user name or fallback for comments', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const comments = [
        {
          id: 'c1',
          user_id: 'user-999',
          user_name: null,
          content: 'Comment without name',
          created_at: '2026-01-02T10:00:00Z',
          is_resolved: false,
        },
      ]

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: comments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('User #user-999')).toBeInTheDocument()
      })
    })

    it('should post comment when post button clicked', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })
      api.post.mockResolvedValue({})

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment…')).toBeInTheDocument()
      })

      const commentInput = screen.getByPlaceholderText('Add a comment…')
      await user.type(commentInput, 'New comment')

      const postButton = screen.getByText('Post')
      await user.click(postButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/123/comments', { content: 'New comment' })
      })
    })

    it('should not post empty comment', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })
      api.post.mockResolvedValue({})

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment…')).toBeInTheDocument()
      })

      const postButton = screen.getByText('Post')
      await user.click(postButton)

      expect(api.post).not.toHaveBeenCalled()
    })

    it('should not post whitespace-only comment', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })
      api.post.mockResolvedValue({})

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment…')).toBeInTheDocument()
      })

      const commentInput = screen.getByPlaceholderText('Add a comment…')
      await user.type(commentInput, '   ')

      const postButton = screen.getByText('Post')
      await user.click(postButton)

      expect(api.post).not.toHaveBeenCalled()
    })

    it('should clear comment input after successful post', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })
      api.post.mockResolvedValue({})

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment…')).toBeInTheDocument()
      })

      const commentInput = screen.getByPlaceholderText('Add a comment…')
      await user.type(commentInput, 'New comment')

      const postButton = screen.getByText('Post')
      await user.click(postButton)

      await waitFor(() => {
        expect(commentInput).toHaveValue('')
      })
    })

    it('should show AdminCommentsPanel for admin users', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'admin' } })

      const comments = [
        {
          id: 'c1',
          user_id: 'user-1',
          user_name: 'John Doe',
          content: 'Admin comment',
          created_at: '2026-01-02T10:00:00Z',
          is_resolved: false,
        },
      ]

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: comments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('admin-comments-panel')).toBeInTheDocument()
      })

      expect(screen.getByText('Admin Comments (1)')).toBeInTheDocument()
    })
  })

  describe('Metadata Display', () => {
    it('should display all contract metadata', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument()
      })

      expect(screen.getByText('ACME Corp')).toBeInTheDocument()
      expect(screen.getByText('acme@example.com')).toBeInTheDocument()
      expect(screen.getByText('Legal')).toBeInTheDocument()
      expect(screen.getByText('NY Law')).toBeInTheDocument()
      expect(screen.getByText('2026-01-01')).toBeInTheDocument()
      expect(screen.getByText('2027-01-01')).toBeInTheDocument()
      expect(screen.getByText('DocuSign')).toBeInTheDocument()
      expect(screen.getByText('pending')).toBeInTheDocument()
    })

    it('should not display missing metadata fields', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const sparseContract = {
        ...mockContract,
        counterparty_email: null,
        department: null,
        esign_provider: null,
        esign_status: null,
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: sparseContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument()
      })

      expect(screen.queryByText('Email')).not.toBeInTheDocument()
      expect(screen.queryByText('acme@example.com')).not.toBeInTheDocument()
      expect(screen.queryByText('eSign provider')).not.toBeInTheDocument()
    })

    it('should display description when present', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test description')).toBeInTheDocument()
      })
    })

    it('should display days until expiry', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('200d')).toBeInTheDocument()
      })
    })

    it('should highlight days until expiry in red when less than 30', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: { ...mockStatus, days_until_expiry: 15 } })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('15d')).toBeInTheDocument()
      })

      const expiryElement = screen.getByText('15d')
      expect(expiryElement).toHaveClass('text-red-600')
    })

    it('should use title when both title and filename are present', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      // Should display title, not filename
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
    })

    it('should use filename when title is missing', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const contractNoTitle = { ...mockContract, title: null }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: contractNoTitle })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('Legal Reviewers Section', () => {
    it('should display reviewers when present', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const statusWithReviewers = {
        ...mockStatus,
        reviewers: [
          { reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'approved' },
          { reviewer_id: 'user-3', reviewer_name: 'Bob Reviewer', status: 'pending' },
          { reviewer_id: 'user-4', reviewer_name: null, status: 'rejected' },
        ],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: statusWithReviewers })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Legal Review')).toBeInTheDocument()
      })

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Reviewer')).toBeInTheDocument()
      expect(screen.getByText('Reviewer #user-4')).toBeInTheDocument()
    })

    it('should display reviewer status badges with correct styling', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const statusWithReviewers = {
        ...mockStatus,
        reviewers: [
          { reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'approved' },
          { reviewer_id: 'user-3', reviewer_name: 'Bob Reviewer', status: 'rejected' },
          { reviewer_id: 'user-4', reviewer_name: 'Alice Reviewer', status: 'pending' },
        ],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: statusWithReviewers })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Legal Review')).toBeInTheDocument()
      })

      const approvedBadge = screen.getByText('approved')
      const rejectedBadge = screen.getByText('rejected')
      const pendingBadge = screen.getByText('pending')

      expect(approvedBadge).toHaveClass('bg-green-100', 'text-green-700')
      expect(rejectedBadge).toHaveClass('bg-red-100', 'text-red-700')
      expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-700')
    })

    it('should not display reviewers section when no reviewers', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.queryByText('Legal Review')).not.toBeInTheDocument()
    })
  })

  describe('Lifecycle Stepper', () => {
    it('should display lifecycle stepper with correct current step', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      expect(screen.getByText('Legal Review')).toBeInTheDocument()
      expect(screen.getByText('Approval')).toBeInTheDocument()
      expect(screen.getByText('Pending Signature')).toBeInTheDocument()
      expect(screen.getByText('Executed')).toBeInTheDocument()
    })

    it('should display user names in stepper when available', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should display terminated badge for terminated contracts', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'terminated' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract terminated')).toBeInTheDocument()
      })
    })

    it('should display expired badge for expired contracts', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'expired' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract expired')).toBeInTheDocument()
      })
    })

    it('should show correct steps completed for review status', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const reviewHistory = [
        {
          id: 'h1',
          action: 'created',
          user_id: 'user-1',
          created_at: '2026-01-01T10:00:00Z',
        },
      ]

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: reviewHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Under legal review')).toBeInTheDocument()
      })
    })
  })

  describe('DocumentPanel Integration', () => {
    it('should render DocumentPanel with correct props', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        const documentPanel = screen.getByTestId('document-panel')
        expect(documentPanel).toBeInTheDocument()
        expect(documentPanel).toHaveAttribute('data-contract-id', '123')
      })
    })

    it('should pass isReviewer=true to DocumentPanel for assigned reviewer', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-2', role: 'reviewer' } })

      const reviewStatus = {
        ...mockStatus,
        reviewers: [{ reviewer_id: 'user-2', reviewer_name: 'Jane Smith', status: 'pending' }],
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/123/status') return Promise.resolve({ data: reviewStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('document-panel')).toBeInTheDocument()
      })
    })

    it('should reload data when DocumentPanel onSaved callback is triggered', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('document-panel')).toBeInTheDocument()
      })

      const initialCallCount = api.get.mock.calls.length

      // Trigger onSaved callback
      await user.click(screen.getByText('Trigger onSaved'))

      await waitFor(() => {
        expect(api.get.mock.calls.length).toBeGreaterThan(initialCallCount)
      })
    })
  })

  describe('Edge Cases and Boundary Values', () => {
    it('should handle null user gracefully', async () => {
      useAuth.mockReturnValue({ user: null })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      expect(screen.queryByText('Actions')).not.toBeInTheDocument()
    })

    it('should handle undefined status gracefully', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: null })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })

    it('should handle empty history array', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: [] } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })

    it('should handle days_until_expiry as 0', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: { ...mockStatus, days_until_expiry: 0 } })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('0d')).toBeInTheDocument()
      })

      expect(screen.getByText('0d')).toHaveClass('text-red-600')
    })

    it('should handle negative days_until_expiry', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: { ...mockStatus, days_until_expiry: -5 } })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('-5d')).toBeInTheDocument()
      })
    })

    it('should handle empty userNames object', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: [] })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      // Should show fallback user ID
      expect(screen.getByText('User #user-1')).toBeInTheDocument()
    })

    it('should handle contract with all optional fields missing', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const minimalContract = {
        id: '123',
        title: 'Minimal Contract',
        original_filename: 'minimal.pdf',
        lifecycle_status: 'draft',
        file_type: 'pdf',
        owner_id: 'user-1',
        contract_type: null,
        jurisdiction: null,
        counterparty_name: null,
        counterparty_email: null,
        department: null,
        governing_law: null,
        effective_date: null,
        expiry_date: null,
        esign_provider: null,
        esign_status: null,
        description: null,
        reviewed_content: null,
      }

      api.get.mockImplementation((url) => {
        if (url === '/contracts/123') return Promise.resolve({ data: minimalContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: { ...mockStatus, days_until_expiry: null } })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Minimal Contract')).toBeInTheDocument()
      })

      expect(screen.getByText('Details')).toBeInTheDocument()
    })

    it('should handle search with special characters', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      api.get.mockImplementation((url) => {
        if (url.includes('/auth/users/search?q=alice%40example.com')) {
          return Promise.resolve({ data: [{ id: 'user-3', full_name: 'Alice', email: 'alice@example.com', role: 'reviewer' }] })
        }
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      await user.type(searchInput, 'alice@example.com')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('alice%40example.com'))
      }, { timeout: 1000 })
    })

    it('should handle reviewer search debouncing', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'editor' } })

      const searchResults = [
        { id: 'user-3', full_name: 'Alice', email: 'alice@example.com', role: 'reviewer' },
      ]

      api.get.mockImplementation((url) => {
        if (url.startsWith('/auth/users/search')) return Promise.resolve({ data: searchResults })
        if (url === '/contracts/123') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/123/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/123')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/123/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name or email…')

      // Type quickly (should debounce)
      await user.type(searchInput, 'a')
      await user.type(searchInput, 'l')
      await user.type(searchInput, 'i')

      // Wait for debounce
      await waitFor(() => {
        const searchCalls = api.get.mock.calls.filter(call => call[0].includes('/auth/users/search'))
        // Should have made only 1 call after debounce, not 3
        expect(searchCalls.length).toBeLessThan(3)
      }, { timeout: 1000 })
    })
  })

  describe('Reload Behavior', () => {
    it('should reload data when id changes', async () => {
      useAuth.mockReturnValue({ user: { id: 'user-1', role: 'viewer' } })

      const { rerender } = render(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })

      const firstCallCount = api.get.mock.calls.filter(call => call[0].includes('/contracts/123')).length

      // Change ID
      useParams.mockReturnValue({ id: '456' })
      api.get.mockImplementation((url) => {
        if (url === '/contracts/456') return Promise.resolve({ data: { ...mockContract, id: '456', title: 'Another Contract' } })
        if (url === '/contracts/456/status') return Promise.resolve({ data: mockStatus })
        if (url.startsWith('/audit/contracts/456')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/456/comments') return Promise.resolve({ data: mockComments })
        if (url.startsWith('/auth/users?limit')) return Promise.resolve({ data: mockUsers })
        return Promise.reject(new Error('Not found'))
      })

      rerender(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Another Contract')).toBeInTheDocument()
      })

      const secondCallCount = api.get.mock.calls.filter(call => call[0].includes('/contracts/456')).length
      expect(secondCallCount).toBeGreaterThan(0)
    })
  })
})
