import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SearchPage from './SearchPage'
import api from '../api/client'

vi.mock('../api/client')

function renderSearchPage() {
  return render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>
  )
}

describe('SearchPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render search form', () => {
      renderSearchPage()

      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Search by keyword, jurisdiction, type, or status — or combine all filters.')).toBeInTheDocument()
    })

    it('should render search input with autofocus', () => {
      renderSearchPage()

      const searchInput = screen.getByPlaceholderText('Search contracts by keyword…')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('autoFocus')
    })

    it('should render jurisdiction filter', () => {
      renderSearchPage()

      const jurisdictionSelect = screen.getByRole('combobox', { name: '' })
      expect(jurisdictionSelect).toBeInTheDocument()

      const options = Array.from(jurisdictionSelect.querySelectorAll('option'))
      expect(options[0]).toHaveTextContent('All jurisdictions')
      expect(options[1]).toHaveTextContent('IN')
      expect(options[2]).toHaveTextContent('EU')
      expect(options[3]).toHaveTextContent('US')
      expect(options[4]).toHaveTextContent('APAC')
      expect(options[5]).toHaveTextContent('GLOBAL')
    })

    it('should render contract type filter', () => {
      renderSearchPage()

      const typeSelects = screen.getAllByRole('combobox')
      const typeSelect = typeSelects[1]

      const options = Array.from(typeSelect.querySelectorAll('option'))
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

    it('should render lifecycle status filter', () => {
      renderSearchPage()

      const statusSelects = screen.getAllByRole('combobox')
      const statusSelect = statusSelects[2]

      const options = Array.from(statusSelect.querySelectorAll('option'))
      expect(options[0]).toHaveTextContent('All statuses')
      expect(options[1]).toHaveTextContent('draft')
      expect(options[2]).toHaveTextContent('review')
      expect(options[3]).toHaveTextContent('approval')
      expect(options[4]).toHaveTextContent('pending signature')
      expect(options[5]).toHaveTextContent('executed')
      expect(options[6]).toHaveTextContent('expired')
      expect(options[7]).toHaveTextContent('terminated')
    })

    it('should render search button', () => {
      renderSearchPage()

      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('should not render clear button initially', () => {
      renderSearchPage()

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })
  })

  describe('search input', () => {
    it('should update search query on input', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const searchInput = screen.getByPlaceholderText('Search contracts by keyword…')
      await user.type(searchInput, 'test query')

      expect(searchInput).toHaveValue('test query')
    })

    it('should update jurisdiction filter', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'US')

      expect(jurisdictionSelect).toHaveValue('US')
    })

    it('should update contract type filter', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      expect(typeSelect).toHaveValue('NDA')
    })

    it('should update lifecycle status filter', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'executed')

      expect(statusSelect).toHaveValue('executed')
    })
  })

  describe('search execution', () => {
    it('should call API with search query', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      const searchInput = screen.getByPlaceholderText('Search contracts by keyword…')
      await user.type(searchInput, 'test')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test' },
        })
      })
    })

    it('should call API with jurisdiction filter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'US')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { jurisdiction: 'US' },
        })
      })
    })

    it('should call API with contract type filter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { contract_type: 'NDA' },
        })
      })
    })

    it('should call API with lifecycle status filter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'executed')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { lifecycle_status: 'executed' },
        })
      })
    })

    it('should call API with combined filters', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'contract')
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'US')
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'NDA')
      await user.selectOptions(screen.getAllByRole('combobox')[2], 'executed')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {
            q: 'contract',
            jurisdiction: 'US',
            contract_type: 'NDA',
            lifecycle_status: 'executed',
          },
        })
      })
    })

    it('should trim whitespace from search query', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), '  test  ')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test' },
        })
      })
    })

    it('should not include empty query in params', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), '   ')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {},
        })
      })
    })

    it('should show loading state during search', async () => {
      const user = userEvent.setup()
      api.get.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { total: 0, items: [] } }), 100))
      )

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'test')

      const button = screen.getByRole('button', { name: /search/i })
      await user.click(button)

      expect(screen.getByText('…')).toBeInTheDocument()
      expect(button).toBeDisabled()
    })
  })

  describe('search results', () => {
    it('should display search results', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 2,
          items: [
            {
              id: 1,
              title: 'Contract 1',
              contract_type: 'NDA',
              counterparty_name: 'Party 1',
              jurisdiction: 'US',
              lifecycle_status: 'executed',
            },
            {
              id: 2,
              title: 'Contract 2',
              contract_type: 'MSA',
              counterparty_name: 'Party 2',
              jurisdiction: 'EU',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'test')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText('2 results')).toBeInTheDocument()
        expect(screen.getByText('Contract 1')).toBeInTheDocument()
        expect(screen.getByText('Contract 2')).toBeInTheDocument()
      })
    })

    it('should display no results message', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'nonexistent')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText('0 results')).toBeInTheDocument()
        expect(screen.getByText('No matches found')).toBeInTheDocument()
      })
    })

    it('should display result count as singular for 1 result', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Contract 1',
              lifecycle_status: 'executed',
            },
          ],
        },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'test')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText('1 result')).toBeInTheDocument()
      })
    })

    it('should display contract with original_filename when title is missing', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              original_filename: 'contract.pdf',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText('contract.pdf')).toBeInTheDocument()
      })
    })

    it('should display contract metadata', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Test Contract',
              contract_type: 'NDA',
              counterparty_name: 'Acme Corp',
              jurisdiction: 'US',
              lifecycle_status: 'executed',
            },
          ],
        },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('US')).toBeInTheDocument()
      })
    })

    it('should render contract links with correct href', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 123,
              title: 'Test Contract',
              lifecycle_status: 'executed',
            },
          ],
        },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        const link = screen.getByText('Test Contract').closest('a')
        expect(link).toHaveAttribute('href', '/contracts/123')
      })
    })

    it('should display applied filters in results header', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 5, items: [] },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'test')
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'US')
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'NDA')
      await user.selectOptions(screen.getAllByRole('combobox')[2], 'executed')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText(/for/)).toBeInTheDocument()
        expect(screen.getByText('"test"')).toBeInTheDocument()
        expect(screen.getByText('US')).toBeInTheDocument()
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getByText('executed')).toBeInTheDocument()
      })
    })
  })

  describe('clear filters', () => {
    it('should show clear button when filters are applied', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'test')

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should clear all filters when clear is clicked', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const searchInput = screen.getByPlaceholderText('Search contracts by keyword…')
      await user.type(searchInput, 'test')
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'US')
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'NDA')
      await user.selectOptions(screen.getAllByRole('combobox')[2], 'executed')

      await user.click(screen.getByRole('button', { name: /clear/i }))

      expect(searchInput).toHaveValue('')
      expect(screen.getAllByRole('combobox')[0]).toHaveValue('')
      expect(screen.getAllByRole('combobox')[1]).toHaveValue('')
      expect(screen.getAllByRole('combobox')[2]).toHaveValue('')
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })

    it('should clear results when clear is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 1, items: [{ id: 1, title: 'Test', lifecycle_status: 'executed' }] },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), 'test')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /clear/i }))

      expect(screen.queryByText('Test')).not.toBeInTheDocument()
    })
  })

  describe('boundary values', () => {
    it('should handle very long search query', async () => {
      const user = userEvent.setup()
      const longQuery = 'a'.repeat(1000)

      renderSearchPage()

      const searchInput = screen.getByPlaceholderText('Search contracts by keyword…')
      await user.type(searchInput, longQuery)

      expect(searchInput).toHaveValue(longQuery)
    })

    it('should handle empty search', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {},
        })
      })
    })

    it('should handle large result count', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 99999, items: [] },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(screen.getByText('99999 results')).toBeInTheDocument()
      })
    })

    it('should handle special characters in search query', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText('Search contracts by keyword…'), '<>&"\'/\\')
      await user.click(screen.getByRole('button', { name: /search/i }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: '<>&"\'/\\' },
        })
      })
    })
  })

  describe('equivalence partitioning', () => {
    it('should handle all jurisdictions', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const jurisdictions = ['IN', 'EU', 'US', 'APAC', 'GLOBAL']

      for (const jurisdiction of jurisdictions) {
        const { unmount } = renderSearchPage()

        await user.selectOptions(screen.getAllByRole('combobox')[0], jurisdiction)
        await user.click(screen.getByRole('button', { name: /search/i }))

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith('/search/repository', {
            params: { jurisdiction },
          })
        })

        unmount()
        vi.clearAllMocks()
      }
    })

    it('should handle all contract types', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const types = ['NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']

      for (const type of types) {
        const { unmount } = renderSearchPage()

        await user.selectOptions(screen.getAllByRole('combobox')[1], type)
        await user.click(screen.getByRole('button', { name: /search/i }))

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith('/search/repository', {
            params: { contract_type: type },
          })
        })

        unmount()
        vi.clearAllMocks()
      }
    })

    it('should handle all lifecycle statuses', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const statuses = ['draft', 'review', 'approval', 'pending_signature', 'executed', 'expired', 'terminated']

      for (const status of statuses) {
        const { unmount } = renderSearchPage()

        await user.selectOptions(screen.getAllByRole('combobox')[2], status)
        await user.click(screen.getByRole('button', { name: /search/i }))

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith('/search/repository', {
            params: { lifecycle_status: status },
          })
        })

        unmount()
        vi.clearAllMocks()
      }
    })
  })

  describe('form submission', () => {
    it('should submit on enter key', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderSearchPage()

      const searchInput = screen.getByPlaceholderText('Search contracts by keyword…')
      await user.type(searchInput, 'test{Enter}')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test' },
        })
      })
    })
  })
})
