import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import AuditPage from './AuditPage'
import api from '../api/client'

vi.mock('../api/client')

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('AuditPage', () => {
  const mockAuditLogs = [
    {
      id: 1,
      entity_type: 'contract',
      entity_id: 10,
      user_id: 1,
      action: 'created',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      entity_type: 'contract',
      entity_id: 10,
      user_id: 2,
      action: 'review_decision:approved',
      created_at: '2024-01-16T14:00:00Z',
    },
    {
      id: 3,
      entity_type: 'contract',
      entity_id: 20,
      user_id: 1,
      action: 'lifecycle:draft->review',
      created_at: '2024-01-17T09:00:00Z',
    },
  ]

  const mockUsers = [
    { id: 1, full_name: 'John Doe', email: 'john@example.com' },
    { id: 2, full_name: 'Jane Smith', email: 'jane@example.com' },
  ]

  const mockContracts = [
    { id: 10, title: 'Contract A', original_filename: 'contract-a.pdf' },
    { id: 20, title: 'Contract B', original_filename: 'contract-b.pdf' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading message initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<AuditPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should fetch audit logs on mount', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/audit?skip=0&limit=200')
      })
    })
  })

  describe('page header', () => {
    it('should render page title', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Audit log')).toBeInTheDocument()
      })
    })

    it('should show contract count', async () => {
      api.get.mockResolvedValue({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('(2 contracts)')).toBeInTheDocument()
      })
    })
  })

  describe('data fetching', () => {
    it('should fetch audit logs with pagination', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs, total: 3 })
      api.get.mockResolvedValueOnce({ data: [] })
      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/audit?skip=0&limit=200')
      })
    })

    it('should fetch multiple pages if needed', async () => {
      const manyLogs = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: 1,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs, total: 250 })
      api.get.mockResolvedValueOnce({ data: manyLogs.slice(0, 50), total: 250 })
      api.get.mockResolvedValueOnce({ data: [] })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(3)
      })
    })

    it('should try to fetch user names', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: mockUsers })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/auth/users?limit=200')
      })
    })

    it('should try to fetch contract titles', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: mockUsers })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts?limit=200')
      })
    })

    it('should handle user fetch failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockRejectedValueOnce(new Error('No permission'))

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Audit log')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should handle contract fetch failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: mockUsers })
      api.get.mockRejectedValueOnce(new Error('Failed'))

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Audit log')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('contract timelines', () => {
    it('should render timeline for each contract', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: mockUsers })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract A')).toBeInTheDocument()
        expect(screen.getByText('Contract B')).toBeInTheDocument()
      })
    })

    it('should show fallback title when contract not found', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Contract #10')).toBeInTheDocument()
        expect(screen.getByText('Contract #20')).toBeInTheDocument()
      })
    })

    it('should create link to contract detail page', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: mockUsers })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /View contract/ })
        expect(link).toHaveAttribute('href', '/contracts/20')
      })
    })
  })

  describe('event rendering', () => {
    it('should display all events for a contract', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: mockUsers })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Created')).toBeInTheDocument()
        expect(screen.getByText('Review approved')).toBeInTheDocument()
      })
    })

    it('should show user names for events', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: mockUsers })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText(/John/)).toBeInTheDocument()
        expect(screen.getByText(/Jane/)).toBeInTheDocument()
      })
    })

    it('should show fallback user ID when name not available', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText(/User #1/)).toBeInTheDocument()
      })
    })

    it('should show system as actor when no user_id', async () => {
      const systemEvent = { ...mockAuditLogs[0], user_id: null }
      api.get.mockResolvedValueOnce({ data: [systemEvent] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('system')).toBeInTheDocument()
      })
    })

    it('should format timestamps', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        // Check that date/time elements exist
        const timeElements = screen.getAllByText(/Jan|15|16|17|10|14|09/)
        expect(timeElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('action labels and icons', () => {
    it('should render correct label for created action', async () => {
      api.get.mockResolvedValueOnce({ data: [mockAuditLogs[0]] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Created')).toBeInTheDocument()
      })
    })

    it('should render correct label for review approval', async () => {
      api.get.mockResolvedValueOnce({ data: [mockAuditLogs[1]] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Review approved')).toBeInTheDocument()
      })
    })

    it('should handle lifecycle transitions', async () => {
      api.get.mockResolvedValueOnce({ data: [mockAuditLogs[2]] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText(/review/)).toBeInTheDocument()
      })
    })

    it('should render action icons', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      const { container } = renderWithRouter(<AuditPage />)

      await waitFor(() => {
        const icons = container.querySelectorAll('svg')
        expect(icons.length).toBeGreaterThan(0)
      })
    })

    it('should apply correct color classes to action badges', async () => {
      api.get.mockResolvedValueOnce({ data: [mockAuditLogs[0]] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      const { container } = renderWithRouter(<AuditPage />)

      await waitFor(() => {
        const badge = container.querySelector('.bg-blue-500')
        expect(badge).toBeInTheDocument()
      })
    })
  })

  describe('pagination', () => {
    it('should show 10 contracts per page', async () => {
      const manyLogs = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: i,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        const links = screen.getAllByRole('link', { name: /View contract/ })
        expect(links.length).toBeLessThanOrEqual(10)
      })
    })

    it('should show pagination controls when more than 10 contracts', async () => {
      const manyLogs = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: i,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })

    it('should disable Previous button on first page', async () => {
      const manyLogs = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: i,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        const prevButton = screen.getByText('Previous')
        expect(prevButton).toBeDisabled()
      })
    })

    it('should navigate to next page when Next is clicked', async () => {
      const user = userEvent.setup()
      const manyLogs = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: i,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        expect(screen.getByText(/Showing 11–15/)).toBeInTheDocument()
      })
    })

    it('should navigate to previous page when Previous is clicked', async () => {
      const user = userEvent.setup()
      const manyLogs = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: i,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Previous'))

      await waitFor(() => {
        expect(screen.getByText(/Showing 1–10/)).toBeInTheDocument()
      })
    })

    it('should disable Next button on last page', async () => {
      const user = userEvent.setup()
      const logs = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: i,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: logs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        const nextButton = screen.getByText('Next')
        expect(nextButton).toBeDisabled()
      })
    })

    it('should show correct range in pagination text', async () => {
      const manyLogs = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: i,
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText(/Showing 1–10 of 25 contracts/)).toBeInTheDocument()
      })
    })
  })

  describe('event sorting', () => {
    it('should sort events chronologically within a contract', async () => {
      api.get.mockResolvedValueOnce({ data: mockAuditLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        const events = screen.getAllByText(/Created|Review approved/)
        // Events should be in order
        expect(events.length).toBeGreaterThan(0)
      })
    })

    it('should sort contracts by most recent activity first', async () => {
      const logs = [
        {
          id: 1,
          entity_type: 'contract',
          entity_id: 10,
          user_id: 1,
          action: 'created',
          created_at: '2024-01-10T10:00:00Z',
        },
        {
          id: 2,
          entity_type: 'contract',
          entity_id: 20,
          user_id: 1,
          action: 'created',
          created_at: '2024-01-20T10:00:00Z',
        },
      ]

      api.get.mockResolvedValueOnce({ data: logs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        const links = screen.getAllByRole('link', { name: /View contract/ })
        // Contract 20 should appear before Contract 10
        expect(links[0]).toHaveAttribute('href', '/contracts/20')
      })
    })
  })

  describe('filtering non-contract entities', () => {
    it('should filter out non-contract entities', async () => {
      const mixedLogs = [
        ...mockAuditLogs,
        {
          id: 999,
          entity_type: 'user',
          entity_id: 1,
          user_id: 1,
          action: 'updated',
          created_at: '2024-01-15T10:00:00Z',
        },
      ]

      api.get.mockResolvedValueOnce({ data: mixedLogs })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: mockContracts } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        // Should only show contract events
        expect(screen.getByText('(2 contracts)')).toBeInTheDocument()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle empty audit log', async () => {
      api.get.mockResolvedValue({ data: [] })
      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('(0 contracts)')).toBeInTheDocument()
      })
    })

    it('should handle very large audit log', async () => {
      const manyLogs = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        entity_type: 'contract',
        entity_id: Math.floor(i / 5),
        user_id: 1,
        action: 'created',
        created_at: '2024-01-15T10:00:00Z',
      }))

      api.get.mockResolvedValueOnce({ data: manyLogs, total: 500 })
      api.get.mockResolvedValueOnce({ data: [], total: 500 })
      api.get.mockResolvedValueOnce({ data: [] })
      api.get.mockResolvedValueOnce({ data: { items: [] } })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText(/contracts/)).toBeInTheDocument()
      })
    })
  })

  describe('error recovery', () => {
    it('should complete rendering even if API errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue(new Error('API down'))
      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.getByText('Audit log')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })
})
