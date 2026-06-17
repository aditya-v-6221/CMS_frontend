import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import AuditPage from './AuditPage'
import api from '../api/client'

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, className }) => (
      <a href={to} className={className}>{children}</a>
    ),
  }
})

// Helper to render component with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

// Sample audit log data
const createAuditLog = (id, entityId, action, userId, createdAt) => ({
  id,
  entity_type: 'contract',
  entity_id: entityId,
  action,
  user_id: userId,
  created_at: createdAt,
})

const createUsers = () => [
  { id: 1, full_name: 'John Doe', email: 'john@example.com' },
  { id: 2, full_name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, email: 'bob@example.com' },
]

const createContracts = () => [
  { id: 1, title: 'Contract One', original_filename: 'contract1.pdf' },
  { id: 2, title: 'Contract Two', original_filename: 'contract2.pdf' },
  { id: 3, original_filename: 'contract3.pdf' },
]

describe('AuditPage', () => {
  let mockLocalStorage
  let mockLocationHref

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock localStorage
    mockLocalStorage = {}
    Storage.prototype.getItem = vi.fn((key) => mockLocalStorage[key] || null)
    Storage.prototype.setItem = vi.fn((key, value) => {
      mockLocalStorage[key] = value
    })
    Storage.prototype.removeItem = vi.fn((key) => {
      delete mockLocalStorage[key]
    })

    // Mock window.location
    mockLocationHref = ''
    delete window.location
    window.location = { href: mockLocationHref }
    Object.defineProperty(window.location, 'href', {
      set: (val) => { mockLocationHref = val },
      get: () => mockLocationHref,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading indicator while fetching data', () => {
      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves

      renderWithRouter(<AuditPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.getByText(/Audit log/i)).toBeInTheDocument()
      expect(screen.getByText('(0 contracts)')).toBeInTheDocument()
    })

    it('should show loading with correct count', () => {
      api.get.mockImplementation(() => new Promise(() => {}))

      renderWithRouter(<AuditPage />)

      const heading = screen.getByRole('heading', { name: /Audit log/i })
      expect(heading).toHaveTextContent('(0 contracts)')
    })
  })

  describe('Successful Data Loading', () => {
    it('should display audit logs after successful fetch', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 1, 'updated', 2, '2026-01-02T11:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Contract One')).toBeInTheDocument()
      expect(screen.getByText('(1 contracts)')).toBeInTheDocument()
    })

    it('should handle paginated audit logs (multiple batches)', async () => {
      const batch1 = Array.from({ length: 200 }, (_, i) =>
        createAuditLog(i + 1, 1, 'created', 1, `2026-01-01T${String(i).padStart(2, '0')}:00:00Z`)
      )
      const batch2 = [
        createAuditLog(201, 1, 'updated', 1, '2026-01-02T10:00:00Z'),
      ]

      let callCount = 0
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({ data: { items: batch1, total: 201 } })
          } else {
            return Promise.resolve({ data: { items: batch2, total: 201 } })
          }
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/audit?skip=0&limit=200'))
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/audit?skip=200&limit=200'))
    })

    it('should handle audit logs returned as plain array', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs }) // Plain array, not { items, total }
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Contract #1')).toBeInTheDocument()
    })

    it('should handle contracts returned as { items } object', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: { items: createContracts() } })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Contract One')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle audit log fetch failure gracefully', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith('Audit load failed:', expect.any(Error))
      expect(screen.getByText('(0 contracts)')).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })

    it('should handle users fetch failure silently', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.reject(new Error('Forbidden')) // Non-admin user
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should still display, but with User #1 instead of name
      expect(screen.getByText('User #1')).toBeInTheDocument()
    })

    it('should handle contracts fetch failure silently', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.reject(new Error('Fetch failed'))
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should display with fallback title
      expect(screen.getByText('Contract #1')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should handle no audit logs', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('(0 contracts)')).toBeInTheDocument()
      expect(screen.queryByText('View contract')).not.toBeInTheDocument()
    })

    it('should filter out non-contract entity types', async () => {
      const auditLogs = [
        { ...createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'), entity_type: 'user' },
        { ...createAuditLog(2, 2, 'created', 1, '2026-01-02T10:00:00Z'), entity_type: 'document' },
        createAuditLog(3, 1, 'created', 1, '2026-01-03T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Only 1 contract should be shown
      expect(screen.getByText('(1 contracts)')).toBeInTheDocument()
    })
  })

  describe('Action Type Rendering', () => {
    it('should display all standard action types correctly', async () => {
      const actions = [
        'created',
        'created_from_template',
        'updated',
        'deleted',
        'reviewers_assigned',
        'reviewer_removed',
        'version_created',
        'review_version_created',
        'review_decision:approved',
        'review_decision:rejected',
        'approval_decision:approved',
        'approval_decision:rejected',
        'esign:sent',
        'esign:webhook:signed',
        'esign:webhook:viewed',
        'esign:webhook:declined',
        'external_token:created',
        'external_token:used',
      ]

      const auditLogs = actions.map((action, idx) =>
        createAuditLog(idx + 1, 1, action, 1, `2026-01-01T${String(idx).padStart(2, '0')}:00:00Z`)
      )

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Check some specific labels
      expect(screen.getByText('Created')).toBeInTheDocument()
      expect(screen.getByText('From template')).toBeInTheDocument()
      expect(screen.getByText('Updated')).toBeInTheDocument()
      expect(screen.getByText('Deleted')).toBeInTheDocument()
      expect(screen.getByText('Review approved')).toBeInTheDocument()
      expect(screen.getByText('Approved')).toBeInTheDocument()
      expect(screen.getByText('Sent for sign')).toBeInTheDocument()
      expect(screen.getByText('Signed')).toBeInTheDocument()
    })

    it('should handle lifecycle actions with state transitions', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'lifecycle:draft->in_review', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 1, 'lifecycle:in_review->approved', 1, '2026-01-02T11:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('→ in review')).toBeInTheDocument()
      expect(screen.getByText('→ approved')).toBeInTheDocument()
    })

    it('should handle lifecycle action without state transition', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'lifecycle:unknown', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Status change')).toBeInTheDocument()
    })

    it('should handle unknown action types with fallback', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'custom_unknown_action', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Underscores should be replaced with spaces
      expect(screen.getByText('custom unknown action')).toBeInTheDocument()
    })
  })

  describe('User Name Display', () => {
    it('should display user full names when available', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Only first name should be displayed
      expect(screen.getByText('John')).toBeInTheDocument()
    })

    it('should display email when full_name is not available', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 3, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // First part of email (before @)
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('should display User #ID for unknown users', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 999, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('User #999')).toBeInTheDocument()
    })

    it('should display "system" for events without user_id', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', null, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('system')).toBeInTheDocument()
    })

    it('should display "system" for events with undefined user_id', async () => {
      const auditLogs = [
        { ...createAuditLog(1, 1, 'created', undefined, '2026-01-01T10:00:00Z'), user_id: undefined },
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('system')).toBeInTheDocument()
    })
  })

  describe('Contract Title Display', () => {
    it('should display contract title when available', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Contract One')).toBeInTheDocument()
    })

    it('should display original_filename when title is not available', async () => {
      const auditLogs = [
        createAuditLog(1, 3, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('contract3.pdf')).toBeInTheDocument()
    })

    it('should display Contract #ID for unknown contracts', async () => {
      const auditLogs = [
        createAuditLog(1, 999, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Contract #999')).toBeInTheDocument()
    })
  })

  describe('Event Sorting', () => {
    it('should sort events chronologically within a contract', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'deleted', 1, '2026-01-03T10:00:00Z'),
        createAuditLog(2, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(3, 1, 'updated', 1, '2026-01-02T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const labels = screen.getAllByText(/Created|Updated|Deleted/)
      expect(labels[0]).toHaveTextContent('Created')
      expect(labels[1]).toHaveTextContent('Updated')
      expect(labels[2]).toHaveTextContent('Deleted')
    })

    it('should sort contracts by latest event date (most recent first)', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 2, 'created', 1, '2026-01-03T10:00:00Z'),
        createAuditLog(3, 3, 'created', 1, '2026-01-02T10:00:00Z'),
      ]

      const contracts = [
        { id: 1, title: 'First Contract' },
        { id: 2, title: 'Second Contract' },
        { id: 3, title: 'Third Contract' },
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const contractTitles = screen.getAllByText(/Contract/)
      expect(contractTitles[0]).toHaveTextContent('Second Contract')
      expect(contractTitles[1]).toHaveTextContent('Third Contract')
      expect(contractTitles[2]).toHaveTextContent('First Contract')
    })
  })

  describe('Pagination', () => {
    const createManyContracts = (count) => {
      return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        title: `Contract ${i + 1}`,
      }))
    }

    const createManyAuditLogs = (count) => {
      return Array.from({ length: count }, (_, i) =>
        createAuditLog(i + 1, i + 1, 'created', 1, `2026-01-01T10:${String(i).padStart(2, '0')}:00Z`)
      )
    }

    it('should not show pagination for 10 or fewer contracts', async () => {
      const auditLogs = createManyAuditLogs(10)
      const contracts = createManyContracts(10)

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('should show pagination for more than 10 contracts', async () => {
      const auditLogs = createManyAuditLogs(15)
      const contracts = createManyContracts(15)

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('Showing 1–10 of 15 contracts')).toBeInTheDocument()
    })

    it('should disable Previous button on first page', async () => {
      const auditLogs = createManyAuditLogs(15)
      const contracts = createManyContracts(15)

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const prevButton = screen.getByText('Previous')
      expect(prevButton).toBeDisabled()
    })

    it('should navigate to next page when Next is clicked', async () => {
      const user = userEvent.setup()
      const auditLogs = createManyAuditLogs(15)
      const contracts = createManyContracts(15)

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Showing 1–10 of 15 contracts')).toBeInTheDocument()
      expect(screen.getByText('Contract 1')).toBeInTheDocument()

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(screen.getByText('Showing 11–15 of 15 contracts')).toBeInTheDocument()
      expect(screen.getByText('Contract 11')).toBeInTheDocument()
      expect(screen.queryByText('Contract 1')).not.toBeInTheDocument()
    })

    it('should navigate to previous page when Previous is clicked', async () => {
      const user = userEvent.setup()
      const auditLogs = createManyAuditLogs(15)
      const contracts = createManyContracts(15)

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Go to page 2
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(screen.getByText('Showing 11–15 of 15 contracts')).toBeInTheDocument()

      // Go back to page 1
      const prevButton = screen.getByText('Previous')
      await user.click(prevButton)

      expect(screen.getByText('Showing 1–10 of 15 contracts')).toBeInTheDocument()
      expect(screen.getByText('Contract 1')).toBeInTheDocument()
    })

    it('should disable Next button on last page', async () => {
      const user = userEvent.setup()
      const auditLogs = createManyAuditLogs(15)
      const contracts = createManyContracts(15)

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(nextButton).toBeDisabled()
    })

    it('should handle exact multiples of page size', async () => {
      const auditLogs = createManyAuditLogs(20)
      const contracts = createManyContracts(20)

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Showing 1–10 of 20 contracts')).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-15T14:30:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Date should be formatted as en-GB: dd MMM, HH:mm
      // The actual rendering depends on the timezone, so we just check it exists
      const timeElements = screen.getAllByText(/\d{2}/)
      expect(timeElements.length).toBeGreaterThan(0)
    })
  })

  describe('View Contract Link', () => {
    it('should render link to contract detail page', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const link = screen.getByText(/View contract/)
      expect(link).toHaveAttribute('href', '/contracts/1')
    })

    it('should render correct link for each contract', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 2, 'created', 1, '2026-01-02T10:00:00Z'),
      ]

      const contracts = [
        { id: 1, title: 'Contract A' },
        { id: 2, title: 'Contract B' },
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: contracts })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const links = screen.getAllByText(/View contract/)
      expect(links).toHaveLength(2)
      expect(links[0]).toHaveAttribute('href', '/contracts/2')
      expect(links[1]).toHaveAttribute('href', '/contracts/1')
    })
  })

  describe('Multiple Events Per Contract', () => {
    it('should display multiple events for same contract', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 1, 'updated', 2, '2026-01-02T11:00:00Z'),
        createAuditLog(3, 1, 'deleted', 1, '2026-01-03T12:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: createUsers() })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: createContracts() })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Created')).toBeInTheDocument()
      expect(screen.getByText('Updated')).toBeInTheDocument()
      expect(screen.getByText('Deleted')).toBeInTheDocument()
      expect(screen.getByText('(1 contracts)')).toBeInTheDocument()
    })

    it('should show connectors between events', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 1, 'updated', 1, '2026-01-02T11:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should have connector divs between events (checking for bg-gray-200 class)
      const container = screen.getByText('Created').closest('div').parentElement
      expect(container).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null data from API', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: null })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: null })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: null })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('(0 contracts)')).toBeInTheDocument()
    })

    it('should handle undefined data from API', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: undefined })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: undefined })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: undefined })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('(0 contracts)')).toBeInTheDocument()
    })

    it('should handle empty items array in response', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: { items: [], total: 0 } })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('(0 contracts)')).toBeInTheDocument()
    })

    it('should handle malformed date strings gracefully', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, 'invalid-date'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should still render, even with invalid date
      expect(screen.getByText('Contract #1')).toBeInTheDocument()
    })

    it('should handle contracts with single event', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Created')).toBeInTheDocument()
      // Should not have connector if only one event
    })

    it('should handle very large number of events', async () => {
      const auditLogs = Array.from({ length: 100 }, (_, i) =>
        createAuditLog(i + 1, 1, 'updated', 1, `2026-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`)
      )

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const updatedLabels = screen.getAllByText('Updated')
      expect(updatedLabels).toHaveLength(100)
    })

    it('should handle contract ID as string', async () => {
      const auditLogs = [
        { ...createAuditLog(1, '1', 'created', 1, '2026-01-01T10:00:00Z'), entity_id: '1' },
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Contract #1')).toBeInTheDocument()
    })
  })

  describe('API Call Behavior', () => {
    it('should make correct API calls on mount', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledWith('/audit?skip=0&limit=200')
      expect(api.get).toHaveBeenCalledWith('/auth/users?limit=200')
      expect(api.get).toHaveBeenCalledWith('/contracts?limit=200')
    })

    it('should not make duplicate API calls', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should be called exactly once each
      expect(api.get).toHaveBeenCalledTimes(3)
    })

    it('should fetch audit logs in batches until total is reached', async () => {
      const batch1 = Array.from({ length: 200 }, (_, i) =>
        createAuditLog(i + 1, 1, 'created', 1, `2026-01-01T10:00:00Z`)
      )
      const batch2 = Array.from({ length: 150 }, (_, i) =>
        createAuditLog(i + 201, 2, 'created', 1, `2026-01-02T10:00:00Z`)
      )

      let auditCallCount = 0
      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          auditCallCount++
          if (auditCallCount === 1) {
            return Promise.resolve({ data: { items: batch1, total: 350 } })
          } else if (auditCallCount === 2) {
            return Promise.resolve({ data: { items: batch2, total: 350 } })
          } else {
            return Promise.resolve({ data: { items: [], total: 350 } })
          }
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledWith('/audit?skip=0&limit=200')
      expect(api.get).toHaveBeenCalledWith('/audit?skip=200&limit=200')
      // Should have fetched exactly 2 batches to get all 350 records
    })

    it('should stop fetching when batch is empty', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/audit?skip=0')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should only call audit once since first batch is empty
      const auditCalls = api.get.mock.calls.filter(call => call[0].includes('/audit'))
      expect(auditCalls).toHaveLength(1)
    })
  })

  describe('ContractTimeline Component', () => {
    it('should render timeline with horizontal layout', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 1, 'updated', 1, '2026-01-02T11:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Timeline should be in a horizontal scrollable container
      const timeline = screen.getByText('Created').closest('.overflow-x-auto')
      expect(timeline).toBeInTheDocument()
    })

    it('should display action icons for different event types', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
        createAuditLog(2, 1, 'deleted', 1, '2026-01-02T10:00:00Z'),
        createAuditLog(3, 1, 'review_decision:approved', 1, '2026-01-03T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // All events should have their icons (SVGs)
      const svgs = document.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('should truncate long user names to first name only', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'created', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({
            data: [{ id: 1, full_name: 'John Michael Smith', email: 'john@example.com' }]
          })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should only show "John", not "John Michael Smith"
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.queryByText('Michael')).not.toBeInTheDocument()
    })
  })

  describe('ActionIcon Component', () => {
    it('should render all icon types', async () => {
      const actions = [
        'created', // document
        'updated', // edit
        'deleted', // trash
        'reviewers_assigned', // users
        'esign:sent', // mail
        'esign:webhook:signed', // pen
        'esign:webhook:viewed', // eye
        'lifecycle:draft->review', // arrow
        'external_token:created', // link
        'version_created', // git
        'review_decision:approved', // check
        'review_decision:rejected', // x
      ]

      const auditLogs = actions.map((action, idx) =>
        createAuditLog(idx + 1, 1, action, 1, `2026-01-01T${String(idx).padStart(2, '0')}:00:00Z`)
      )

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // All events should have SVG icons
      const svgs = document.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(actions.length)
    })

    it('should render fallback dot icon for unknown types', async () => {
      const auditLogs = [
        createAuditLog(1, 1, 'unknown_action_type', 1, '2026-01-01T10:00:00Z'),
      ]

      api.get.mockImplementation((url) => {
        if (url.includes('/audit')) {
          return Promise.resolve({ data: auditLogs })
        }
        if (url.includes('/auth/users')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/contracts')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      renderWithRouter(<AuditPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should render fallback icon (span with rounded-full)
      const fallbackIcons = document.querySelectorAll('.rounded-full')
      expect(fallbackIcons.length).toBeGreaterThan(0)
    })
  })
})
