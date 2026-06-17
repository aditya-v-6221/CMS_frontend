import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import api from '../api/client'

vi.mock('../api/client')
vi.mock('../components/StatusBadge', () => ({
  default: ({ status }) => <span data-testid="status-badge">{status}</span>
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const mockContracts = [
    {
      id: 1,
      title: 'Contract 1',
      contract_type: 'NDA',
      jurisdiction: 'US',
      counterparty_name: 'Acme Corp',
      lifecycle_status: 'draft',
      expiry_date: '2025-12-31',
      original_filename: 'contract1.pdf'
    },
    {
      id: 2,
      title: 'Contract 2',
      contract_type: 'MSA',
      jurisdiction: 'EU',
      counterparty_name: 'Beta Inc',
      lifecycle_status: 'executed',
      expiry_date: '2026-06-30',
      original_filename: 'contract2.pdf'
    }
  ]

  const mockApiResponse = {
    data: {
      items: mockContracts,
      total: 2
    }
  }

  const renderDashboard = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DashboardPage />
      </MemoryRouter>
    )
  }

  describe('initial rendering', () => {
    it('should render dashboard heading', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should render all status cards', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
        expect(screen.getByText('In Review')).toBeInTheDocument()
        expect(screen.getByText('Approval')).toBeInTheDocument()
        expect(screen.getByText('Pending Sign')).toBeInTheDocument()
        expect(screen.getByText('Executed')).toBeInTheDocument()
        expect(screen.getByText('Expired')).toBeInTheDocument()
        expect(screen.getByText('Terminated')).toBeInTheDocument()
      })
    })

    it('should show placeholder (—) for status counts before counts load', () => {
      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves
      renderDashboard()

      const placeholders = screen.getAllByText('—')
      expect(placeholders.length).toBeGreaterThan(0)
    })

    it('should show loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      renderDashboard()

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
  })

  describe('API calls on mount', () => {
    it('should call API to load counts on mount', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?limit=200')
      })
    })

    it('should call API to load contracts on mount', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/contracts?'))
      })
    })

    it('should make two separate API calls (counts and contracts)', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('status counts display', () => {
    it('should display correct counts for each status', async () => {
      const countResponse = {
        data: {
          items: [
            { id: 1, lifecycle_status: 'draft' },
            { id: 2, lifecycle_status: 'draft' },
            { id: 3, lifecycle_status: 'executed' },
            { id: 4, lifecycle_status: 'review' },
            { id: 5, lifecycle_status: 'review' },
            { id: 6, lifecycle_status: 'review' }
          ],
          total: 6
        }
      }

      api.get.mockResolvedValueOnce(countResponse).mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        const draftCard = screen.getByText('Draft').closest('button')
        expect(draftCard).toHaveTextContent('2')
      })

      const reviewCard = screen.getByText('In Review').closest('button')
      expect(reviewCard).toHaveTextContent('3')

      const executedCard = screen.getByText('Executed').closest('button')
      expect(executedCard).toHaveTextContent('1')
    })

    it('should display 0 for statuses with no contracts', async () => {
      const emptyCountResponse = {
        data: {
          items: [],
          total: 0
        }
      }

      api.get.mockResolvedValue(emptyCountResponse)
      renderDashboard()

      await waitFor(() => {
        const approvalCard = screen.getByText('Approval').closest('button')
        expect(approvalCard).toHaveTextContent('0')
      })
    })

    it('should handle counts API error gracefully', async () => {
      api.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(mockApiResponse)

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
      })

      // Should still show placeholder after error
      const draftCard = screen.getByText('Draft').closest('button')
      expect(draftCard).toHaveTextContent('0')
    })
  })

  describe('contracts list rendering', () => {
    it('should display contracts after loading', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
        expect(screen.getByText('Contract 2')).toBeInTheDocument()
      })
    })

    it('should display contract details correctly', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getByText('MSA')).toBeInTheDocument()
        expect(screen.getByText('US')).toBeInTheDocument()
        expect(screen.getByText('EU')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('Beta Inc')).toBeInTheDocument()
      })
    })

    it('should display original_filename when title is not available', async () => {
      const contractWithoutTitle = {
        data: {
          items: [{
            id: 1,
            original_filename: 'document.pdf',
            contract_type: 'NDA',
            lifecycle_status: 'draft'
          }],
          total: 1
        }
      }

      api.get.mockResolvedValue(contractWithoutTitle)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument()
      })
    })

    it('should display placeholder (—) for missing contract fields', async () => {
      const incompleteContract = {
        data: {
          items: [{
            id: 1,
            title: 'Incomplete Contract',
            lifecycle_status: 'draft'
          }],
          total: 1
        }
      }

      api.get.mockResolvedValue(incompleteContract)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Incomplete Contract')).toBeInTheDocument()
      })

      const placeholders = screen.getAllByText('—')
      expect(placeholders.length).toBeGreaterThan(0)
    })

    it('should show "No contracts found" when no contracts exist', async () => {
      const emptyResponse = {
        data: {
          items: [],
          total: 0
        }
      }

      api.get.mockResolvedValue(emptyResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('No contracts found')).toBeInTheDocument()
      })
    })

    it('should display correct total count with singular form', async () => {
      const singleContract = {
        data: {
          items: [mockContracts[0]],
          total: 1
        }
      }

      api.get.mockResolvedValue(singleContract)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('1 contract')).toBeInTheDocument()
      })
    })

    it('should display correct total count with plural form', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('2 contracts')).toBeInTheDocument()
      })
    })
  })

  describe('status filter cards interaction', () => {
    it('should filter contracts when status card is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      const draftCard = screen.getByText('Draft').closest('button')
      await user.click(draftCard)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('lifecycle_status=draft')
        )
      })
    })

    it('should toggle filter off when clicking same status card again', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard('/dashboard?status=draft')

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      const draftCard = screen.getByText('Draft').closest('button')
      await user.click(draftCard)

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).not.toContain('lifecycle_status=draft')
      })
    })

    it('should highlight selected status card with ring styling', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard('/dashboard?status=executed')

      await waitFor(() => {
        const executedCard = screen.getByText('Executed').closest('button')
        expect(executedCard).toHaveClass('ring-2', 'ring-indigo-300')
      })
    })

    it('should reset page to 0 when status filter changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      const draftCard = screen.getByText('Draft').closest('button')
      await user.click(draftCard)

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).toContain('skip=0')
      })
    })
  })

  describe('filter dropdowns', () => {
    it('should render all filter dropdowns', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument()
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
        expect(screen.getByDisplayValue('All jurisdictions')).toBeInTheDocument()
      })
    })

    it('should filter by contract type', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('contract_type=NDA')
        )
      })
    })

    it('should filter by jurisdiction', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All jurisdictions')).toBeInTheDocument()
      })

      const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')
      await user.selectOptions(jurisdictionSelect, 'US')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('jurisdiction=US')
        )
      })
    })

    it('should filter by status from dropdown', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument()
      })

      const statusSelect = screen.getByDisplayValue('All statuses')
      await user.selectOptions(statusSelect, 'executed')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('lifecycle_status=executed')
        )
      })
    })

    it('should filter by counterparty text input', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Counterparty…')).toBeInTheDocument()
      })

      const counterpartyInput = screen.getByPlaceholderText('Counterparty…')
      await user.type(counterpartyInput, 'Acme')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('counterparty=Acme')
        )
      })
    })

    it('should combine multiple filters', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')

      const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')
      await user.selectOptions(jurisdictionSelect, 'US')

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).toContain('contract_type=NDA')
        expect(lastCall).toContain('jurisdiction=US')
      })
    })

    it('should clear filter when selecting empty option', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard('/dashboard?type=NDA')

      await waitFor(() => {
        expect(screen.getByDisplayValue('NDA')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('NDA')
      await user.selectOptions(typeSelect, '')

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).not.toContain('contract_type=')
      })
    })

    it('should display active filter in status text', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard('/dashboard?status=executed')

      await waitFor(() => {
        expect(screen.getByText(/2 contracts · executed/)).toBeInTheDocument()
      })
    })

    it('should reset page to 0 when filter changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'MSA')

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).toContain('skip=0')
      })
    })
  })

  describe('pagination', () => {
    it('should not show pagination when total is less than or equal to limit', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
      })

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('should show pagination when total exceeds limit', async () => {
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })

    it('should disable Previous button on first page', async () => {
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        const prevButton = screen.getByText('Previous')
        expect(prevButton).toBeDisabled()
      })
    })

    it('should enable Next button when more pages exist', async () => {
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        const nextButton = screen.getByText('Next')
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should load next page when Next is clicked', async () => {
      const user = userEvent.setup()
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('skip=20')
        )
      })
    })

    it('should load previous page when Previous is clicked', async () => {
      const user = userEvent.setup()
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      // Go to page 2
      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        const prevButton = screen.getByText('Previous')
        expect(prevButton).not.toBeDisabled()
      })

      // Go back to page 1
      await user.click(screen.getByText('Previous'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('skip=0')
        )
      })
    })

    it('should disable Next button on last page', async () => {
      const user = userEvent.setup()
      const lastPageResponse = {
        data: {
          items: mockContracts,
          total: 21 // Just one item on page 2
        }
      }

      api.get.mockResolvedValue(lastPageResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        const nextButton = screen.getByText('Next')
        expect(nextButton).toBeDisabled()
      })
    })

    it('should display correct pagination info text', async () => {
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Showing 1–20 of 50')).toBeInTheDocument()
      })
    })

    it('should update pagination info on page change', async () => {
      const user = userEvent.setup()
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 21–40 of 50')).toBeInTheDocument()
      })
    })

    it('should handle last page with fewer items correctly', async () => {
      const user = userEvent.setup()
      const partialLastPage = {
        data: {
          items: [mockContracts[0]],
          total: 25
        }
      }

      api.get.mockResolvedValue(partialLastPage)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument()
      })
    })
  })

  describe('contract links', () => {
    it('should render links to contract detail pages', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        const link1 = screen.getByText('Contract 1').closest('a')
        expect(link1).toHaveAttribute('href', '/contracts/1')

        const link2 = screen.getByText('Contract 2').closest('a')
        expect(link2).toHaveAttribute('href', '/contracts/2')
      })
    })
  })

  describe('loading states', () => {
    it('should show loading state while fetching contracts', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      renderDashboard()

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should hide loading state after data loads', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should show loading state when filters change', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
      })

      api.get.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(mockApiResponse), 100)
      }))

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should show loading state when page changes', async () => {
      const user = userEvent.setup()
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      api.get.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(largeResponse), 100)
      }))

      await user.click(screen.getByText('Next'))

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should handle API error for contracts gracefully', async () => {
      api.get
        .mockResolvedValueOnce(mockApiResponse) // counts
        .mockRejectedValueOnce(new Error('API Error')) // contracts

      renderDashboard()

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      api.get.mockRejectedValue(new Error('Network error'))
      renderDashboard()

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should handle malformed API response', async () => {
      api.get.mockResolvedValue({ data: {} })
      renderDashboard()

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty contract array', async () => {
      const emptyResponse = {
        data: {
          items: [],
          total: 0
        }
      }

      api.get.mockResolvedValue(emptyResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('No contracts found')).toBeInTheDocument()
        expect(screen.getByText('0 contracts')).toBeInTheDocument()
      })
    })

    it('should handle contracts with null values', async () => {
      const nullContract = {
        data: {
          items: [{
            id: 1,
            title: null,
            contract_type: null,
            jurisdiction: null,
            counterparty_name: null,
            lifecycle_status: 'draft',
            expiry_date: null,
            original_filename: 'file.pdf'
          }],
          total: 1
        }
      }

      api.get.mockResolvedValue(nullContract)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('file.pdf')).toBeInTheDocument()
      })

      const placeholders = screen.getAllByText('—')
      expect(placeholders.length).toBeGreaterThan(0)
    })

    it('should handle contracts with undefined values', async () => {
      const undefinedContract = {
        data: {
          items: [{
            id: 1,
            original_filename: 'test.pdf',
            lifecycle_status: 'draft'
          }],
          total: 1
        }
      }

      api.get.mockResolvedValue(undefinedContract)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })
    })

    it('should handle contracts with empty strings', async () => {
      const emptyStringContract = {
        data: {
          items: [{
            id: 1,
            title: '',
            contract_type: '',
            jurisdiction: '',
            counterparty_name: '',
            lifecycle_status: 'draft',
            expiry_date: '',
            original_filename: 'empty.pdf'
          }],
          total: 1
        }
      }

      api.get.mockResolvedValue(emptyStringContract)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('empty.pdf')).toBeInTheDocument()
      })
    })

    it('should handle very long counterparty names', async () => {
      const longNameContract = {
        data: {
          items: [{
            id: 1,
            title: 'Test',
            counterparty_name: 'A'.repeat(200),
            lifecycle_status: 'draft',
            original_filename: 'test.pdf'
          }],
          total: 1
        }
      }

      api.get.mockResolvedValue(longNameContract)
      renderDashboard()

      await waitFor(() => {
        const counterparty = screen.getByText('A'.repeat(200))
        expect(counterparty).toHaveClass('truncate', 'max-w-xs')
      })
    })

    it('should handle zero total with empty items array', async () => {
      const zeroResponse = {
        data: {
          items: [],
          total: 0
        }
      }

      api.get.mockResolvedValue(zeroResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('0 contracts')).toBeInTheDocument()
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      })
    })

    it('should handle exactly 20 contracts (boundary)', async () => {
      const exactLimitResponse = {
        data: {
          items: Array(20).fill(mockContracts[0]).map((c, i) => ({ ...c, id: i + 1 })),
          total: 20
        }
      }

      api.get.mockResolvedValue(exactLimitResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('should handle exactly 21 contracts (one over limit)', async () => {
      const overLimitResponse = {
        data: {
          items: Array(20).fill(mockContracts[0]).map((c, i) => ({ ...c, id: i + 1 })),
          total: 21
        }
      }

      api.get.mockResolvedValue(overLimitResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })

    it('should handle contract with special characters in title', async () => {
      const specialCharContract = {
        data: {
          items: [{
            id: 1,
            title: 'Test <script>alert("xss")</script> & Co.',
            lifecycle_status: 'draft',
            original_filename: 'test.pdf'
          }],
          total: 1
        }
      }

      api.get.mockResolvedValue(specialCharContract)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText(/Test.*script.*alert.*xss.*script.*& Co\./)).toBeInTheDocument()
      })
    })

    it('should handle URL parameters on initial load', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard('/dashboard?status=executed&type=NDA&jurisdiction=US&counterparty=Acme')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringMatching(/lifecycle_status=executed.*contract_type=NDA.*jurisdiction=US.*counterparty=Acme/)
        )
      })
    })

    it('should handle rapid filter changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')

      // Rapid changes
      await user.selectOptions(typeSelect, 'NDA')
      await user.selectOptions(typeSelect, 'MSA')
      await user.selectOptions(typeSelect, 'SLA')

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).toContain('contract_type=SLA')
      })
    })

    it('should handle counterparty input with special URL characters', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Counterparty…')).toBeInTheDocument()
      })

      const counterpartyInput = screen.getByPlaceholderText('Counterparty…')
      await user.type(counterpartyInput, 'A&B Corp?')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('counterparty=A%26B+Corp%3F')
        )
      })
    })
  })

  describe('status badge rendering', () => {
    it('should render StatusBadge component for each contract', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        const badges = screen.getAllByTestId('status-badge')
        expect(badges.length).toBe(2)
      })
    })

    it('should pass correct status to StatusBadge', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('draft')).toBeInTheDocument()
        expect(screen.getByText('executed')).toBeInTheDocument()
      })
    })
  })

  describe('filter interaction with URL params', () => {
    it('should update URL params when filters change', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')

      // The component uses setSearchParams which should update the URL
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('contract_type=NDA')
        )
      })
    })

    it('should remove URL param when filter is cleared', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard('/dashboard?type=NDA')

      await waitFor(() => {
        expect(screen.getByDisplayValue('NDA')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('NDA')
      await user.selectOptions(typeSelect, '')

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).not.toContain('contract_type')
      })
    })
  })

  describe('table structure', () => {
    it('should render table with correct headers', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('TITLE')).toBeInTheDocument()
        expect(screen.getByText('TYPE')).toBeInTheDocument()
        expect(screen.getByText('JURISDICTION')).toBeInTheDocument()
        expect(screen.getByText('COUNTERPARTY')).toBeInTheDocument()
        expect(screen.getByText('STATUS')).toBeInTheDocument()
        expect(screen.getByText('EXPIRY')).toBeInTheDocument()
      })
    })

    it('should render table rows with hover styling', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        const row = screen.getByText('Contract 1').closest('tr')
        expect(row).toHaveClass('hover:bg-gray-50')
      })
    })
  })

  describe('API parameter construction', () => {
    it('should include skip and limit parameters', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringMatching(/skip=0.*limit=20/)
        )
      })
    })

    it('should not include empty filters in API call', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        const contractCall = api.get.mock.calls.find(call =>
          call[0].includes('skip=') && call[0].includes('limit=')
        )
        expect(contractCall[0]).not.toContain('lifecycle_status=&')
        expect(contractCall[0]).not.toContain('contract_type=&')
      })
    })

    it('should include all active filters in API call', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard('/dashboard?status=executed&type=NDA&jurisdiction=US&counterparty=Acme')

      await waitFor(() => {
        const contractCall = api.get.mock.calls.find(call =>
          call[0].includes('skip=') && call[0].includes('limit=')
        )
        expect(contractCall[0]).toContain('lifecycle_status=executed')
        expect(contractCall[0]).toContain('contract_type=NDA')
        expect(contractCall[0]).toContain('jurisdiction=US')
        expect(contractCall[0]).toContain('counterparty=Acme')
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper table structure for screen readers', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()
      })
    })

    it('should have accessible filter controls', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBe(3)
      })
    })

    it('should have accessible pagination buttons', async () => {
      const largeResponse = {
        data: {
          items: mockContracts,
          total: 50
        }
      }

      api.get.mockResolvedValue(largeResponse)
      renderDashboard()

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /previous|next/i })
        expect(buttons.length).toBe(2)
      })
    })
  })

  describe('concurrent requests', () => {
    it('should handle multiple simultaneous filter changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue(mockApiResponse)
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')

      // Make multiple changes quickly
      await user.selectOptions(typeSelect, 'NDA')
      await user.selectOptions(jurisdictionSelect, 'US')

      await waitFor(() => {
        const calls = api.get.mock.calls
        expect(calls.length).toBeGreaterThan(2)
      })
    })
  })

  describe('data refresh on URL change', () => {
    it('should reload contracts when searchParams change', async () => {
      api.get.mockResolvedValue(mockApiResponse)
      const { rerender } = renderDashboard('/dashboard')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2) // counts + contracts
      })

      // Simulate URL change (searchParams changes trigger useEffect)
      rerender(
        <MemoryRouter initialEntries={['/dashboard?status=executed']}>
          <DashboardPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('lifecycle_status=executed')
        )
      })
    })
  })
})
