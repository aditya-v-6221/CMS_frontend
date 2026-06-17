import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import api from '../api/client'

vi.mock('../api/client')

function renderDashboardPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render dashboard header', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })

    it('should render all status cards', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

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

    it('should show loading placeholders in status cards initially', () => {
      api.get.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { total: 0, items: [] } }), 100))
      )

      renderDashboardPage()

      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })
  })

  describe('loading data', () => {
    it('should load contracts for counting on mount', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?limit=200')
      })
    })

    it('should display status counts', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 10,
          items: [
            { id: 1, lifecycle_status: 'draft' },
            { id: 2, lifecycle_status: 'draft' },
            { id: 3, lifecycle_status: 'review' },
            { id: 4, lifecycle_status: 'approval' },
            { id: 5, lifecycle_status: 'pending_signature' },
            { id: 6, lifecycle_status: 'executed' },
            { id: 7, lifecycle_status: 'executed' },
            { id: 8, lifecycle_status: 'executed' },
            { id: 9, lifecycle_status: 'expired' },
            { id: 10, lifecycle_status: 'terminated' },
          ],
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        const cards = screen.getAllByRole('button')
        expect(cards[0]).toHaveTextContent('2') // draft
        expect(cards[1]).toHaveTextContent('1') // review
        expect(cards[2]).toHaveTextContent('1') // approval
        expect(cards[3]).toHaveTextContent('1') // pending_signature
        expect(cards[4]).toHaveTextContent('3') // executed
        expect(cards[5]).toHaveTextContent('1') // expired
        expect(cards[6]).toHaveTextContent('1') // terminated
      })
    })

    it('should show 0 for statuses with no contracts', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, lifecycle_status: 'draft' },
          ],
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        const cards = screen.getAllByRole('button')
        expect(cards[0]).toHaveTextContent('1') // draft
        expect(cards[1]).toHaveTextContent('0') // review
        expect(cards[2]).toHaveTextContent('0') // approval
        expect(cards[3]).toHaveTextContent('0') // pending_signature
        expect(cards[4]).toHaveTextContent('0') // executed
        expect(cards[5]).toHaveTextContent('0') // expired
        expect(cards[6]).toHaveTextContent('0') // terminated
      })
    })
  })

  describe('status card filtering', () => {
    it('should filter contracts when status card is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 5, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      const draftCard = screen.getByText('Draft').closest('button')
      await user.click(draftCard)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?lifecycle_status=draft&skip=0&limit=20')
      })
    })

    it('should show selected card with ring', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 5, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      const draftCard = screen.getByText('Draft').closest('button')
      await user.click(draftCard)

      await waitFor(() => {
        expect(draftCard).toHaveClass('ring-2', 'ring-indigo-300')
      })
    })

    it('should toggle filter off when clicking same status card again', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 5, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      const draftCard = screen.getByText('Draft').closest('button')

      // Click once to filter
      await user.click(draftCard)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?lifecycle_status=draft&skip=0&limit=20')
      })

      // Click again to remove filter
      await user.click(draftCard)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=0&limit=20')
      })
    })
  })

  describe('contracts list', () => {
    it('should display contracts in table', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 2,
          items: [
            {
              id: 1,
              title: 'Contract 1',
              contract_type: 'NDA',
              jurisdiction: 'US',
              counterparty_name: 'Acme Corp',
              lifecycle_status: 'executed',
              expiry_date: '2025-12-31',
            },
            {
              id: 2,
              title: 'Contract 2',
              contract_type: 'MSA',
              jurisdiction: 'EU',
              counterparty_name: 'Beta Inc',
              lifecycle_status: 'draft',
              expiry_date: '2026-01-15',
            },
          ],
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
        expect(screen.getByText('Contract 2')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('Beta Inc')).toBeInTheDocument()
      })
    })

    it('should display no contracts message when list is empty', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('No contracts found')).toBeInTheDocument()
      })
    })

    it('should show loading state during contract list load', () => {
      api.get.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { total: 0, items: [] } }), 100))
      )

      renderDashboardPage()

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should display contract count', async () => {
      api.get.mockResolvedValue({
        data: { total: 25, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('25 contracts')).toBeInTheDocument()
      })
    })

    it('should display singular contract text for 1 contract', async () => {
      api.get.mockResolvedValue({
        data: { total: 1, items: [{ id: 1, title: 'Contract', lifecycle_status: 'draft' }] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('1 contract')).toBeInTheDocument()
      })
    })

    it('should display applied filter in contracts section', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 5, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Executed')).toBeInTheDocument()
      })

      const executedCard = screen.getByText('Executed').closest('button')
      await user.click(executedCard)

      await waitFor(() => {
        expect(screen.getByText('5 contracts · executed')).toBeInTheDocument()
      })
    })
  })

  describe('additional filters', () => {
    it('should render filter dropdowns', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('should filter by contract type', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
      })

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?contract_type=NDA&skip=0&limit=20')
      })
    })

    it('should filter by jurisdiction', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
      })

      const jurisdictionSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(jurisdictionSelect, 'US')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?jurisdiction=US&skip=0&limit=20')
      })
    })

    it('should filter by counterparty', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Counterparty…')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Counterparty…'), 'Acme')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?counterparty=Acme&skip=0&limit=20')
      })
    })

    it('should combine status card and dropdown filters', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Executed')).toBeInTheDocument()
      })

      // Click status card
      await user.click(screen.getByText('Executed').closest('button'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?lifecycle_status=executed&skip=0&limit=20')
      })

      // Add type filter
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?lifecycle_status=executed&contract_type=NDA&skip=0&limit=20')
      })
    })
  })

  describe('pagination', () => {
    it('should show pagination when total exceeds limit', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 50,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
        expect(screen.getByText('Showing 1–20 of 50')).toBeInTheDocument()
      })
    })

    it('should not show pagination when total is less than limit', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 10,
          items: Array(10).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('should load next page when Next is clicked', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 50,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      const user = userEvent.setup()
      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=20&limit=20')
      })
    })

    it('should load previous page when Previous is clicked', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 50,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      const user = userEvent.setup()
      renderDashboardPage()

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
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=0&limit=20')
      })
    })

    it('should reset to page 0 when filter changes', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 50,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      const user = userEvent.setup()
      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      // Go to page 2
      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=20&limit=20')
      })

      // Change filter - should reset to page 0
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?contract_type=NDA&skip=0&limit=20')
      })
    })
  })

  describe('boundary values', () => {
    it('should handle zero contracts', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('0 contracts')).toBeInTheDocument()
      })
    })

    it('should handle very large counts', async () => {
      const items = Array(200).fill(null).map((_, i) => ({
        id: i,
        lifecycle_status: i % 7 === 0 ? 'draft' : i % 7 === 1 ? 'review' : i % 7 === 2 ? 'approval' : i % 7 === 3 ? 'pending_signature' : i % 7 === 4 ? 'executed' : i % 7 === 5 ? 'expired' : 'terminated',
      }))

      api.get.mockResolvedValue({
        data: { total: 200, items },
      })

      renderDashboardPage()

      await waitFor(() => {
        const cards = screen.getAllByRole('button')
        // Should display numbers, not placeholders
        expect(cards[0].textContent).toMatch(/\d+/)
      })
    })

    it('should handle exactly 20 contracts (boundary for pagination)', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 20,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('should handle exactly 21 contracts (trigger pagination)', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 21,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })

    it('should handle contracts with missing fields', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderDashboardPage()

      await waitFor(() => {
        const emDashes = screen.getAllByText('—')
        expect(emDashes.length).toBeGreaterThan(0)
      })
    })
  })

  describe('equivalence partitioning', () => {
    const statuses = [
      'draft',
      'review',
      'approval',
      'pending_signature',
      'executed',
      'expired',
      'terminated',
    ]

    statuses.forEach(status => {
      it(`should filter correctly for ${status} status`, async () => {
        const user = userEvent.setup()
        api.get.mockResolvedValue({
          data: { total: 5, items: [] },
        })

        renderDashboardPage()

        await waitFor(() => {
          expect(screen.getByText('Draft')).toBeInTheDocument()
        })

        const statusCards = screen.getAllByRole('button')
        const statusCard = statusCards.find(card =>
          card.textContent.toLowerCase().includes(status.replace('_', ' ').toLowerCase())
        )

        await user.click(statusCard)

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith(`/contracts?lifecycle_status=${status}&skip=0&limit=20`)
        })
      })
    })

    it('should handle all contract types in filter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const types = ['NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']

      for (const type of types) {
        const { unmount } = renderDashboardPage()

        await waitFor(() => {
          expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
        })

        await user.selectOptions(screen.getAllByRole('combobox')[1], type)

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith(`/contracts?contract_type=${type}&skip=0&limit=20`)
        })

        unmount()
        vi.clearAllMocks()
      }
    })

    it('should handle all jurisdictions in filter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const jurisdictions = ['IN', 'EU', 'US', 'APAC', 'GLOBAL']

      for (const jurisdiction of jurisdictions) {
        const { unmount } = renderDashboardPage()

        await waitFor(() => {
          expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
        })

        await user.selectOptions(screen.getAllByRole('combobox')[2], jurisdiction)

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith(`/contracts?jurisdiction=${jurisdiction}&skip=0&limit=20`)
        })

        unmount()
        vi.clearAllMocks()
      }
    })
  })

  describe('error handling', () => {
    it('should handle API error for count loading gracefully', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      renderDashboardPage()

      await waitFor(() => {
        // Should still show placeholders or zeros
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })

    it('should handle API error for contracts loading gracefully', async () => {
      api.get.mockResolvedValueOnce({ data: { total: 0, items: [] } }) // counts
      api.get.mockRejectedValueOnce(new Error('Network error')) // contracts

      renderDashboardPage()

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })
  })
})
