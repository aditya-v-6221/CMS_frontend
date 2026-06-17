import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SearchPage from './SearchPage'
import api from '../api/client'

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

// Mock StatusBadge component
vi.mock('../components/StatusBadge', () => ({
  default: ({ status }) => <span data-testid="status-badge">{status}</span>,
}))

// Wrapper component for router context
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('SearchPage', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the search page with all form elements', () => {
      renderWithRouter(<SearchPage />)

      expect(screen.getByRole('heading', { name: /search/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search contracts by keyword/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /all jurisdictions/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /all types/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /all statuses/i })).toBeInTheDocument()
    })

    it('should render the description text', () => {
      renderWithRouter(<SearchPage />)

      expect(
        screen.getByText(/search by keyword, jurisdiction, type, or status/i)
      ).toBeInTheDocument()
    })

    it('should have empty initial values for all form fields', () => {
      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      expect(searchInput).toHaveValue('')

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      const typeSelect = screen.getAllByRole('combobox')[1]
      const statusSelect = screen.getAllByRole('combobox')[2]

      expect(jurisdictionSelect).toHaveValue('')
      expect(typeSelect).toHaveValue('')
      expect(statusSelect).toHaveValue('')
    })

    it('should not show Clear button when no filters are applied', () => {
      renderWithRouter(<SearchPage />)

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })

    it('should not show results section initially', () => {
      renderWithRouter(<SearchPage />)

      expect(screen.queryByText(/result/i)).not.toBeInTheDocument()
    })

    it('should autofocus the search input', () => {
      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      expect(searchInput).toHaveAttribute('autoFocus')
    })
  })

  describe('Jurisdiction Dropdown', () => {
    it('should render all jurisdiction options', () => {
      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      const options = within(jurisdictionSelect).getAllByRole('option')

      expect(options).toHaveLength(6) // 1 default + 5 jurisdictions
      expect(options[0]).toHaveTextContent('All jurisdictions')
      expect(options[1]).toHaveTextContent('IN')
      expect(options[2]).toHaveTextContent('EU')
      expect(options[3]).toHaveTextContent('US')
      expect(options[4]).toHaveTextContent('APAC')
      expect(options[5]).toHaveTextContent('GLOBAL')
    })

    it('should update jurisdiction state when option is selected', async () => {
      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')

      expect(jurisdictionSelect).toHaveValue('EU')
    })
  })

  describe('Contract Type Dropdown', () => {
    it('should render all contract type options', () => {
      renderWithRouter(<SearchPage />)

      const typeSelect = screen.getAllByRole('combobox')[1]
      const options = within(typeSelect).getAllByRole('option')

      expect(options).toHaveLength(9) // 1 default + 8 types
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

    it('should update contract type state when option is selected', async () => {
      renderWithRouter(<SearchPage />)

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      expect(typeSelect).toHaveValue('NDA')
    })
  })

  describe('Lifecycle Status Dropdown', () => {
    it('should render all lifecycle status options', () => {
      renderWithRouter(<SearchPage />)

      const statusSelect = screen.getAllByRole('combobox')[2]
      const options = within(statusSelect).getAllByRole('option')

      expect(options).toHaveLength(8) // 1 default + 7 statuses
      expect(options[0]).toHaveTextContent('All statuses')
      expect(options[1]).toHaveTextContent('draft')
      expect(options[2]).toHaveTextContent('review')
      expect(options[3]).toHaveTextContent('approval')
      expect(options[4]).toHaveTextContent('pending signature')
      expect(options[5]).toHaveTextContent('executed')
      expect(options[6]).toHaveTextContent('expired')
      expect(options[7]).toHaveTextContent('terminated')
    })

    it('should update lifecycle status state when option is selected', async () => {
      renderWithRouter(<SearchPage />)

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'executed')

      expect(statusSelect).toHaveValue('executed')
    })

    it('should format underscored status values with spaces in options', () => {
      renderWithRouter(<SearchPage />)

      const statusSelect = screen.getAllByRole('combobox')[2]
      const option = within(statusSelect).getByRole('option', { name: /pending signature/i })

      expect(option).toBeInTheDocument()
      expect(option).toHaveValue('pending_signature')
    })
  })

  describe('Search Input', () => {
    it('should update search query when user types', async () => {
      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test query')

      expect(searchInput).toHaveValue('test query')
    })

    it('should handle empty search input', async () => {
      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test')
      await user.clear(searchInput)

      expect(searchInput).toHaveValue('')
    })

    it('should handle special characters in search input', async () => {
      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, '!@#$%^&*()')

      expect(searchInput).toHaveValue('!@#$%^&*()')
    })
  })

  describe('Clear Filters Button', () => {
    it('should show Clear button when search query is entered', async () => {
      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test')

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should show Clear button when jurisdiction is selected', async () => {
      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should show Clear button when contract type is selected', async () => {
      renderWithRouter(<SearchPage />)

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should show Clear button when lifecycle status is selected', async () => {
      renderWithRouter(<SearchPage />)

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'executed')

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should clear all filters and results when Clear is clicked', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [{ id: 1, title: 'Test Contract', lifecycle_status: 'draft' }],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test')

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'executed')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument()
      })

      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
      expect(jurisdictionSelect).toHaveValue('')
      expect(typeSelect).toHaveValue('')
      expect(statusSelect).toHaveValue('')
      expect(screen.queryByText(/result/i)).not.toBeInTheDocument()
    })
  })

  describe('Search Submission', () => {
    it('should call API with query parameter when search is submitted with text', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test query')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test query' },
        })
      })
    })

    it('should trim whitespace from search query', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, '  test query  ')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test query' },
        })
      })
    })

    it('should not include query parameter when search text is only whitespace', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, '   ')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {},
        })
      })
    })

    it('should call API with all filter parameters when all filters are selected', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test')

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'executed')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {
            q: 'test',
            jurisdiction: 'EU',
            contract_type: 'NDA',
            lifecycle_status: 'executed',
          },
        })
      })
    })

    it('should call API with only selected filters', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'US')

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'draft')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {
            jurisdiction: 'US',
            lifecycle_status: 'draft',
          },
        })
      })
    })

    it('should call API with empty params when no filters are selected', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {},
        })
      })
    })

    it('should submit form when Enter key is pressed in search input', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test query{Enter}')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'test query' },
        })
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator when search is in progress', async () => {
      api.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { total: 0, items: [] } }), 100))
      )

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      expect(screen.getByRole('button', { name: /…/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /…/i })).toBeDisabled()
    })

    it('should restore search button after loading completes', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should disable search button while loading', async () => {
      api.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { total: 0, items: [] } }), 100))
      )

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      expect(searchButton).toBeDisabled()
    })
  })

  describe('Search Results - Empty State', () => {
    it('should display "No matches found" when search returns zero results', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/0 results/i)).toBeInTheDocument()
        expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
      })
    })

    it('should show "0 results" header for empty results', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/0 results/i)).toBeInTheDocument()
      })
    })
  })

  describe('Search Results - Single Result', () => {
    it('should display "1 result" (singular) when search returns one item', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Test Contract',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/1 result$/i)).toBeInTheDocument()
      })
    })

    it('should render contract with title', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Test Contract',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /test contract/i })).toBeInTheDocument()
      })
    })

    it('should use original_filename when title is not available', async () => {
      api.get.mockResolvedValueOnce({
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

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /contract\.pdf/i })).toBeInTheDocument()
      })
    })

    it('should render link to contract detail page', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 123,
              title: 'Test Contract',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /test contract/i })
        expect(link).toHaveAttribute('href', '/contracts/123')
      })
    })
  })

  describe('Search Results - Multiple Results', () => {
    it('should display "results" (plural) when search returns multiple items', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 5,
          items: [
            { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
            { id: 2, title: 'Contract 2', lifecycle_status: 'executed' },
            { id: 3, title: 'Contract 3', lifecycle_status: 'review' },
            { id: 4, title: 'Contract 4', lifecycle_status: 'approval' },
            { id: 5, title: 'Contract 5', lifecycle_status: 'expired' },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/5 results/i)).toBeInTheDocument()
      })
    })

    it('should render all contract items', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 3,
          items: [
            { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
            { id: 2, title: 'Contract 2', lifecycle_status: 'executed' },
            { id: 3, title: 'Contract 3', lifecycle_status: 'review' },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /contract 1/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /contract 2/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /contract 3/i })).toBeInTheDocument()
      })
    })

    it('should render StatusBadge for each contract', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 2,
          items: [
            { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
            { id: 2, title: 'Contract 2', lifecycle_status: 'executed' },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const badges = screen.getAllByTestId('status-badge')
        expect(badges).toHaveLength(2)
        expect(badges[0]).toHaveTextContent('draft')
        expect(badges[1]).toHaveTextContent('executed')
      })
    })
  })

  describe('Search Results - Contract Metadata', () => {
    it('should display contract type when available', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Test Contract',
              contract_type: 'NDA',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('NDA')).toBeInTheDocument()
      })
    })

    it('should display counterparty name when available', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Test Contract',
              counterparty_name: 'Acme Corp',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/acme corp/i)).toBeInTheDocument()
      })
    })

    it('should display jurisdiction badge when available', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Test Contract',
              jurisdiction: 'EU',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('EU')).toBeInTheDocument()
      })
    })

    it('should display all metadata fields when all are available', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Complete Contract',
              contract_type: 'MSA',
              counterparty_name: 'Tech Inc',
              jurisdiction: 'US',
              lifecycle_status: 'executed',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('MSA')).toBeInTheDocument()
        expect(screen.getByText(/tech inc/i)).toBeInTheDocument()
        expect(screen.getByText('US')).toBeInTheDocument()
      })
    })

    it('should handle contracts with missing metadata fields', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Minimal Contract',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /minimal contract/i })).toBeInTheDocument()
      })
    })

    it('should handle contracts with null metadata fields', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Contract',
              contract_type: null,
              counterparty_name: null,
              jurisdiction: null,
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /contract/i })).toBeInTheDocument()
      })
    })

    it('should handle contracts with undefined metadata fields', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Contract',
              lifecycle_status: 'draft',
              contract_type: undefined,
              counterparty_name: undefined,
              jurisdiction: undefined,
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /contract/i })).toBeInTheDocument()
      })
    })

    it('should handle contracts with empty string metadata fields', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Contract',
              contract_type: '',
              counterparty_name: '',
              jurisdiction: '',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /contract/i })).toBeInTheDocument()
      })
    })
  })

  describe('Search Results - Header Information', () => {
    it('should display search query in results header', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 2, items: [
          { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
          { id: 2, title: 'Contract 2', lifecycle_status: 'draft' },
        ]},
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test query')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/"test query"/i)).toBeInTheDocument()
      })
    })

    it('should display jurisdiction in results header', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 1, title: 'Contract', lifecycle_status: 'draft' }] },
      })

      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const resultsHeader = screen.getByText(/1 result/i).parentElement
        expect(resultsHeader).toHaveTextContent('EU')
      })
    })

    it('should display contract type in results header', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 1, title: 'Contract', lifecycle_status: 'draft' }] },
      })

      renderWithRouter(<SearchPage />)

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const resultsHeader = screen.getByText(/1 result/i).parentElement
        expect(resultsHeader).toHaveTextContent('NDA')
      })
    })

    it('should display lifecycle status in results header with formatted text', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 1, title: 'Contract', lifecycle_status: 'draft' }] },
      })

      renderWithRouter(<SearchPage />)

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'pending_signature')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const resultsHeader = screen.getByText(/1 result/i).parentElement
        expect(resultsHeader).toHaveTextContent('pending signature')
      })
    })

    it('should display all filters in results header', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 5, items: [
          { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
          { id: 2, title: 'Contract 2', lifecycle_status: 'draft' },
          { id: 3, title: 'Contract 3', lifecycle_status: 'draft' },
          { id: 4, title: 'Contract 4', lifecycle_status: 'draft' },
          { id: 5, title: 'Contract 5', lifecycle_status: 'draft' },
        ] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'important')

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'US')

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'MSA')

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'executed')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const resultsHeader = screen.getByText(/5 results/i).parentElement
        expect(resultsHeader).toHaveTextContent('important')
        expect(resultsHeader).toHaveTextContent('US')
        expect(resultsHeader).toHaveTextContent('MSA')
        expect(resultsHeader).toHaveTextContent('executed')
      })
    })
  })

  describe('Error Handling', () => {
    it('should restore loading state when API call fails', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'))

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should not display results when API call fails', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'))

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.queryByText(/result/i)).not.toBeInTheDocument()
      })
    })

    it('should handle API returning null data', async () => {
      api.get.mockResolvedValueOnce({ data: null })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should handle API returning undefined data', async () => {
      api.get.mockResolvedValueOnce({ data: undefined })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should handle malformed API response', async () => {
      api.get.mockResolvedValueOnce({})

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should handle network errors gracefully', async () => {
      api.get.mockRejectedValueOnce(new Error('Network Error'))

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should handle 500 server errors gracefully', async () => {
      api.get.mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Internal Server Error' } },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should handle 404 errors gracefully', async () => {
      api.get.mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Not Found' } },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle results with missing id field', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              title: 'Contract without ID',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument()
      })
    })

    it('should handle results with id of 0', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 0,
              title: 'Contract with ID 0',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /contract with id 0/i })
        expect(link).toHaveAttribute('href', '/contracts/0')
      })
    })

    it('should handle results with negative id', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: -1,
              title: 'Contract with negative ID',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /contract with negative id/i })
        expect(link).toHaveAttribute('href', '/contracts/-1')
      })
    })

    it('should handle results with very large total count', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 999999,
          items: [
            { id: 1, title: 'Contract', lifecycle_status: 'draft' },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/999999 results/i)).toBeInTheDocument()
      })
    })

    it('should handle empty items array with non-zero total', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 5,
          items: [],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/5 results/i)).toBeInTheDocument()
      })
    })

    it('should handle null items array', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 0,
          items: null,
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })
    })

    it('should handle very long contract titles', async () => {
      const longTitle = 'A'.repeat(500)
      api.get.mockResolvedValueOnce({
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

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(longTitle)).toBeInTheDocument()
      })
    })

    it('should handle special characters in contract titles', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: '<script>alert("xss")</script>',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument()
      })
    })

    it('should handle unicode characters in contract titles', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: '合同 📄 契約書',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('合同 📄 契約書')).toBeInTheDocument()
      })
    })

    it('should handle contracts without title or original_filename', async () => {
      api.get.mockResolvedValueOnce({
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

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument()
      })
    })

    it('should handle contracts with title as empty string', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: '',
              original_filename: 'backup.pdf',
              lifecycle_status: 'draft',
            },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('backup.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('Multiple Search Operations', () => {
    it('should allow multiple consecutive searches', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 1, title: 'First', lifecycle_status: 'draft' }] },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/first/i)).toBeInTheDocument()
      })

      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 2, title: 'Second', lifecycle_status: 'draft' }] },
      })

      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/second/i)).toBeInTheDocument()
        expect(screen.queryByText(/first/i)).not.toBeInTheDocument()
      })
    })

    it('should update results when searching with different filters', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 1, title: 'EU Contract', lifecycle_status: 'draft' }] },
      })

      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/eu contract/i)).toBeInTheDocument()
      })

      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 2, title: 'US Contract', lifecycle_status: 'draft' }] },
      })

      await user.selectOptions(jurisdictionSelect, 'US')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/us contract/i)).toBeInTheDocument()
        expect(screen.queryByText(/eu contract/i)).not.toBeInTheDocument()
      })
    })

    it('should preserve form values after a successful search', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test query')

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/0 results/i)).toBeInTheDocument()
      })

      expect(searchInput).toHaveValue('test query')
      expect(jurisdictionSelect).toHaveValue('EU')
    })

    it('should preserve form values after a failed search', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'))

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'test query')

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'NDA')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
      })

      expect(searchInput).toHaveValue('test query')
      expect(typeSelect).toHaveValue('NDA')
    })
  })

  describe('Boundary Value Testing', () => {
    it('should handle total count of exactly 1', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [{ id: 1, title: 'Single Contract', lifecycle_status: 'draft' }],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/1 result$/i)).toBeInTheDocument()
      })
    })

    it('should handle total count of exactly 2', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 2,
          items: [
            { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
            { id: 2, title: 'Contract 2', lifecycle_status: 'draft' },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/2 results/i)).toBeInTheDocument()
      })
    })

    it('should handle search query with single character', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'a')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: 'a' },
        })
      })
    })

    it('should handle maximum length search query', async () => {
      const longQuery = 'a'.repeat(10000)
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, longQuery)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: { q: longQuery },
        })
      })
    })
  })

  describe('Form Interaction Combinations', () => {
    it('should allow changing filters after initial search', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 1, items: [{ id: 1, title: 'First Search', lifecycle_status: 'draft' }] },
      })

      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      await user.type(searchInput, 'first')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/first search/i)).toBeInTheDocument()
      })

      await user.clear(searchInput)
      await user.type(searchInput, 'second')

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'US')

      expect(searchInput).toHaveValue('second')
      expect(jurisdictionSelect).toHaveValue('US')
    })

    it('should support selecting all dropdowns without search query', async () => {
      api.get.mockResolvedValueOnce({
        data: { total: 0, items: [] },
      })

      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'APAC')

      const typeSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(typeSelect, 'Partnership')

      const statusSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(statusSelect, 'terminated')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/search/repository', {
          params: {
            jurisdiction: 'APAC',
            contract_type: 'Partnership',
            lifecycle_status: 'terminated',
          },
        })
      })
    })

    it('should allow resetting individual dropdown selections', async () => {
      renderWithRouter(<SearchPage />)

      const jurisdictionSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(jurisdictionSelect, 'EU')
      expect(jurisdictionSelect).toHaveValue('EU')

      await user.selectOptions(jurisdictionSelect, '')
      expect(jurisdictionSelect).toHaveValue('')
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form controls', () => {
      renderWithRouter(<SearchPage />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getAllByRole('combobox')).toHaveLength(3)
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('should have properly labeled form controls', () => {
      renderWithRouter(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search contracts by keyword/i)
      expect(searchInput).toHaveAttribute('placeholder')

      const selects = screen.getAllByRole('combobox')
      selects.forEach((select) => {
        expect(select).toBeInTheDocument()
      })
    })

    it('should render results as a list structure', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 2,
          items: [
            { id: 1, title: 'Contract 1', lifecycle_status: 'draft' },
            { id: 2, title: 'Contract 2', lifecycle_status: 'draft' },
          ],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument()
        expect(screen.getAllByRole('listitem')).toHaveLength(2)
      })
    })

    it('should render links with proper href attributes', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          total: 1,
          items: [{ id: 42, title: 'Test Contract', lifecycle_status: 'draft' }],
        },
      })

      renderWithRouter(<SearchPage />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /test contract/i })
        expect(link).toHaveAttribute('href', '/contracts/42')
      })
    })
  })
})
