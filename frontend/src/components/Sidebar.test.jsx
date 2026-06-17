import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'
import { AuthProvider } from '../context/AuthContext'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderSidebar(user = null) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  return render(
    <AuthProvider>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  describe('rendering', () => {
    it('should render sidebar with brand', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
    })

    it('should render as aside element', () => {
      const { container } = renderSidebar({ id: 1, email: 'test@test.com' })

      expect(container.querySelector('aside')).toBeInTheDocument()
    })

    it('should display user email in brand section', () => {
      renderSidebar({ id: 1, email: 'test@example.com', role: 'viewer' })

      const emails = screen.getAllByText('test@example.com')
      expect(emails.length).toBeGreaterThan(0)
    })

    it('should display user full name in brand section when available', () => {
      renderSidebar({ id: 1, email: 'test@test.com', full_name: 'John Doe', role: 'viewer' })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('navigation links - common for all users', () => {
    it('should render Dashboard link', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should render Templates link', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      expect(screen.getByText('Templates')).toBeInTheDocument()
    })

    it('should render Search link', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      expect(screen.getByText('Search')).toBeInTheDocument()
    })
  })

  describe('Upload Contract link - editor and admin only', () => {
    it('should show Upload Contract link for editor', () => {
      renderSidebar({ id: 1, email: 'editor@test.com', role: 'editor' })

      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
    })

    it('should show Upload Contract link for admin', () => {
      renderSidebar({ id: 1, email: 'admin@test.com', role: 'admin' })

      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
    })

    it('should not show Upload Contract link for reviewer', () => {
      renderSidebar({ id: 1, email: 'reviewer@test.com', role: 'reviewer' })

      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })

    it('should not show Upload Contract link for viewer', () => {
      renderSidebar({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })

    it('should not show Upload Contract link when role is undefined', () => {
      renderSidebar({ id: 1, email: 'test@test.com' })

      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })

    it('should not show Upload Contract link when role is null', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: null })

      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })
  })

  describe('admin-only links', () => {
    it('should show Deadline Tracker for admin', () => {
      renderSidebar({ id: 1, email: 'admin@test.com', role: 'admin' })

      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
    })

    it('should show Audit link for admin', () => {
      renderSidebar({ id: 1, email: 'admin@test.com', role: 'admin' })

      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    it('should not show Deadline Tracker for editor', () => {
      renderSidebar({ id: 1, email: 'editor@test.com', role: 'editor' })

      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })

    it('should not show Audit link for editor', () => {
      renderSidebar({ id: 1, email: 'editor@test.com', role: 'editor' })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not show Deadline Tracker for reviewer', () => {
      renderSidebar({ id: 1, email: 'reviewer@test.com', role: 'reviewer' })

      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })

    it('should not show Audit link for reviewer', () => {
      renderSidebar({ id: 1, email: 'reviewer@test.com', role: 'reviewer' })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not show Deadline Tracker for viewer', () => {
      renderSidebar({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })

    it('should not show Audit link for viewer', () => {
      renderSidebar({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })
  })

  describe('user display in footer', () => {
    it('should display user full_name when available', () => {
      renderSidebar({ id: 1, email: 'test@test.com', full_name: 'Jane Smith', role: 'admin' })

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should display email when full_name is not available', () => {
      renderSidebar({ id: 1, email: 'test@example.com', role: 'viewer' })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should display email when full_name is empty string', () => {
      renderSidebar({ id: 1, email: 'test@test.com', full_name: '', role: 'editor' })

      expect(screen.getByText('test@test.com')).toBeInTheDocument()
    })

    it('should display user role badge', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'admin' })

      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    it('should display viewer role correctly', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      expect(screen.getByText('viewer')).toBeInTheDocument()
    })

    it('should display editor role correctly', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'editor' })

      expect(screen.getByText('editor')).toBeInTheDocument()
    })

    it('should display reviewer role correctly', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'reviewer' })

      expect(screen.getByText('reviewer')).toBeInTheDocument()
    })
  })

  describe('logout functionality', () => {
    it('should render sign out button', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
    })

    it('should call logout and navigate to login when sign out is clicked', async () => {
      const user = userEvent.setup()
      renderSidebar({ id: 1, email: 'test@test.com', role: 'admin' })

      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }))

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      await user.click(signOutButton)

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should clear localStorage on logout', async () => {
      const user = userEvent.setup()
      localStorage.setItem('token', 'test-token-xyz')
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }))

      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      await user.click(screen.getByRole('button', { name: /sign out/i }))

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('role-based navigation visibility', () => {
    const testCases = [
      {
        role: 'admin',
        expectedLinks: ['Dashboard', 'Upload Contract', 'Templates', 'Search', 'Deadline Tracker', 'Audit'],
        notExpectedLinks: [],
      },
      {
        role: 'editor',
        expectedLinks: ['Dashboard', 'Upload Contract', 'Templates', 'Search'],
        notExpectedLinks: ['Deadline Tracker', 'Audit'],
      },
      {
        role: 'reviewer',
        expectedLinks: ['Dashboard', 'Templates', 'Search'],
        notExpectedLinks: ['Upload Contract', 'Deadline Tracker', 'Audit'],
      },
      {
        role: 'viewer',
        expectedLinks: ['Dashboard', 'Templates', 'Search'],
        notExpectedLinks: ['Upload Contract', 'Deadline Tracker', 'Audit'],
      },
    ]

    testCases.forEach(({ role, expectedLinks, notExpectedLinks }) => {
      it(`should show correct links for ${role}`, () => {
        renderSidebar({ id: 1, email: 'test@test.com', role })

        expectedLinks.forEach(link => {
          expect(screen.getByText(link)).toBeInTheDocument()
        })

        notExpectedLinks.forEach(link => {
          expect(screen.queryByText(link)).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('boundary values', () => {
    it('should handle very long full_name', () => {
      const longName = 'A'.repeat(300)
      renderSidebar({ id: 1, email: 'test@test.com', full_name: longName, role: 'admin' })

      expect(screen.getByText(longName)).toBeInTheDocument()
    })

    it('should handle very long email', () => {
      const longEmail = 'a'.repeat(200) + '@example.com'
      renderSidebar({ id: 1, email: longEmail, role: 'viewer' })

      expect(screen.getByText(longEmail)).toBeInTheDocument()
    })

    it('should handle special characters in full_name', () => {
      renderSidebar({
        id: 1,
        email: 'test@test.com',
        full_name: "O'Brien-Smith <Test> & Co.",
        role: 'editor',
      })

      expect(screen.getByText("O'Brien-Smith <Test> & Co.")).toBeInTheDocument()
    })

    it('should handle user with id 0', () => {
      renderSidebar({ id: 0, email: 'zero@test.com', role: 'viewer' })

      expect(screen.getByText('zero@test.com')).toBeInTheDocument()
    })

    it('should handle empty string role', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: '' })

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })

    it('should handle undefined user', () => {
      renderSidebar(null)

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
    })
  })

  describe('equivalence partitioning', () => {
    it('should correctly identify editorOrAbove for editor', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'editor' })

      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
    })

    it('should correctly identify editorOrAbove for admin', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'admin' })

      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
    })

    it('should correctly exclude editorOrAbove for reviewer', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'reviewer' })

      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })

    it('should correctly identify adminOnly for admin', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'admin' })

      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    it('should correctly exclude adminOnly for non-admin', () => {
      const nonAdminRoles = ['editor', 'reviewer', 'viewer']

      nonAdminRoles.forEach(role => {
        const { unmount } = renderSidebar({ id: 1, email: 'test@test.com', role })

        expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
        expect(screen.queryByText('Audit')).not.toBeInTheDocument()

        unmount()
        localStorage.clear()
      })
    })
  })

  describe('NavLink behavior', () => {
    it('should render correct href for Dashboard', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveAttribute('href', '/')
    })

    it('should render correct href for Templates', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      const templatesLink = screen.getByText('Templates').closest('a')
      expect(templatesLink).toHaveAttribute('href', '/templates')
    })

    it('should render correct href for Search', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'viewer' })

      const searchLink = screen.getByText('Search').closest('a')
      expect(searchLink).toHaveAttribute('href', '/search')
    })

    it('should render correct href for Upload Contract', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'editor' })

      const uploadLink = screen.getByText('Upload Contract').closest('a')
      expect(uploadLink).toHaveAttribute('href', '/contracts/upload')
    })

    it('should render correct href for Deadline Tracker', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'admin' })

      const deadlineLink = screen.getByText('Deadline Tracker').closest('a')
      expect(deadlineLink).toHaveAttribute('href', '/deadlines')
    })

    it('should render correct href for Audit', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: 'admin' })

      const auditLink = screen.getByText('Audit').closest('a')
      expect(auditLink).toHaveAttribute('href', '/audit')
    })
  })

  describe('null/undefined handling', () => {
    it('should handle null user', () => {
      renderSidebar(null)

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should handle undefined role', () => {
      renderSidebar({ id: 1, email: 'test@test.com', role: undefined })

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should handle missing email', () => {
      renderSidebar({ id: 1, role: 'viewer' })

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
    })
  })
})
