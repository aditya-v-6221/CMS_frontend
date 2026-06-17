import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import ContractsPage from './ContractsPage'
import api from '../api/client'
import { AuthProvider } from '../context/AuthContext'

// Mock dependencies
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock('../components/StatusBadge', () => ({
  default: ({ status }) => <span data-testid="status-badge">{status}</span>,
}))

// Helper to render with all required providers
const renderWithProviders = (ui, { route = '/contracts', user = null } = {}) => {
  // Mock localStorage for AuthContext
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  )

  return render(ui, { wrapper: Wrapper })
}

describe('ContractsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initial Rendering', () => {
    it('renders the page with loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves
      renderWithProviders(<ContractsPage />)

      expect(screen.getByText('Contracts')).toBeInTheDocument()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('renders the page title with total count', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 42 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText(/\(42\)/)).toBeInTheDocument()
      })
    })

    it('renders all filter dropdowns and counterparty input', () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All jurisdictions')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Counterparty…')).toBeInTheDocument()
    })

    it('shows upload button for editor role', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        user: { role: 'editor', id: 1, username: 'editor' },
      })

      await waitFor(() => {
        expect(screen.getByText('+ Upload contract')).toBeInTheDocument()
      })
    })

    it('shows upload button for admin role', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        user: { role: 'admin', id: 1, username: 'admin' },
      })

      await waitFor(() => {
        expect(screen.getByText('+ Upload contract')).toBeInTheDocument()
      })
    })

    it('does not show upload button for viewer role', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        user: { role: 'viewer', id: 1, username: 'viewer' },
      })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })

    it('does not show upload button when user is null', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, { user: null })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })

    it('does not show upload button when user is undefined', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, { user: undefined })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })
  })

  describe('API Calls', () => {
    it('calls API with correct default parameters', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=0&limit=20')
      })
    })

    it('calls API with filters from URL search params', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        route: '/contracts?status=draft&type=NDA&jurisdiction=US&counterparty=Acme',
      })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('lifecycle_status=draft')
        )
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('contract_type=NDA')
        )
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('jurisdiction=US')
        )
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('counterparty=Acme')
        )
      })
    })

    it('handles API success with contracts data', async () => {
      const mockContracts = [
        {
          id: 1,
          title: 'Test Contract 1',
          contract_type: 'NDA',
          jurisdiction: 'US',
          counterparty_name: 'Acme Corp',
          lifecycle_status: 'draft',
          expiry_date: '2026-12-31',
        },
        {
          id: 2,
          title: 'Test Contract 2',
          contract_type: 'MSA',
          jurisdiction: 'EU',
          counterparty_name: 'Beta Ltd',
          lifecycle_status: 'executed',
          expiry_date: '2027-01-15',
        },
      ]

      api.get.mockResolvedValueOnce({
        data: { items: mockContracts, total: 2 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract 1')).toBeInTheDocument()
        expect(screen.getByText('Test Contract 2')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('Beta Ltd')).toBeInTheDocument()
      })
    })

    it('handles API error gracefully', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'))

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Component should still show empty state after error
      expect(screen.getByText('No contracts found')).toBeInTheDocument()
    })

    it('sets loading to false even when API throws', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'))

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('shows "No contracts found" when items array is empty', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts found')).toBeInTheDocument()
      })
    })

    it('shows table when contracts exist', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Contract 1',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.queryByText('No contracts found')).not.toBeInTheDocument()
      })
    })
  })

  describe('Table Rendering', () => {
    it('renders table headers correctly', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
        expect(screen.getByText('Type')).toBeInTheDocument()
        expect(screen.getByText('Jurisdiction')).toBeInTheDocument()
        expect(screen.getByText('Counterparty')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Expiry')).toBeInTheDocument()
      })
    })

    it('renders contract with title', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'My Contract Title',
              original_filename: 'contract.pdf',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('My Contract Title')).toBeInTheDocument()
      })
    })

    it('renders contract with original_filename when title is null', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: null,
              original_filename: 'contract.pdf',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('contract.pdf')).toBeInTheDocument()
      })
    })

    it('renders contract with original_filename when title is empty string', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: '',
              original_filename: 'document.pdf',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument()
      })
    })

    it('renders em dash when contract_type is null', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: null,
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
      })
    })

    it('renders em dash when jurisdiction is empty', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: 'NDA',
              jurisdiction: '',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
      })
    })

    it('renders em dash when counterparty_name is undefined', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: undefined,
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
      })
    })

    it('renders em dash when expiry_date is null', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: null,
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
      })
    })

    it('renders StatusBadge with correct status', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'executed',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const badge = screen.getByTestId('status-badge')
        expect(badge).toHaveTextContent('executed')
      })
    })

    it('renders correct link for each contract row', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 123,
              title: 'Contract Link Test',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const link = screen.getByText('Contract Link Test')
        expect(link).toHaveAttribute('href', '/contracts/123')
      })
    })

    it('renders multiple contracts correctly', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Contract 1',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
            {
              id: 2,
              title: 'Contract 2',
              contract_type: 'MSA',
              jurisdiction: 'EU',
              counterparty_name: 'Beta',
              lifecycle_status: 'executed',
              expiry_date: '2027-01-15',
            },
            {
              id: 3,
              title: 'Contract 3',
              contract_type: 'SLA',
              jurisdiction: 'APAC',
              counterparty_name: 'Gamma',
              lifecycle_status: 'review',
              expiry_date: '2026-06-30',
            },
          ],
          total: 3,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
        expect(screen.getByText('Contract 2')).toBeInTheDocument()
        expect(screen.getByText('Contract 3')).toBeInTheDocument()
      })
    })
  })

  describe('Filter Interactions', () => {
    it('updates status filter when dropdown changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const statusSelect = screen.getByDisplayValue('All statuses')
      await user.selectOptions(statusSelect, 'draft')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('lifecycle_status=draft')
        )
      })
    })

    it('updates type filter when dropdown changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('contract_type=NDA')
        )
      })
    })

    it('updates jurisdiction filter when dropdown changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')
      await user.selectOptions(jurisdictionSelect, 'US')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('jurisdiction=US')
        )
      })
    })

    it('updates counterparty filter when input changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const counterpartyInput = screen.getByPlaceholderText('Counterparty…')
      await user.type(counterpartyInput, 'Acme Corp')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('counterparty=Acme%20Corp')
        )
      })
    })

    it('resets page to 0 when filter changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      // Go to page 2
      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('skip=20')
        )
      })

      // Change filter - should reset to page 0
      const statusSelect = screen.getByDisplayValue('All statuses')
      await user.selectOptions(statusSelect, 'draft')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('skip=0')
        )
      })
    })

    it('removes filter from URL when selecting empty option', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        route: '/contracts?status=draft',
      })

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const statusSelect = screen.getByDisplayValue('draft')
      await user.selectOptions(statusSelect, '')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=0&limit=20')
      })
    })

    it('handles multiple filters simultaneously', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('All statuses'), 'executed')
      await user.selectOptions(screen.getByDisplayValue('All types'), 'MSA')
      await user.selectOptions(screen.getByDisplayValue('All jurisdictions'), 'EU')
      await user.type(screen.getByPlaceholderText('Counterparty…'), 'Beta')

      await waitFor(() => {
        const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1][0]
        expect(lastCall).toContain('lifecycle_status=executed')
        expect(lastCall).toContain('contract_type=MSA')
        expect(lastCall).toContain('jurisdiction=EU')
        expect(lastCall).toContain('counterparty=Beta')
      })
    })
  })

  describe('Pagination', () => {
    it('does not show pagination when total is less than or equal to limit', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 10,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('shows pagination when total exceeds limit', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
        expect(screen.getByText('Showing 1–20 of 50')).toBeInTheDocument()
      })
    })

    it('disables Previous button on first page', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const previousButton = screen.getByText('Previous')
        expect(previousButton).toBeDisabled()
      })
    })

    it('enables Next button when more pages available', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const nextButton = screen.getByText('Next')
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('navigates to next page when Next is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Showing 1–20 of 50')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('skip=20')
        )
        expect(screen.getByText('Showing 21–40 of 50')).toBeInTheDocument()
      })
    })

    it('navigates to previous page when Previous is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      // Go to page 2
      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 21–40 of 50')).toBeInTheDocument()
      })

      // Go back to page 1
      await user.click(screen.getByText('Previous'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('skip=0')
        )
        expect(screen.getByText('Showing 1–20 of 50')).toBeInTheDocument()
      })
    })

    it('disables Next button on last page', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 10 }, (_, i) => ({
            id: i + 41,
            title: `Contract ${i + 41}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />, {
        route: '/contracts',
      })

      // Manually navigate to page 3 by calling setPage
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Click Next twice to get to last page
      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 21,
            title: `Contract ${i + 21}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 21–40 of 50')).toBeInTheDocument()
      })

      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 10 }, (_, i) => ({
            id: i + 41,
            title: `Contract ${i + 41}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 41–50 of 50')).toBeInTheDocument()
        const nextButton = screen.getByText('Next')
        expect(nextButton).toBeDisabled()
      })
    })

    it('shows correct range on last page with partial results', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 7 }, (_, i) => ({
            id: i + 41,
            title: `Contract ${i + 41}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 47,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const user = userEvent.setup()

      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 21,
            title: `Contract ${i + 21}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 47,
        },
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 21–40 of 47')).toBeInTheDocument()
      })

      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 7 }, (_, i) => ({
            id: i + 41,
            title: `Contract ${i + 41}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 47,
        },
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 41–47 of 47')).toBeInTheDocument()
      })
    })

    it('pagination appears only when total > 20', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 20,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('pagination appears when total = 21', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 21,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
        expect(screen.getByText('Showing 1–20 of 21')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles contracts with all null/undefined fields', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: null,
              original_filename: null,
              contract_type: null,
              jurisdiction: null,
              counterparty_name: null,
              lifecycle_status: null,
              expiry_date: null,
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    it('handles very long counterparty names', async () => {
      const longName = 'A'.repeat(200)
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: longName,
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument()
      })
    })

    it('handles special characters in filter inputs', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const counterpartyInput = screen.getByPlaceholderText('Counterparty…')
      await user.type(counterpartyInput, 'Company & Co. "Ltd"')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('counterparty=')
        )
      })
    })

    it('handles rapid filter changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const statusSelect = screen.getByDisplayValue('All statuses')

      // Rapidly change filters
      await user.selectOptions(statusSelect, 'draft')
      await user.selectOptions(statusSelect, 'review')
      await user.selectOptions(statusSelect, 'executed')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled()
      })
    })

    it('handles empty string in all filter fields', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        route: '/contracts?status=&type=&jurisdiction=&counterparty=',
      })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=0&limit=20')
      })
    })

    it('handles total of 0 with pagination hidden', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText(/\(0\)/)).toBeInTheDocument()
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('handles contracts array with single item', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Single Contract',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Single Contract')).toBeInTheDocument()
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      })
    })

    it('handles user with unknown role', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        user: { role: 'guest', id: 1, username: 'guest' },
      })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })

    it('handles user without role field', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        user: { id: 1, username: 'norole' },
      })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation Links', () => {
    it('upload button links to correct route', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        user: { role: 'admin', id: 1, username: 'admin' },
      })

      await waitFor(() => {
        const uploadLink = screen.getByText('+ Upload contract')
        expect(uploadLink).toHaveAttribute('href', '/contracts/upload')
      })
    })

    it('contract title links to detail page with correct id', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 999,
              title: 'Test Contract',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const contractLink = screen.getByText('Test Contract')
        expect(contractLink).toHaveAttribute('href', '/contracts/999')
      })
    })
  })

  describe('Filter Dropdowns Content', () => {
    it('renders all status options', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const statusSelect = screen.getByDisplayValue('All statuses')
        const options = within(statusSelect).getAllByRole('option')

        expect(options).toHaveLength(8)
        expect(options[0]).toHaveTextContent('All statuses')
        expect(options[1]).toHaveTextContent('draft')
        expect(options[2]).toHaveTextContent('review')
        expect(options[3]).toHaveTextContent('approval')
        expect(options[4]).toHaveTextContent('pending_signature')
        expect(options[5]).toHaveTextContent('executed')
        expect(options[6]).toHaveTextContent('expired')
        expect(options[7]).toHaveTextContent('terminated')
      })
    })

    it('renders all type options', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const typeSelect = screen.getByDisplayValue('All types')
        const options = within(typeSelect).getAllByRole('option')

        expect(options).toHaveLength(9)
        expect(options[0]).toHaveTextContent('All types')
        expect(options[1]).toHaveTextContent('NDA')
        expect(options[2]).toHaveTextContent('MSA')
        expect(options[3]).toHaveTextContent('SLA')
        expect(options[4]).toHaveTextContent('SOW')
        expect(options[5]).toHaveTextContent('Employment')
        expect(options[6]).toHaveTextContent('Vendor')
        expect(options[7]).toHaveTextContent('Partnership')
        expect(options[8]).toHaveTextContent('Other')
      })
    })

    it('renders all jurisdiction options', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')
        const options = within(jurisdictionSelect).getAllByRole('option')

        expect(options).toHaveLength(5)
        expect(options[0]).toHaveTextContent('All jurisdictions')
        expect(options[1]).toHaveTextContent('IN')
        expect(options[2]).toHaveTextContent('EU')
        expect(options[3]).toHaveTextContent('US')
        expect(options[4]).toHaveTextContent('APAC')
      })
    })
  })

  describe('Loading State Transitions', () => {
    it('shows loading initially then shows data', async () => {
      let resolvePromise
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      api.get.mockReturnValueOnce(promise)

      renderWithProviders(<ContractsPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()

      resolvePromise({
        data: {
          items: [
            {
              id: 1,
              title: 'Test',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
        expect(screen.getByText('Test')).toBeInTheDocument()
      })
    })

    it('shows loading when changing pages', async () => {
      const user = userEvent.setup()

      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      let resolvePromise
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      api.get.mockReturnValueOnce(promise)

      await user.click(screen.getByText('Next'))

      expect(screen.getByText('Loading…')).toBeInTheDocument()

      resolvePromise({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 21,
            title: `Contract ${i + 21}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })
  })

  describe('URL Search Params Sync', () => {
    it('initializes filters from URL params', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        route: '/contracts?status=executed&type=MSA&jurisdiction=EU&counterparty=TestCorp',
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('executed')).toBeInTheDocument()
        expect(screen.getByDisplayValue('MSA')).toBeInTheDocument()
        expect(screen.getByDisplayValue('EU')).toBeInTheDocument()
        expect(screen.getByDisplayValue('TestCorp')).toBeInTheDocument()
      })
    })

    it('handles partial URL params', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        route: '/contracts?status=draft',
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('draft')).toBeInTheDocument()
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
        expect(screen.getByDisplayValue('All jurisdictions')).toBeInTheDocument()
      })
    })

    it('handles URL params with encoded characters', async () => {
      api.get.mockResolvedValueOnce({
        data: { items: [], total: 0 },
      })

      renderWithProviders(<ContractsPage />, {
        route: '/contracts?counterparty=Company%20%26%20Co',
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Company & Co')).toBeInTheDocument()
      })
    })
  })

  describe('Reloading Behavior', () => {
    it('reloads data when URL search params change', async () => {
      api.get.mockResolvedValue({
        data: { items: [], total: 0 },
      })

      const { rerender } = renderWithProviders(<ContractsPage />, {
        route: '/contracts',
      })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1)
      })

      // Simulate changing URL params
      renderWithProviders(<ContractsPage />, {
        route: '/contracts?status=draft',
      })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('lifecycle_status=draft')
        )
      })
    })

    it('reloads data when page changes', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 50,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Boundary Value Testing', () => {
    it('handles exactly 20 contracts (boundary of pagination)', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 20,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('handles 21 contracts (just over pagination boundary)', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 21,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })

    it('handles 19 contracts (just under pagination boundary)', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 19 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 19,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('handles 1 contract (minimum boundary)', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              title: 'Single Contract',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme',
              lifecycle_status: 'draft',
              expiry_date: '2026-12-31',
            },
          ],
          total: 1,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Single Contract')).toBeInTheDocument()
        expect(screen.getByText(/\(1\)/)).toBeInTheDocument()
      })
    })

    it('handles very large total count', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Contract ${i + 1}`,
            contract_type: 'NDA',
            jurisdiction: 'US',
            counterparty_name: 'Acme',
            lifecycle_status: 'draft',
            expiry_date: '2026-12-31',
          })),
          total: 10000,
        },
      })

      renderWithProviders(<ContractsPage />)

      await waitFor(() => {
        expect(screen.getByText('Showing 1–20 of 10000')).toBeInTheDocument()
      })
    })
  })
})
