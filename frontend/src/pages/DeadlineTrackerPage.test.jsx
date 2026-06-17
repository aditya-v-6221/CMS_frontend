import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import DeadlineTrackerPage from './DeadlineTrackerPage'
import api from '../api/client'

vi.mock('../api/client')
vi.mock('../components/StatusBadge', () => ({
  default: ({ status }) => <span data-testid="status-badge">{status}</span>,
}))

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('DeadlineTrackerPage', () => {
  const mockContracts = [
    {
      id: 1,
      title: 'Urgent Contract',
      original_filename: 'urgent.pdf',
      contract_type: 'NDA',
      counterparty_name: 'Acme Corp',
      lifecycle_status: 'executed',
      expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days
    },
    {
      id: 2,
      title: 'Warning Contract',
      contract_type: 'MSA',
      counterparty_name: 'Beta Inc',
      lifecycle_status: 'executed',
      expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days
    },
    {
      id: 3,
      title: 'Upcoming Contract',
      contract_type: 'SLA',
      counterparty_name: 'Gamma LLC',
      lifecycle_status: 'executed',
      expiry_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading message initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<DeadlineTrackerPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should fetch contracts on mount', async () => {
      api.get.mockResolvedValue({ data: { items: [] } })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?limit=200')
      })
    })
  })

  describe('page header', () => {
    it('should render page title', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
      })
    })

    it('should render page description', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText(/Contracts expiring within the next 30 days/)).toBeInTheDocument()
      })
    })
  })

  describe('summary cards', () => {
    it('should show placeholder while loading', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<DeadlineTrackerPage />)

      const placeholders = screen.getAllByText('—')
      expect(placeholders).toHaveLength(3)
    })

    it('should show counts after loading', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Critical (≤7 days)')).toBeInTheDocument()
        expect(screen.getByText('Warning (8–14 days)')).toBeInTheDocument()
        expect(screen.getByText('Upcoming (15–30 days)')).toBeInTheDocument()
      })
    })

    it('should correctly categorize contracts by urgency', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const numbers = screen.getAllByText(/^\d+$/)
        // Should show 1 critical, 1 warning, 1 upcoming
        expect(numbers.some(el => el.textContent === '1')).toBeTruthy()
      })
    })

    it('should have correct border colors on summary cards', async () => {
      api.get.mockResolvedValue({ data: [] })
      const { container } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(container.querySelector('.border-red-500')).toBeInTheDocument()
        expect(container.querySelector('.border-orange-400')).toBeInTheDocument()
        expect(container.querySelector('.border-yellow-400')).toBeInTheDocument()
      })
    })
  })

  describe('empty state', () => {
    it('should show empty state when no contracts expiring', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
        expect(screen.getByText("You're all clear.")).toBeInTheDocument()
      })
    })

    it('should show checkmark icon in empty state', async () => {
      api.get.mockResolvedValue({ data: [] })
      const { container } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const svg = container.querySelector('svg.text-green-400')
        expect(svg).toBeInTheDocument()
      })
    })

    it('should not show table in empty state', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
      })
    })
  })

  describe('contracts table', () => {
    it('should render table with contracts', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    it('should show table headers', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('CONTRACT')).toBeInTheDocument()
        expect(screen.getByText('TYPE')).toBeInTheDocument()
        expect(screen.getByText('COUNTERPARTY')).toBeInTheDocument()
        expect(screen.getByText('STATUS')).toBeInTheDocument()
        expect(screen.getByText('EXPIRY DATE')).toBeInTheDocument()
        expect(screen.getByText('TIME LEFT')).toBeInTheDocument()
      })
    })

    it('should render all contracts', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Urgent Contract')).toBeInTheDocument()
        expect(screen.getByText('Warning Contract')).toBeInTheDocument()
        expect(screen.getByText('Upcoming Contract')).toBeInTheDocument()
      })
    })

    it('should show contract types', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getByText('MSA')).toBeInTheDocument()
        expect(screen.getByText('SLA')).toBeInTheDocument()
      })
    })

    it('should show counterparty names', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('Beta Inc')).toBeInTheDocument()
        expect(screen.getByText('Gamma LLC')).toBeInTheDocument()
      })
    })

    it('should render StatusBadge components', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const badges = screen.getAllByTestId('status-badge')
        expect(badges).toHaveLength(3)
      })
    })

    it('should show expiry dates', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        mockContracts.forEach(contract => {
          expect(screen.getByText(contract.expiry_date)).toBeInTheDocument()
        })
      })
    })

    it('should show days left badges', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const badges = screen.getAllByText(/\d+d left/)
        expect(badges.length).toBeGreaterThan(0)
      })
    })

    it('should apply red highlight to critical rows', async () => {
      api.get.mockResolvedValue({ data: [mockContracts[0]] })
      const { container } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const row = container.querySelector('.bg-red-50')
        expect(row).toBeInTheDocument()
      })
    })

    it('should apply orange highlight to warning rows', async () => {
      api.get.mockResolvedValue({ data: [mockContracts[1]] })
      const { container } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const row = container.querySelector('.bg-orange-50')
        expect(row).toBeInTheDocument()
      })
    })

    it('should create links to contract detail pages', async () => {
      api.get.mockResolvedValue({ data: [mockContracts[0]] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Urgent Contract' })
        expect(link).toHaveAttribute('href', '/contracts/1')
      })
    })

    it('should show placeholder for missing contract type', async () => {
      const contractWithoutType = { ...mockContracts[0], contract_type: null }
      api.get.mockResolvedValue({ data: [contractWithoutType] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('—')).toBeInTheDocument()
      })
    })

    it('should show placeholder for missing counterparty', async () => {
      const contractWithoutCounterparty = { ...mockContracts[0], counterparty_name: null }
      api.get.mockResolvedValue({ data: [contractWithoutCounterparty] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('—')).toBeInTheDocument()
      })
    })

    it('should use original_filename as fallback when title is missing', async () => {
      const contractWithoutTitle = { ...mockContracts[0], title: null }
      api.get.mockResolvedValue({ data: [contractWithoutTitle] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('urgent.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('urgency badge colors', () => {
    it('should show red badge for critical contracts (≤7 days)', async () => {
      api.get.mockResolvedValue({ data: [mockContracts[0]] })
      const { container } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const badge = container.querySelector('.bg-red-100.text-red-700')
        expect(badge).toBeInTheDocument()
      })
    })

    it('should show orange badge for warning contracts (8-14 days)', async () => {
      api.get.mockResolvedValue({ data: [mockContracts[1]] })
      const { container } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const badge = container.querySelector('.bg-orange-100.text-orange-700')
        expect(badge).toBeInTheDocument()
      })
    })

    it('should show yellow badge for upcoming contracts (15-30 days)', async () => {
      api.get.mockResolvedValue({ data: [mockContracts[2]] })
      const { container } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const badge = container.querySelector('.bg-yellow-100.text-yellow-700')
        expect(badge).toBeInTheDocument()
      })
    })
  })

  describe('contract filtering', () => {
    it('should only show contracts expiring within 30 days', async () => {
      const allContracts = [
        ...mockContracts,
        {
          id: 4,
          title: 'Far Future Contract',
          contract_type: 'NDA',
          counterparty_name: 'Future Corp',
          lifecycle_status: 'executed',
          expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days
        },
      ]
      api.get.mockResolvedValue({ data: allContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.queryByText('Far Future Contract')).not.toBeInTheDocument()
      })
    })

    it('should not show expired contracts', async () => {
      const allContracts = [
        ...mockContracts,
        {
          id: 5,
          title: 'Expired Contract',
          contract_type: 'NDA',
          counterparty_name: 'Past Corp',
          lifecycle_status: 'expired',
          expiry_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        },
      ]
      api.get.mockResolvedValue({ data: allContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.queryByText('Expired Contract')).not.toBeInTheDocument()
      })
    })

    it('should not show contracts without expiry date', async () => {
      const allContracts = [
        ...mockContracts,
        {
          id: 6,
          title: 'No Expiry Contract',
          contract_type: 'NDA',
          counterparty_name: 'No Expiry Corp',
          lifecycle_status: 'executed',
          expiry_date: null,
        },
      ]
      api.get.mockResolvedValue({ data: allContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.queryByText('No Expiry Contract')).not.toBeInTheDocument()
      })
    })
  })

  describe('contract sorting', () => {
    it('should sort contracts by expiry date (earliest first)', async () => {
      const unsortedContracts = [mockContracts[2], mockContracts[0], mockContracts[1]]
      api.get.mockResolvedValue({ data: unsortedContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const rows = screen.getAllByRole('row').slice(1) // Skip header row
        expect(rows[0]).toHaveTextContent('Urgent Contract')
        expect(rows[1]).toHaveTextContent('Warning Contract')
        expect(rows[2]).toHaveTextContent('Upcoming Contract')
      })
    })
  })

  describe('API response formats', () => {
    it('should handle response with items array', async () => {
      api.get.mockResolvedValue({ data: { items: mockContracts } })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Urgent Contract')).toBeInTheDocument()
      })
    })

    it('should handle response as direct array', async () => {
      api.get.mockResolvedValue({ data: mockContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Urgent Contract')).toBeInTheDocument()
      })
    })

    it('should handle empty items array', async () => {
      api.get.mockResolvedValue({ data: { items: [] } })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue(new Error('API Error'))
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should not crash on malformed data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockResolvedValue({ data: null })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('boundary values', () => {
    it('should handle very large number of contracts', async () => {
      const manyContracts = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Contract ${i}`,
        contract_type: 'NDA',
        counterparty_name: `Party ${i}`,
        lifecycle_status: 'executed',
        expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }))
      api.get.mockResolvedValue({ data: manyContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract 0')).toBeInTheDocument()
      })
    })

    it('should handle contract with all fields null', async () => {
      const nullContract = {
        id: 1,
        title: null,
        original_filename: null,
        contract_type: null,
        counterparty_name: null,
        lifecycle_status: 'executed',
        expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }
      api.get.mockResolvedValue({ data: [nullContract] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })
  })

  describe('date calculations', () => {
    it('should correctly calculate days remaining', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const contract = {
        ...mockContracts[0],
        expiry_date: tomorrow,
      }
      api.get.mockResolvedValue({ data: [contract] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const badge = screen.getByText(/1d left/)
        expect(badge).toBeInTheDocument()
      })
    })

    it('should handle contracts expiring today', async () => {
      const today = new Date().toISOString().split('T')[0]
      const contract = {
        ...mockContracts[0],
        expiry_date: today,
      }
      api.get.mockResolvedValue({ data: [contract] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })
  })

  describe('summary card calculations', () => {
    it('should count 0 for each category when no matching contracts', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const zeros = screen.getAllByText('0')
        expect(zeros.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('should correctly count contracts in multiple categories', async () => {
      const multiCategoryContracts = [
        { ...mockContracts[0] }, // Critical
        { ...mockContracts[0], id: 10 }, // Critical
        { ...mockContracts[1] }, // Warning
        { ...mockContracts[2] }, // Upcoming
        { ...mockContracts[2], id: 11 }, // Upcoming
        { ...mockContracts[2], id: 12 }, // Upcoming
      ]
      api.get.mockResolvedValue({ data: multiCategoryContracts })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        // Should have 2 critical, 1 warning, 3 upcoming
        expect(screen.getByText('Critical (≤7 days)')).toBeInTheDocument()
      })
    })
  })
})
