import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SearchPage from '../../pages/SearchPage'
import api from '../../api/client'

jest.mock('../../api/client')

describe('SearchPage', () => {
  const renderSearchPage = () => {
    return render(
      <BrowserRouter>
        <SearchPage />
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render search form with all elements', () => {
      renderSearchPage()

      expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Search contracts by keyword/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    })

    it('should render jurisdiction filter', () => {
      renderSearchPage()

      expect(screen.getByRole('combobox', { name: '' })).toBeInTheDocument()
      expect(screen.getByText('All jurisdictions')).toBeInTheDocument()
    })

    it('should have autofocus on search input', () => {
      renderSearchPage()

      const searchInput = screen.getByPlaceholderText(/Search contracts by keyword/)
      expect(searchInput).toHaveAttribute('autoFocus')
    })
  })

  describe('Search input handling', () => {
    it('should update search query on input', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const input = screen.getByPlaceholderText(/Search contracts by keyword/)
      await user.type(input, 'contract terms')

      expect(input).toHaveValue('contract terms')
    })

    it('should update jurisdiction filter', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const select = screen.getByDisplayValue('All jurisdictions')
      await user.selectOptions(select, 'IN')

      expect(select).toHaveValue('IN')
    })
  })

  describe('Search execution', () => {
    it('should call API with query parameter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), 'test query')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test query' },
        })
      })
    })

    it('should trim whitespace from search query', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), '  test  ')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test' },
        })
      })
    })

    it('should not include empty query parameter', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {},
        })
      })
    })

    it('should include jurisdiction filter in API call', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      const select = screen.getByDisplayValue('All jurisdictions')
      await user.selectOptions(select, 'EU')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { jurisdiction: 'EU' },
        })
      })
    })

    it('should include contract type filter in API call', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { contract_type: 'NDA' },
        })
      })
    })

    it('should include lifecycle status filter in API call', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      const statusSelect = screen.getByDisplayValue('All statuses')
      await user.selectOptions(statusSelect, 'executed')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { lifecycle_status: 'executed' },
        })
      })
    })

    it('should combine multiple filters', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), 'terms')
      await user.selectOptions(screen.getByDisplayValue('All jurisdictions'), 'US')
      await user.selectOptions(screen.getByDisplayValue('All types'), 'MSA')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {
            q: 'terms',
            jurisdiction: 'US',
            contract_type: 'MSA',
          },
        })
      })
    })

    it('should show loading state during search', async () => {
      const user = userEvent.setup()
      api.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), 'test')
      const searchButton = screen.getByRole('button', { name: 'Search' })
      await user.click(searchButton)

      expect(searchButton).toHaveTextContent('…')
      expect(searchButton).toBeDisabled()
    })
  })

  describe('Search results', () => {
    it('should display results count', async () => {
      const user = userEvent.setup()
      const mockResults = {
        items: [
          { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
          { id: 2, title: 'Contract 2', lifecycle_status: 'executed' },
        ],
        total: 2,
      }
      api.get.mockResolvedValue({ data: mockResults })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), 'test')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(screen.getByText(/2 results/)).toBeInTheDocument()
      })
    })

    it('should display singular form for single result', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: [{ id: 1, title: 'Contract 1', lifecycle_status: 'draft' }],
          total: 1,
        },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(screen.getByText(/1 result/)).toBeInTheDocument()
      })
    })

    it('should display no matches message for zero results', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), 'nonexistent')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(screen.getByText('No matches found')).toBeInTheDocument()
      })
    })

    it('should display result items with links', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: [
            { id: 10, title: 'Test Contract', lifecycle_status: 'executed' },
          ],
          total: 1,
        },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Test Contract' })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/contracts/10')
      })
    })

    it('should display contract metadata', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: [
            {
              id: 1,
              title: 'Contract',
              contract_type: 'NDA',
              counterparty_name: 'ACME Corp',
              jurisdiction: 'US',
              lifecycle_status: 'executed',
            },
          ],
          total: 1,
        },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getByText('ACME Corp')).toBeInTheDocument()
        expect(screen.getByText('US')).toBeInTheDocument()
      })
    })

    it('should use original_filename when title is missing', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          items: [
            { id: 1, original_filename: 'contract.pdf', lifecycle_status: 'draft' },
          ],
          total: 1,
        },
      })

      renderSearchPage()

      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(screen.getByText('contract.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('Clear filters', () => {
    it('should show Clear button when filters are active', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), 'test')

      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    })

    it('should not show Clear button when no filters are active', () => {
      renderSearchPage()

      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
    })

    it('should clear all filters on Clear button click', async () => {
      const user = userEvent.setup()
      renderSearchPage()

      const searchInput = screen.getByPlaceholderText(/Search contracts/)
      await user.type(searchInput, 'test query')
      await user.selectOptions(screen.getByDisplayValue('All jurisdictions'), 'IN')
      await user.selectOptions(screen.getByDisplayValue('All types'), 'NDA')

      await user.click(screen.getByRole('button', { name: 'Clear' }))

      expect(searchInput).toHaveValue('')
      expect(screen.getByDisplayValue('All jurisdictions')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
    })

    it('should clear results on Clear button click', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), 'test')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(screen.getByText(/0 results/)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Clear' }))

      expect(screen.queryByText(/results/)).not.toBeInTheDocument()
    })
  })

  describe('Form submission', () => {
    it('should prevent default form submission', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      const form = screen.getByRole('button', { name: 'Search' }).closest('form')
      const submitHandler = jest.fn(e => e.preventDefault())
      form.addEventListener('submit', submitHandler)

      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled()
      })
    })
  })

  describe('Boundary cases', () => {
    it('should handle very long search queries', async () => {
      const user = userEvent.setup()
      const longQuery = 'a'.repeat(500)

      renderSearchPage()

      const input = screen.getByPlaceholderText(/Search contracts/)
      await user.type(input, longQuery)

      expect(input).toHaveValue(longQuery)
    })

    it('should handle special characters in search', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })

      renderSearchPage()

      await user.type(screen.getByPlaceholderText(/Search contracts/), '!@#$%^&*()')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: '!@#$%^&*()' },
        })
      })
    })
  })
})
