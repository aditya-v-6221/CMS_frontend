import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import ContractDetailPage from './ContractDetailPage'
import api from '../api/client'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../api/client')
vi.mock('../components/StatusBadge', () => ({
  default: ({ status }) => <span data-testid="status-badge">{status}</span>,
}))
vi.mock('../components/document/DocumentPanel', () => ({
  default: ({ contractId, isReviewer, isAdmin, isDrafter }) => (
    <div data-testid="document-panel">
      DocumentPanel {contractId} - reviewer:{String(isReviewer)} admin:{String(isAdmin)} drafter:{String(isDrafter)}
    </div>
  ),
}))
vi.mock('../components/document/AdminCommentsPanel', () => ({
  default: ({ contractId, comments, onResolved }) => (
    <div data-testid="admin-comments-panel">
      AdminCommentsPanel {contractId} - {comments.length} comments
    </div>
  ),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
  }
})

const renderWithRouter = (component, user = { id: 1, role: 'editor', email: 'test@test.com' }) => {
  localStorage.setItem('user', JSON.stringify(user))
  return render(
    <MemoryRouter initialEntries={['/contracts/1']}>
      <AuthProvider>{component}</AuthProvider>
    </MemoryRouter>
  )
}

describe('ContractDetailPage', () => {
  const mockContract = {
    id: 1,
    title: 'Test Contract',
    original_filename: 'test.pdf',
    lifecycle_status: 'draft',
    owner_id: 1,
    file_type: 'pdf',
    contract_type: 'NDA',
    jurisdiction: 'California',
    counterparty_name: 'Acme Corp',
    counterparty_email: 'contact@acme.com',
    department: 'Legal',
    governing_law: 'California Law',
    effective_date: '2024-01-01',
    expiry_date: '2025-01-01',
    esign_provider: 'DocuSign',
    esign_status: 'pending',
    description: 'Test description',
    reviewed_content: null,
  }

  const mockStatus = {
    reviewers: [],
    open_comment_count: 0,
    days_until_expiry: 365,
  }

  const mockHistory = [
    {
      id: 1,
      action: 'created',
      user_id: 1,
      created_at: '2024-01-01T10:00:00Z',
    },
  ]

  const mockComments = []

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    localStorage.clear()

    // Default API mocks
    api.get.mockImplementation((url) => {
      if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
      if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
      if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
      if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
      if (url === '/auth/users') return Promise.resolve({ data: [] })
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('loading state', () => {
    it('should show loading message initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<ContractDetailPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should fetch all required data on mount', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1')
        expect(api.get).toHaveBeenCalledWith('/contracts/1/status')
        expect(api.get).toHaveBeenCalledWith('/audit/contracts/1?limit=100')
        expect(api.get).toHaveBeenCalledWith('/contracts/1/comments')
      })
    })
  })

  describe('page header', () => {
    it('should display contract title', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })

    it('should display filename as fallback when title is missing', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, title: null } })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })
    })

    it('should display status badge', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('status-badge')).toHaveTextContent('draft')
      })
    })

    it('should display contract type', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('NDA')).toBeInTheDocument()
      })
    })

    it('should display jurisdiction', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('California')).toBeInTheDocument()
      })
    })

    it('should have download PDF button', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument()
      })
    })
  })

  describe('download functionality', () => {
    it('should download PDF when button clicked', async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      api.get.mockImplementation((url, config) => {
        if (url === '/contracts/1' && !config) return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/download') return Promise.resolve({ data: mockBlob })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/download', { responseType: 'blob' })
      })

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  describe('delete functionality', () => {
    it('should show delete button for admins', async () => {
      const adminUser = { id: 1, role: 'admin', email: 'admin@test.com' }
      renderWithRouter(<ContractDetailPage />, adminUser)

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })
    })

    it('should not show delete button for non-admins', async () => {
      const editorUser = { id: 1, role: 'editor', email: 'editor@test.com' }
      renderWithRouter(<ContractDetailPage />, editorUser)

      await waitFor(() => {
        expect(screen.queryByText('Delete')).not.toBeInTheDocument()
      })
    })

    it('should ask for confirmation before deleting', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      const adminUser = { id: 1, role: 'admin', email: 'admin@test.com' }
      api.delete.mockResolvedValue({})

      renderWithRouter(<ContractDetailPage />, adminUser)

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Delete'))

      expect(confirmSpy).toHaveBeenCalled()
      expect(api.delete).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('should delete contract and navigate away', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const adminUser = { id: 1, role: 'admin', email: 'admin@test.com' }
      api.delete.mockResolvedValue({})

      renderWithRouter(<ContractDetailPage />, adminUser)

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/contracts/1')
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })

      confirmSpy.mockRestore()
    })
  })

  describe('lifecycle stepper', () => {
    it('should render lifecycle steps', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
        expect(screen.getByText('Legal Review')).toBeInTheDocument()
        expect(screen.getByText('Approval')).toBeInTheDocument()
        expect(screen.getByText('Pending Signature')).toBeInTheDocument()
        expect(screen.getByText('Executed')).toBeInTheDocument()
      })
    })

    it('should highlight current step', async () => {
      const { container } = renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        const currentStep = container.querySelector('.bg-indigo-600')
        expect(currentStep).toBeInTheDocument()
      })
    })

    it('should show completed steps', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      const { container } = renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        const completedSteps = container.querySelectorAll('.bg-green-500')
        expect(completedSteps.length).toBeGreaterThan(0)
      })
    })

    it('should show terminal state for terminated contracts', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'terminated' } })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract terminated')).toBeInTheDocument()
      })
    })

    it('should show terminal state for expired contracts', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'expired' } })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract expired')).toBeInTheDocument()
      })
    })
  })

  describe('document panel', () => {
    it('should render DocumentPanel', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('document-panel')).toBeInTheDocument()
      })
    })

    it('should pass isReviewer prop correctly for assigned reviewers', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/1/status') return Promise.resolve({
          data: {
            ...mockStatus,
            reviewers: [{ reviewer_id: 1, reviewer_name: 'Test User', status: 'pending' }],
          },
        })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/reviewer:true/)).toBeInTheDocument()
      })
    })

    it('should pass isAdmin prop correctly', async () => {
      const adminUser = { id: 1, role: 'admin', email: 'admin@test.com' }
      renderWithRouter(<ContractDetailPage />, adminUser)

      await waitFor(() => {
        expect(screen.getByText(/admin:true/)).toBeInTheDocument()
      })
    })
  })

  describe('details section', () => {
    it('should display contract details', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('contact@acme.com')).toBeInTheDocument()
        expect(screen.getByText('Legal')).toBeInTheDocument()
        expect(screen.getByText('California Law')).toBeInTheDocument()
        expect(screen.getByText('2024-01-01')).toBeInTheDocument()
        expect(screen.getByText('2025-01-01')).toBeInTheDocument()
      })
    })

    it('should display days until expiry', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Days until expiry')).toBeInTheDocument()
        expect(screen.getByText('365d')).toBeInTheDocument()
      })
    })

    it('should highlight expiry warning when less than 30 days', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/status') return Promise.resolve({ data: { ...mockStatus, days_until_expiry: 20 } })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      const { container } = renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        const expiryText = screen.getByText('20d')
        expect(expiryText).toHaveClass('text-red-600')
      })
    })

    it('should display description', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test description')).toBeInTheDocument()
      })
    })
  })

  describe('reviewer assignment', () => {
    it('should show reviewer assignment section for editors in draft status', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Assign Legal Reviewer')).toBeInTheDocument()
      })
    })

    it('should not show reviewer assignment for non-draft contracts', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.queryByText('Assign Legal Reviewer')).not.toBeInTheDocument()
      })
    })

    it('should search for reviewers when typing', async () => {
      const user = userEvent.setup()
      api.get.mockImplementation((url) => {
        if (url.includes('/auth/users/search')) {
          return Promise.resolve({ data: [{ id: 2, full_name: 'John Reviewer', email: 'john@test.com', role: 'reviewer' }] })
        }
        if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      await user.type(searchInput, 'John')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/auth/users/search?q=John')
      })
    })

    it('should assign reviewer when clicked from results', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({})
      api.get.mockImplementation((url) => {
        if (url.includes('/auth/users/search')) {
          return Promise.resolve({ data: [{ id: 2, full_name: 'John Reviewer', email: 'john@test.com', role: 'reviewer' }] })
        }
        if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or email…')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by name or email…')
      await user.type(searchInput, 'John')

      await waitFor(() => {
        expect(screen.getByText('John Reviewer')).toBeInTheDocument()
      })

      await user.click(screen.getByText('John Reviewer'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/1/reviewers', {
          assignments: [{ user_id: 2, review_order: 1 }],
        })
      })
    })
  })

  describe('workflow actions', () => {
    it('should show Submit for review button in draft status', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })
    })

    it('should submit for review when button clicked', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({})

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit for review'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/1/submit-for-review', {})
      })
    })

    it('should show reviewer actions for assigned reviewers', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/1/status') return Promise.resolve({
          data: {
            ...mockStatus,
            reviewers: [{ reviewer_id: 1, reviewer_name: 'Test User', status: 'pending' }],
          },
        })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Approve review')).toBeInTheDocument()
        expect(screen.getByText('Reject review')).toBeInTheDocument()
      })
    })

    it('should approve review when clicked', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({})
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/1/status') return Promise.resolve({
          data: {
            ...mockStatus,
            reviewers: [{ reviewer_id: 1, reviewer_name: 'Test User', status: 'pending' }],
          },
        })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Approve review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Approve review'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/1/reviewers/decision', { decision: 'approved' })
      })
    })

    it('should show admin actions in approval status', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'approval' } })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      const adminUser = { id: 1, role: 'admin', email: 'admin@test.com' }
      renderWithRouter(<ContractDetailPage />, adminUser)

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument()
        expect(screen.getByText('Reject')).toBeInTheDocument()
      })
    })

    it('should show terminate button for admins', async () => {
      const adminUser = { id: 1, role: 'admin', email: 'admin@test.com' }
      renderWithRouter(<ContractDetailPage />, adminUser)

      await waitFor(() => {
        expect(screen.getByText('Terminate')).toBeInTheDocument()
      })
    })

    it('should handle action errors', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Action failed' } },
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit for review'))

      await waitFor(() => {
        expect(screen.getByText('Action failed')).toBeInTheDocument()
      })
    })

    it('should show loading state during action', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(() => new Promise(() => {}))

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Submit for review')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit for review'))

      await waitFor(() => {
        const button = screen.getByText('…')
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('reviewer display section', () => {
    it('should show assigned reviewers', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/status') return Promise.resolve({
          data: {
            ...mockStatus,
            reviewers: [
              { reviewer_id: 2, reviewer_name: 'John Reviewer', status: 'approved' },
              { reviewer_id: 3, reviewer_name: 'Jane Reviewer', status: 'pending' },
            ],
          },
        })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Legal Review')).toBeInTheDocument()
        expect(screen.getByText('John Reviewer')).toBeInTheDocument()
        expect(screen.getByText('Jane Reviewer')).toBeInTheDocument()
      })
    })

    it('should show reviewer status badges', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/status') return Promise.resolve({
          data: {
            ...mockStatus,
            reviewers: [
              { reviewer_id: 2, reviewer_name: 'John Reviewer', status: 'approved' },
            ],
          },
        })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('approved')).toBeInTheDocument()
      })
    })
  })

  describe('comments section', () => {
    it('should show AdminCommentsPanel for admins', async () => {
      const adminUser = { id: 1, role: 'admin', email: 'admin@test.com' }
      renderWithRouter(<ContractDetailPage />, adminUser)

      await waitFor(() => {
        expect(screen.getByTestId('admin-comments-panel')).toBeInTheDocument()
      })
    })

    it('should show regular comment list for non-admins', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({
          data: [
            { id: 1, user_id: 1, user_name: 'Test User', content: 'Test comment', is_resolved: false, created_at: '2024-01-15T10:00:00Z' },
          ],
        })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test comment')).toBeInTheDocument()
      })
    })

    it('should post new comment', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({})

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment…')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Add a comment…')
      await user.type(input, 'New comment')
      await user.click(screen.getByText('Post'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/1/comments', { content: 'New comment' })
      })
    })

    it('should show open comment count', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: mockContract })
        if (url === '/contracts/1/status') return Promise.resolve({ data: { ...mockStatus, open_comment_count: 3 } })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('(3 open)')).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should show error when contract load fails', async () => {
      api.get.mockRejectedValue({
        response: { data: { detail: 'Contract not found' } },
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract not found')).toBeInTheDocument()
      })
    })

    it('should show generic error without detail', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load contract')).toBeInTheDocument()
      })
    })
  })

  describe('reviewer banner', () => {
    it('should show banner for assigned reviewers', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({ data: { ...mockContract, lifecycle_status: 'review' } })
        if (url === '/contracts/1/status') return Promise.resolve({
          data: {
            ...mockStatus,
            reviewers: [{ reviewer_id: 1, reviewer_name: 'Test User', status: 'pending' }],
          },
        })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/You are assigned as a reviewer/)).toBeInTheDocument()
      })
    })

    it('should not show banner for non-reviewers', async () => {
      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.queryByText(/You are assigned as a reviewer/)).not.toBeInTheDocument()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle contract with all optional fields null', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/contracts/1') return Promise.resolve({
          data: {
            ...mockContract,
            contract_type: null,
            jurisdiction: null,
            description: null,
            counterparty_name: null,
          },
        })
        if (url === '/contracts/1/status') return Promise.resolve({ data: mockStatus })
        if (url.includes('/audit/contracts/1')) return Promise.resolve({ data: { items: mockHistory } })
        if (url === '/contracts/1/comments') return Promise.resolve({ data: mockComments })
        return Promise.resolve({ data: [] })
      })

      renderWithRouter(<ContractDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })
  })
})
