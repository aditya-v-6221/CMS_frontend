import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ContractsPage from './ContractsPage'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client')

function renderContractsPage(user = null, initialPath = '/contracts') {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <ContractsPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('ContractsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render contracts page header', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Contracts')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      api.get.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { total: 0, items: [] } }), 100))
      )

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should display contract count', async () => {
      api.get.mockResolvedValue({
        data: { total: 25, items: [] },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('(25)')).toBeInTheDocument()
      })
    })

    it('should render filter controls', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('should render counterparty input filter', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Counterparty…')).toBeInTheDocument()
      })
    })
  })

  describe('upload button visibility', () => {
    it('should show Upload contract button for admin', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByText('+ Upload contract')).toBeInTheDocument()
      })
    })

    it('should show Upload contract button for editor', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        expect(screen.getByText('+ Upload contract')).toBeInTheDocument()
      })
    })

    it('should not show Upload contract button for reviewer', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'reviewer@test.com', role: 'reviewer' })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })

    it('should not show Upload contract button for viewer', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })

    it('should link to upload page', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        const uploadLink = screen.getByText('+ Upload contract').closest('a')
        expect(uploadLink).toHaveAttribute('href', '/contracts/upload')
      })
    })
  })

  describe('loading contracts', () => {
    it('should load contracts on mount', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=0&limit=20')
      })
    })

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

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

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

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('No contracts found')).toBeInTheDocument()
      })
    })

    it('should display original_filename when title is missing', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              original_filename: 'document.pdf',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument()
      })
    })

    it('should display em dash for missing fields', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Contract',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        const emDashes = screen.getAllByText('—')
        expect(emDashes.length).toBeGreaterThan(0)
      })
    })

    it('should render contract links with correct href', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 456,
              title: 'Test Contract',
              lifecycle_status: 'executed',
            },
          ],
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        const link = screen.getByText('Test Contract').closest('a')
        expect(link).toHaveAttribute('href', '/contracts/456')
      })
    })
  })

  describe('filtering contracts', () => {
    it('should filter by lifecycle status', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
      })

      const statusSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(statusSelect, 'executed')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?lifecycle_status=executed&skip=0&limit=20')
      })
    })

    it('should filter by contract type', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

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
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

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
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Counterparty…')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Counterparty…'), 'Acme')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?counterparty=Acme&skip=0&limit=20')
      })
    })

    it('should combine multiple filters', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
      })

      await user.selectOptions(screen.getAllByRole('combobox')[0], 'executed')
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'NDA')
      await user.selectOptions(screen.getAllByRole('combobox')[2], 'US')
      await user.type(screen.getByPlaceholderText('Counterparty…'), 'Acme')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/contracts?lifecycle_status=executed&contract_type=NDA&jurisdiction=US&counterparty=Acme&skip=0&limit=20'
        )
      })
    })

    it('should reset to page 0 when filter changes', async () => {
      api.get.mockResolvedValue({
        data: { total: 50, items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }) },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      // Go to page 2
      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?skip=20&limit=20')
      })

      // Change filter - should reset to page 0
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'executed')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?lifecycle_status=executed&skip=0&limit=20')
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

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

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

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('should disable Previous button on first page', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 50,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        const prevButton = screen.getByText('Previous')
        expect(prevButton).toBeDisabled()
      })
    })

    it('should enable Next button when more pages exist', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 50,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        const nextButton = screen.getByText('Next')
        expect(nextButton).not.toBeDisabled()
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
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

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
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

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

    it('should disable Next button on last page', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 25,
          items: Array(5).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      // Go to page 2 (last page)
      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        const nextButton = screen.getByText('Next')
        expect(nextButton).toBeDisabled()
      })
    })

    it('should show correct range for last page', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 25,
          items: Array(5).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      const user = userEvent.setup()
      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle zero contracts', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('(0)')).toBeInTheDocument()
      })
    })

    it('should handle very long contract title', async () => {
      const longTitle = 'A'.repeat(500)
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: longTitle,
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText(longTitle)).toBeInTheDocument()
      })
    })

    it('should handle very long counterparty name', async () => {
      const longName = 'B'.repeat(500)
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Contract',
              counterparty_name: longName,
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument()
      })
    })

    it('should handle exactly 20 contracts (no pagination)', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 20,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
      })
    })

    it('should handle exactly 21 contracts (show pagination)', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 21,
          items: Array(20).fill({ id: 1, title: 'Contract', lifecycle_status: 'draft' }),
        },
      })

      renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })
  })

  describe('equivalence partitioning', () => {
    it('should handle all lifecycle statuses in filter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const statuses = ['draft', 'review', 'approval', 'pending_signature', 'executed', 'expired', 'terminated']

      for (const status of statuses) {
        const { unmount } = renderContractsPage({ id: 1, email: 'test@test.com', role: 'viewer' })

        await waitFor(() => {
          expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument()
        })

        await user.selectOptions(screen.getAllByRole('combobox')[0], status)

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith(`/contracts?lifecycle_status=${status}&skip=0&limit=20`)
        })

        unmount()
        vi.clearAllMocks()
      }
    })

    it('should show correct permissions for editor', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        expect(screen.getByText('+ Upload contract')).toBeInTheDocument()
      })
    })

    it('should show correct permissions for viewer', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderContractsPage({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.queryByText('+ Upload contract')).not.toBeInTheDocument()
      })
    })
  })
})
