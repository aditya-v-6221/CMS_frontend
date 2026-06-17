import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import DeadlineTrackerPage from './DeadlineTrackerPage'
import api from '../api/client'

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn()
  }
}))

// Mock StatusBadge component
vi.mock('../components/StatusBadge', () => ({
  default: ({ status }) => <span data-testid="status-badge">{status}</span>
}))

// Helper to render with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

// Helper to create mock contract
const createMockContract = (overrides = {}) => ({
  id: 'contract-1',
  title: 'Test Contract',
  original_filename: 'test.pdf',
  contract_type: 'Service Agreement',
  counterparty_name: 'Test Company',
  lifecycle_status: 'executed',
  expiry_date: '2026-06-20',
  ...overrides
})

describe('DeadlineTrackerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock current date to 2026-06-17 for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial Rendering', () => {
    it('should render the page title and description', () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<DeadlineTrackerPage />)

      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
      expect(screen.getByText('Contracts expiring within the next 30 days')).toBeInTheDocument()
    })

    it('should render summary cards with loading state', () => {
      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves
      renderWithRouter(<DeadlineTrackerPage />)

      expect(screen.getByText('—')).toBeInTheDocument()
      expect(screen.getByText('Critical (≤7 days)')).toBeInTheDocument()
      expect(screen.getByText('Warning (8–14 days)')).toBeInTheDocument()
      expect(screen.getByText('Upcoming (15–30 days)')).toBeInTheDocument()
    })

    it('should display loading message while fetching data', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<DeadlineTrackerPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
  })

  describe('API Data Fetching', () => {
    it('should fetch contracts with limit=200', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?limit=200')
      })
    })

    it('should handle response with data as array', async () => {
      const contracts = [createMockContract({ expiry_date: '2026-06-20' })]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })

    it('should handle response with data.items format', async () => {
      const contracts = [createMockContract({ expiry_date: '2026-06-20' })]
      api.get.mockResolvedValue({ data: { items: contracts } })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })

    it('should handle null/undefined data gracefully', async () => {
      api.get.mockResolvedValue({ data: null })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })
    })

    it('should handle API error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue(new Error('Network error'))

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })

      expect(consoleError).toHaveBeenCalledWith('Deadline tracker load failed:', expect.any(Error))
      consoleError.mockRestore()
    })
  })

  describe('Contract Filtering', () => {
    it('should only show contracts expiring within 30 days', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Within 30 days', expiry_date: '2026-06-20' }),
        createMockContract({ id: '2', title: 'After 30 days', expiry_date: '2026-07-25' }),
        createMockContract({ id: '3', title: 'Already expired', expiry_date: '2026-06-10' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Within 30 days')).toBeInTheDocument()
      })

      expect(screen.queryByText('After 30 days')).not.toBeInTheDocument()
      expect(screen.queryByText('Already expired')).not.toBeInTheDocument()
    })

    it('should filter out contracts without expiry_date', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'With date', expiry_date: '2026-06-20' }),
        createMockContract({ id: '2', title: 'No date', expiry_date: null }),
        createMockContract({ id: '3', title: 'Undefined date', expiry_date: undefined })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('With date')).toBeInTheDocument()
      })

      expect(screen.queryByText('No date')).not.toBeInTheDocument()
      expect(screen.queryByText('Undefined date')).not.toBeInTheDocument()
    })

    it('should include contracts expiring exactly 30 days from now', async () => {
      const contracts = [
        createMockContract({ title: 'Exactly 30 days', expiry_date: '2026-07-17' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Exactly 30 days')).toBeInTheDocument()
      })
    })

    it('should include contracts expiring today', async () => {
      const contracts = [
        createMockContract({ title: 'Expires today', expiry_date: '2026-06-17' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Expires today')).toBeInTheDocument()
      })
    })

    it('should sort contracts by expiry date ascending', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Contract C', expiry_date: '2026-06-30' }),
        createMockContract({ id: '2', title: 'Contract A', expiry_date: '2026-06-18' }),
        createMockContract({ id: '3', title: 'Contract B', expiry_date: '2026-06-25' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract A')).toBeInTheDocument()
      })

      const rows = screen.getAllByRole('row')
      const dataRows = rows.slice(1) // Skip header row
      expect(dataRows[0]).toHaveTextContent('Contract A')
      expect(dataRows[1]).toHaveTextContent('Contract B')
      expect(dataRows[2]).toHaveTextContent('Contract C')
    })
  })

  describe('Summary Card Counts', () => {
    it('should categorize contracts correctly into critical/warning/upcoming', async () => {
      const contracts = [
        createMockContract({ id: '1', expiry_date: '2026-06-20' }), // 3 days - critical
        createMockContract({ id: '2', expiry_date: '2026-06-24' }), // 7 days - critical
        createMockContract({ id: '3', expiry_date: '2026-06-25' }), // 8 days - warning
        createMockContract({ id: '4', expiry_date: '2026-07-01' }), // 14 days - warning
        createMockContract({ id: '5', expiry_date: '2026-07-02' }), // 15 days - upcoming
        createMockContract({ id: '6', expiry_date: '2026-07-15' })  // 28 days - upcoming
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const counts = screen.getAllByText(/^\d+$/)
        // Find the count elements by their associated text
        const criticalCard = screen.getByText('Critical (≤7 days)').closest('div')
        const warningCard = screen.getByText('Warning (8–14 days)').closest('div')
        const upcomingCard = screen.getByText('Upcoming (15–30 days)').closest('div')

        expect(criticalCard).toHaveTextContent('2')
        expect(warningCard).toHaveTextContent('2')
        expect(upcomingCard).toHaveTextContent('2')
      })
    })

    it('should show 0 for all categories when no contracts', async () => {
      api.get.mockResolvedValue({ data: [] })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const criticalCard = screen.getByText('Critical (≤7 days)').closest('div')
        const warningCard = screen.getByText('Warning (8–14 days)').closest('div')
        const upcomingCard = screen.getByText('Upcoming (15–30 days)').closest('div')

        expect(criticalCard).toHaveTextContent('0')
        expect(warningCard).toHaveTextContent('0')
        expect(upcomingCard).toHaveTextContent('0')
      })
    })

    it('should handle boundary case of exactly 7 days (critical)', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-24' }) // Exactly 7 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const criticalCard = screen.getByText('Critical (≤7 days)').closest('div')
        expect(criticalCard).toHaveTextContent('1')
      })
    })

    it('should handle boundary case of exactly 14 days (warning)', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-07-01' }) // Exactly 14 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const warningCard = screen.getByText('Warning (8–14 days)').closest('div')
        expect(warningCard).toHaveTextContent('1')
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no contracts expiring', async () => {
      api.get.mockResolvedValue({ data: [] })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
        expect(screen.getByText("You're all clear.")).toBeInTheDocument()
      })
    })

    it('should show checkmark SVG in empty state', async () => {
      api.get.mockResolvedValue({ data: [] })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const svg = screen.getByText('No contracts expiring in the next 30 days')
          .closest('div')
          .querySelector('svg')
        expect(svg).toBeInTheDocument()
      })
    })
  })

  describe('Contract Table Rendering', () => {
    it('should render table with all column headers', async () => {
      const contracts = [createMockContract({ expiry_date: '2026-06-20' })]
      api.get.mockResolvedValue({ data: contracts })

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

    it('should render contract with title', async () => {
      const contracts = [
        createMockContract({ title: 'Custom Title', expiry_date: '2026-06-20' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Custom Title')).toBeInTheDocument()
      })
    })

    it('should fallback to original_filename when title is missing', async () => {
      const contracts = [
        createMockContract({
          title: null,
          original_filename: 'fallback.pdf',
          expiry_date: '2026-06-20'
        })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('fallback.pdf')).toBeInTheDocument()
      })
    })

    it('should render contract type or dash if missing', async () => {
      const contracts = [
        createMockContract({ contract_type: 'NDA', expiry_date: '2026-06-20' }),
        createMockContract({ id: '2', title: 'No Type', contract_type: null, expiry_date: '2026-06-21' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
      })
    })

    it('should render counterparty name or dash if missing', async () => {
      const contracts = [
        createMockContract({
          counterparty_name: 'Acme Corp',
          expiry_date: '2026-06-20'
        }),
        createMockContract({
          id: '2',
          title: 'No Counterparty',
          counterparty_name: null,
          expiry_date: '2026-06-21'
        })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
      })
    })

    it('should render StatusBadge with lifecycle_status', async () => {
      const contracts = [
        createMockContract({ lifecycle_status: 'executed', expiry_date: '2026-06-20' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByTestId('status-badge')).toHaveTextContent('executed')
      })
    })

    it('should render expiry date', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-25' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('2026-06-25')).toBeInTheDocument()
      })
    })

    it('should render link to contract detail page', async () => {
      const contracts = [
        createMockContract({ id: 'contract-123', expiry_date: '2026-06-20' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Test Contract' })
        expect(link).toHaveAttribute('href', '/contracts/contract-123')
      })
    })

    it('should render multiple contracts', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Contract 1', expiry_date: '2026-06-20' }),
        createMockContract({ id: '2', title: 'Contract 2', expiry_date: '2026-06-25' }),
        createMockContract({ id: '3', title: 'Contract 3', expiry_date: '2026-06-30' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
        expect(screen.getByText('Contract 2')).toBeInTheDocument()
        expect(screen.getByText('Contract 3')).toBeInTheDocument()
      })
    })
  })

  describe('UrgencyBadge Component', () => {
    it('should show red badge for critical contracts (≤7 days)', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-20' }) // 3 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('3d left')).toBeInTheDocument()
        expect(screen.getByText('3d left').className).toContain('bg-red-100')
      })
    })

    it('should show orange badge for warning contracts (8-14 days)', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-27' }) // 10 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('10d left')).toBeInTheDocument()
        expect(screen.getByText('10d left').className).toContain('bg-orange-100')
      })
    })

    it('should show yellow badge for upcoming contracts (>14 days)', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-07-10' }) // 23 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('23d left')).toBeInTheDocument()
        expect(screen.getByText('23d left').className).toContain('bg-yellow-100')
      })
    })

    it('should handle exactly 7 days boundary', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-24' }) // Exactly 7 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('7d left')).toBeInTheDocument()
        expect(screen.getByText('7d left').className).toContain('bg-red-100')
      })
    })

    it('should handle exactly 14 days boundary', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-07-01' }) // Exactly 14 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('14d left')).toBeInTheDocument()
        expect(screen.getByText('14d left').className).toContain('bg-orange-100')
      })
    })

    it('should handle 1 day left', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-18' }) // 1 day
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('1d left')).toBeInTheDocument()
      })
    })

    it('should handle 0 days (expiring today)', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-17' }) // Today
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('0d left')).toBeInTheDocument()
      })
    })
  })

  describe('Row Highlighting', () => {
    it('should highlight critical rows with red background', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Critical Contract', expiry_date: '2026-06-20' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const row = screen.getByText('Critical Contract').closest('tr')
        expect(row.className).toContain('bg-red-50')
      })
    })

    it('should highlight warning rows with orange background', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Warning Contract', expiry_date: '2026-06-27' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const row = screen.getByText('Warning Contract').closest('tr')
        expect(row.className).toContain('bg-orange-50')
      })
    })

    it('should not highlight upcoming rows', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Upcoming Contract', expiry_date: '2026-07-10' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const row = screen.getByText('Upcoming Contract').closest('tr')
        expect(row.className).not.toContain('bg-red-50')
        expect(row.className).not.toContain('bg-orange-50')
      })
    })
  })

  describe('daysUntil Helper Function', () => {
    it('should calculate days correctly for future dates', () => {
      // Test is indirect through component rendering
      const contracts = [
        createMockContract({ expiry_date: '2026-06-22' }) // 5 days
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      waitFor(() => {
        expect(screen.getByText('5d left')).toBeInTheDocument()
      })
    })

    it('should handle null date', async () => {
      // Contracts with null dates should be filtered out
      const contracts = [
        createMockContract({ expiry_date: null })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })
    })

    it('should handle undefined date', async () => {
      const contracts = [
        createMockContract({ expiry_date: undefined })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })
    })

    it('should handle empty string date', async () => {
      const contracts = [
        createMockContract({ expiry_date: '' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle contracts with missing optional fields', async () => {
      const contracts = [
        createMockContract({
          title: null,
          contract_type: null,
          counterparty_name: null,
          lifecycle_status: null,
          expiry_date: '2026-06-20'
        })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
      })
    })

    it('should handle very large number of contracts', async () => {
      const contracts = Array.from({ length: 100 }, (_, i) =>
        createMockContract({
          id: `contract-${i}`,
          title: `Contract ${i}`,
          expiry_date: '2026-06-20'
        })
      )
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract 0')).toBeInTheDocument()
      })

      // All contracts should be in critical category
      const criticalCard = screen.getByText('Critical (≤7 days)').closest('div')
      expect(criticalCard).toHaveTextContent('100')
    })

    it('should handle contracts with invalid date formats gracefully', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Valid', expiry_date: '2026-06-20' }),
        createMockContract({ id: '2', title: 'Invalid', expiry_date: 'not-a-date' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        // Valid contract should render, invalid gets filtered or causes NaN
        expect(screen.getByText('Valid')).toBeInTheDocument()
      })
    })

    it('should handle API returning empty items array', async () => {
      api.get.mockResolvedValue({ data: { items: [] } })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })
    })

    it('should handle contracts with very long counterparty names', async () => {
      const longName = 'A'.repeat(200)
      const contracts = [
        createMockContract({
          counterparty_name: longName,
          expiry_date: '2026-06-20'
        })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument()
      })
    })

    it('should handle contracts expiring at midnight boundaries', async () => {
      const contracts = [
        createMockContract({
          title: 'Midnight Contract',
          expiry_date: '2026-06-17T00:00:00Z'
        })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Midnight Contract')).toBeInTheDocument()
      })
    })

    it('should handle mixed valid and invalid contracts', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Valid 1', expiry_date: '2026-06-20' }),
        { id: '2', incomplete: 'data' }, // Malformed contract
        createMockContract({ id: '3', title: 'Valid 2', expiry_date: '2026-06-25' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Valid 1')).toBeInTheDocument()
        expect(screen.getByText('Valid 2')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State Transitions', () => {
    it('should transition from loading to empty state', async () => {
      api.get.mockResolvedValue({ data: [] })

      renderWithRouter(<DeadlineTrackerPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })
    })

    it('should transition from loading to table view', async () => {
      const contracts = [createMockContract({ expiry_date: '2026-06-20' })]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })

    it('should update summary cards after loading', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-20' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      // Initially shows loading
      expect(screen.getAllByText('—').length).toBeGreaterThan(0)

      await waitFor(() => {
        const criticalCard = screen.getByText('Critical (≤7 days)').closest('div')
        expect(criticalCard).toHaveTextContent('1')
        expect(screen.queryByText('—')).not.toBeInTheDocument()
      })
    })
  })

  describe('Component Lifecycle', () => {
    it('should fetch data only once on mount', async () => {
      api.get.mockResolvedValue({ data: [] })

      const { rerender } = renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1)
      })

      // Re-render should not trigger another fetch
      rerender(<BrowserRouter><DeadlineTrackerPage /></BrowserRouter>)

      expect(api.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Date Calculation Edge Cases', () => {
    it('should handle leap year dates', async () => {
      vi.setSystemTime(new Date('2024-02-28T00:00:00.000Z'))
      const contracts = [
        createMockContract({ expiry_date: '2024-02-29' }) // Leap day
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('1d left')).toBeInTheDocument()
      })
    })

    it('should handle year boundary (Dec to Jan)', async () => {
      vi.setSystemTime(new Date('2025-12-15T00:00:00.000Z'))
      const contracts = [
        createMockContract({ expiry_date: '2026-01-10' }) // 26 days into new year
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('26d left')).toBeInTheDocument()
      })
    })

    it('should handle timezone differences in date calculation', async () => {
      // Component uses new Date() which is timezone-aware
      const contracts = [
        createMockContract({ expiry_date: '2026-06-20T23:59:59Z' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        // Should still show the contract
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', async () => {
      const contracts = [createMockContract({ expiry_date: '2026-06-20' })]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getAllByRole('columnheader')).toHaveLength(6)
      })
    })

    it('should have links for contracts', async () => {
      const contracts = [createMockContract({ expiry_date: '2026-06-20' })]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const links = screen.getAllByRole('link')
        expect(links.length).toBeGreaterThan(0)
      })
    })

    it('should have heading hierarchy', async () => {
      api.get.mockResolvedValue({ data: [] })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Deadline Tracker' })).toBeInTheDocument()
      })
    })
  })

  describe('Data Formatting', () => {
    it('should preserve expiry_date format from API', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-25' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('2026-06-25')).toBeInTheDocument()
      })
    })

    it('should handle different date string formats', async () => {
      const contracts = [
        createMockContract({ expiry_date: '2026-06-20T00:00:00.000Z' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        // Should render the exact date string provided
        expect(screen.getByText('2026-06-20T00:00:00.000Z')).toBeInTheDocument()
      })
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle multiple contracts with same expiry date', async () => {
      const contracts = [
        createMockContract({ id: '1', title: 'Contract A', expiry_date: '2026-06-20' }),
        createMockContract({ id: '2', title: 'Contract B', expiry_date: '2026-06-20' }),
        createMockContract({ id: '3', title: 'Contract C', expiry_date: '2026-06-20' })
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract A')).toBeInTheDocument()
        expect(screen.getByText('Contract B')).toBeInTheDocument()
        expect(screen.getByText('Contract C')).toBeInTheDocument()
      })

      const criticalCard = screen.getByText('Critical (≤7 days)').closest('div')
      expect(criticalCard).toHaveTextContent('3')
    })

    it('should handle all contracts in one category', async () => {
      const contracts = Array.from({ length: 5 }, (_, i) =>
        createMockContract({
          id: `contract-${i}`,
          title: `Contract ${i}`,
          expiry_date: '2026-06-20' // All critical
        })
      )
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        const criticalCard = screen.getByText('Critical (≤7 days)').closest('div')
        const warningCard = screen.getByText('Warning (8–14 days)').closest('div')
        const upcomingCard = screen.getByText('Upcoming (15–30 days)').closest('div')

        expect(criticalCard).toHaveTextContent('5')
        expect(warningCard).toHaveTextContent('0')
        expect(upcomingCard).toHaveTextContent('0')
      })
    })

    it('should handle API response with extra fields', async () => {
      const contracts = [
        {
          ...createMockContract({ expiry_date: '2026-06-20' }),
          extraField: 'should be ignored',
          anotherField: 123
        }
      ]
      api.get.mockResolvedValue({ data: contracts })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Contract')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network timeout error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue({ message: 'Network timeout' })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })

      consoleError.mockRestore()
    })

    it('should handle 500 server error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue({ response: { status: 500 } })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })

      consoleError.mockRestore()
    })

    it('should handle 404 error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue({ response: { status: 404 } })

      renderWithRouter(<DeadlineTrackerPage />)

      await waitFor(() => {
        expect(screen.getByText('No contracts expiring in the next 30 days')).toBeInTheDocument()
      })

      consoleError.mockRestore()
    })
  })
})
