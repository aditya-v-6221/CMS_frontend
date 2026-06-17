import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

// Mock the modules
vi.mock('../context/AuthContext')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

describe('Sidebar', () => {
  let mockLogout
  let mockNavigate

  beforeEach(() => {
    mockLogout = vi.fn()
    mockNavigate = vi.fn()

    // Setup navigate mock
    const { useNavigate } = await import('react-router-dom')
    useNavigate.mockReturnValue(mockNavigate)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderSidebar = (user = null) => {
    useAuth.mockReturnValue({
      user,
      logout: mockLogout,
    })

    return render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
  }

  describe('Branding and Basic Rendering', () => {
    it('should render the ContractFlow branding', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'viewer' }
      renderSidebar(user)

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
    })

    it('should render sidebar with correct structure', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'viewer' }
      const { container } = renderSidebar(user)

      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
      expect(aside).toHaveClass('w-60', 'min-h-screen', 'bg-white')
    })
  })

  describe('User Info Display', () => {
    it('should display user full_name when available', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const fullNames = screen.getAllByText('John Doe')
      expect(fullNames.length).toBeGreaterThan(0)
    })

    it('should display email when full_name is not available', () => {
      const user = { email: 'john@example.com', role: 'editor' }
      renderSidebar(user)

      const emails = screen.getAllByText('john@example.com')
      expect(emails.length).toBeGreaterThan(0)
    })

    it('should display user role', () => {
      const user = { full_name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
      renderSidebar(user)

      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    it('should display role with correct styling', () => {
      const user = { full_name: 'Jane Smith', email: 'jane@example.com', role: 'editor' }
      renderSidebar(user)

      const roleElement = screen.getByText('editor')
      expect(roleElement).toHaveClass('bg-indigo-50', 'text-indigo-600')
    })

    it('should handle user with only email (no full_name)', () => {
      const user = { email: 'test@example.com', role: 'viewer' }
      renderSidebar(user)

      expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0)
    })
  })

  describe('Role-Based Navigation - Admin Role', () => {
    it('should show all navigation items for admin users', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      renderSidebar(user)

      // All items should be visible for admin
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    it('should show admin-only items (Deadline Tracker, Audit)', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      renderSidebar(user)

      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    it('should render correct number of navigation links for admin', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      const { container } = renderSidebar(user)

      const nav = container.querySelector('nav')
      const navLinks = within(nav).getAllByRole('link')
      expect(navLinks).toHaveLength(6) // All 6 items
    })
  })

  describe('Role-Based Navigation - Editor Role', () => {
    it('should show editor-accessible items but not admin-only items', () => {
      const user = { full_name: 'Editor User', email: 'editor@example.com', role: 'editor' }
      renderSidebar(user)

      // Editor can see these
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()

      // Editor cannot see admin-only items
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should render correct number of navigation links for editor', () => {
      const user = { full_name: 'Editor User', email: 'editor@example.com', role: 'editor' }
      const { container } = renderSidebar(user)

      const nav = container.querySelector('nav')
      const navLinks = within(nav).getAllByRole('link')
      expect(navLinks).toHaveLength(4) // 4 items (excluding admin-only)
    })

    it('should allow editor to access Upload Contract', () => {
      const user = { full_name: 'Editor User', email: 'editor@example.com', role: 'editor' }
      renderSidebar(user)

      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
    })
  })

  describe('Role-Based Navigation - Viewer Role', () => {
    it('should show only viewer-accessible items', () => {
      const user = { full_name: 'Viewer User', email: 'viewer@example.com', role: 'viewer' }
      renderSidebar(user)

      // Viewer can see these
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()

      // Viewer cannot see editor-or-above items
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()

      // Viewer cannot see admin-only items
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should render correct number of navigation links for viewer', () => {
      const user = { full_name: 'Viewer User', email: 'viewer@example.com', role: 'viewer' }
      const { container } = renderSidebar(user)

      const nav = container.querySelector('nav')
      const navLinks = within(nav).getAllByRole('link')
      expect(navLinks).toHaveLength(3) // 3 items (Dashboard, Templates, Search)
    })

    it('should not show Upload Contract to viewer', () => {
      const user = { full_name: 'Viewer User', email: 'viewer@example.com', role: 'viewer' }
      renderSidebar(user)

      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases - Role Handling', () => {
    it('should handle null role', () => {
      const user = { full_name: 'User', email: 'user@example.com', role: null }
      renderSidebar(user)

      // Should only show items without role restrictions
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()

      // Should not show restricted items
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should handle undefined role', () => {
      const user = { full_name: 'User', email: 'user@example.com', role: undefined }
      renderSidebar(user)

      // Should only show items without role restrictions
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()

      // Should not show restricted items
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })

    it('should handle empty string role', () => {
      const user = { full_name: 'User', email: 'user@example.com', role: '' }
      renderSidebar(user)

      // Should only show items without role restrictions
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()

      // Should not show restricted items
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })

    it('should handle unknown/invalid role', () => {
      const user = { full_name: 'User', email: 'user@example.com', role: 'unknown_role' }
      renderSidebar(user)

      // Should only show items without role restrictions
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()

      // Should not show restricted items
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should handle null user object', () => {
      renderSidebar(null)

      // Should show basic items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should handle user object with missing properties', () => {
      const user = { role: 'editor' }
      renderSidebar(user)

      // Should still render without errors
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  describe('Equivalence Class Partitioning - Role Testing', () => {
    // Valid equivalence classes
    describe('Valid Role Classes', () => {
      it('should handle "admin" role (Class 1: Full access)', () => {
        const user = { full_name: 'Admin', email: 'admin@test.com', role: 'admin' }
        const { container } = renderSidebar(user)

        const nav = container.querySelector('nav')
        const navLinks = within(nav).getAllByRole('link')
        expect(navLinks).toHaveLength(6)
      })

      it('should handle "editor" role (Class 2: Editor access)', () => {
        const user = { full_name: 'Editor', email: 'editor@test.com', role: 'editor' }
        const { container } = renderSidebar(user)

        const nav = container.querySelector('nav')
        const navLinks = within(nav).getAllByRole('link')
        expect(navLinks).toHaveLength(4)
      })

      it('should handle "viewer" role (Class 3: Viewer access)', () => {
        const user = { full_name: 'Viewer', email: 'viewer@test.com', role: 'viewer' }
        const { container } = renderSidebar(user)

        const nav = container.querySelector('nav')
        const navLinks = within(nav).getAllByRole('link')
        expect(navLinks).toHaveLength(3)
      })
    })

    // Invalid equivalence classes
    describe('Invalid Role Classes', () => {
      it('should handle null role (Class 4: No role)', () => {
        const user = { full_name: 'User', email: 'user@test.com', role: null }
        const { container } = renderSidebar(user)

        const nav = container.querySelector('nav')
        const navLinks = within(nav).getAllByRole('link')
        expect(navLinks).toHaveLength(3) // Only unrestricted items
      })

      it('should handle undefined role (Class 5: Undefined)', () => {
        const user = { full_name: 'User', email: 'user@test.com' }
        const { container } = renderSidebar(user)

        const nav = container.querySelector('nav')
        const navLinks = within(nav).getAllByRole('link')
        expect(navLinks).toHaveLength(3)
      })

      it('should handle invalid string role (Class 6: Invalid value)', () => {
        const user = { full_name: 'User', email: 'user@test.com', role: 'superuser' }
        const { container } = renderSidebar(user)

        const nav = container.querySelector('nav')
        const navLinks = within(nav).getAllByRole('link')
        expect(navLinks).toHaveLength(3)
      })

      it('should handle empty string role (Class 7: Empty)', () => {
        const user = { full_name: 'User', email: 'user@test.com', role: '' }
        const { container } = renderSidebar(user)

        const nav = container.querySelector('nav')
        const navLinks = within(nav).getAllByRole('link')
        expect(navLinks).toHaveLength(3)
      })
    })

    // Boundary values
    describe('Boundary Values', () => {
      it('should handle role with different casing (case-sensitive test)', () => {
        const user = { full_name: 'User', email: 'user@test.com', role: 'Admin' }
        renderSidebar(user)

        // Should not match 'admin' - case sensitive
        expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      })

      it('should handle role with whitespace', () => {
        const user = { full_name: 'User', email: 'user@test.com', role: ' admin ' }
        renderSidebar(user)

        // Should not match due to whitespace
        expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      })

      it('should handle very long role string', () => {
        const longRole = 'a'.repeat(1000)
        const user = { full_name: 'User', email: 'user@test.com', role: longRole }
        renderSidebar(user)

        // Should render without errors
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Links', () => {
    it('should render NavLink components with correct paths', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      const { container } = renderSidebar(user)

      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveAttribute('href', '/')

      const uploadLink = screen.getByText('Upload Contract').closest('a')
      expect(uploadLink).toHaveAttribute('href', '/contracts/upload')

      const templatesLink = screen.getByText('Templates').closest('a')
      expect(templatesLink).toHaveAttribute('href', '/templates')

      const searchLink = screen.getByText('Search').closest('a')
      expect(searchLink).toHaveAttribute('href', '/search')

      const deadlineLink = screen.getByText('Deadline Tracker').closest('a')
      expect(deadlineLink).toHaveAttribute('href', '/deadlines')

      const auditLink = screen.getByText('Audit').closest('a')
      expect(auditLink).toHaveAttribute('href', '/audit')
    })

    it('should render navigation icons for each item', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      const { container } = renderSidebar(user)

      const nav = container.querySelector('nav')
      const svgIcons = within(nav).getAllByRole('link').map(link =>
        link.querySelector('svg')
      )

      svgIcons.forEach(icon => {
        expect(icon).toBeInTheDocument()
      })
    })
  })

  describe('NavLink Active States', () => {
    it('should apply active classes to Dashboard when on root path', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      useAuth.mockReturnValue({
        user,
        logout: mockLogout,
      })

      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should apply active classes when on templates path', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      useAuth.mockReturnValue({
        user,
        logout: mockLogout,
      })

      render(
        <MemoryRouter initialEntries={['/templates']}>
          <Sidebar />
        </MemoryRouter>
      )

      const templatesLink = screen.getByText('Templates').closest('a')
      expect(templatesLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should apply inactive classes to non-active links', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      useAuth.mockReturnValue({
        user,
        logout: mockLogout,
      })

      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      const templatesLink = screen.getByText('Templates').closest('a')
      expect(templatesLink).toHaveClass('text-gray-600')
      expect(templatesLink).not.toHaveClass('bg-indigo-50')
    })

    it('should use end prop for Dashboard exact matching', () => {
      const user = { full_name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      useAuth.mockReturnValue({
        user,
        logout: mockLogout,
      })

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Sidebar />
        </MemoryRouter>
      )

      const dashboardLink = screen.getByText('Dashboard').closest('a')
      // Dashboard should not be active when on /search
      expect(dashboardLink).not.toHaveClass('bg-indigo-50')
    })
  })

  describe('Logout Functionality', () => {
    it('should render logout button', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const logoutButton = screen.getByTitle('Sign out')
      expect(logoutButton).toBeInTheDocument()
    })

    it('should call logout and navigate on logout button click', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const logoutButton = screen.getByTitle('Sign out')
      fireEvent.click(logoutButton)

      expect(mockLogout).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should call logout before navigate', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const callOrder = []
      mockLogout.mockImplementation(() => callOrder.push('logout'))
      mockNavigate.mockImplementation(() => callOrder.push('navigate'))

      const logoutButton = screen.getByTitle('Sign out')
      fireEvent.click(logoutButton)

      expect(callOrder).toEqual(['logout', 'navigate'])
    })

    it('should render logout button with correct icon', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const logoutButton = screen.getByTitle('Sign out')
      const svg = logoutButton.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('w-4', 'h-4')
    })

    it('should apply hover styles to logout button', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const logoutButton = screen.getByTitle('Sign out')
      expect(logoutButton).toHaveClass('hover:text-red-500', 'hover:bg-red-50')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button role for logout', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const logoutButton = screen.getByRole('button', { name: /sign out/i })
      expect(logoutButton).toBeInTheDocument()
    })

    it('should have title attribute for logout button', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const logoutButton = screen.getByTitle('Sign out')
      expect(logoutButton).toHaveAttribute('title', 'Sign out')
    })

    it('should render semantic nav element', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      const { container } = renderSidebar(user)

      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
    })

    it('should render semantic aside element', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      const { container } = renderSidebar(user)

      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
    })
  })

  describe('Boundary Cases - Navigation Filtering', () => {
    it('should filter adminOnly items correctly for all non-admin roles', () => {
      const roles = ['editor', 'viewer', null, undefined, '', 'unknown']

      roles.forEach(role => {
        vi.clearAllMocks()
        const user = { full_name: 'User', email: 'user@test.com', role }
        renderSidebar(user)

        expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
        expect(screen.queryByText('Audit')).not.toBeInTheDocument()
      })
    })

    it('should filter editorOrAbove items correctly for viewer and below', () => {
      const restrictedRoles = ['viewer', null, undefined, '', 'unknown']

      restrictedRoles.forEach(role => {
        vi.clearAllMocks()
        const user = { full_name: 'User', email: 'user@test.com', role }
        renderSidebar(user)

        expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      })
    })

    it('should show Upload Contract to both editor and admin', () => {
      const allowedRoles = ['editor', 'admin']

      allowedRoles.forEach(role => {
        vi.clearAllMocks()
        const user = { full_name: 'User', email: 'user@test.com', role }
        renderSidebar(user)

        expect(screen.getByText('Upload Contract')).toBeInTheDocument()
      })
    })

    it('should always show unrestricted items regardless of role', () => {
      const allRoles = ['admin', 'editor', 'viewer', null, undefined, '', 'unknown']

      allRoles.forEach(role => {
        vi.clearAllMocks()
        const user = { full_name: 'User', email: 'user@test.com', role }
        renderSidebar(user)

        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Templates')).toBeInTheDocument()
        expect(screen.getByText('Search')).toBeInTheDocument()
      })
    })
  })

  describe('User Display Preferences', () => {
    it('should prefer full_name over email in brand section', () => {
      const user = { full_name: 'John Doe', email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const brandSection = screen.getByText('ContractFlow').closest('div').parentElement
      expect(within(brandSection).getByText('John Doe')).toBeInTheDocument()
    })

    it('should show email in brand section when full_name is missing', () => {
      const user = { email: 'john@example.com', role: 'admin' }
      renderSidebar(user)

      const brandSection = screen.getByText('ContractFlow').closest('div').parentElement
      expect(within(brandSection).getByText('john@example.com')).toBeInTheDocument()
    })

    it('should truncate long names properly', () => {
      const longName = 'Very Long Name That Should Be Truncated'
      const user = { full_name: longName, email: 'user@example.com', role: 'admin' }
      const { container } = renderSidebar(user)

      const truncatedElements = container.querySelectorAll('.truncate')
      expect(truncatedElements.length).toBeGreaterThan(0)
    })
  })

  describe('Component Integration', () => {
    it('should integrate with AuthContext correctly', () => {
      const user = { full_name: 'Test User', email: 'test@example.com', role: 'admin' }
      useAuth.mockReturnValue({
        user,
        logout: mockLogout,
      })

      renderSidebar()

      expect(useAuth).toHaveBeenCalled()
    })

    it('should integrate with react-router-dom useNavigate', () => {
      const { useNavigate } = require('react-router-dom')
      const user = { full_name: 'Test User', email: 'test@example.com', role: 'admin' }

      renderSidebar(user)

      expect(useNavigate).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing useAuth context gracefully', () => {
      useAuth.mockReturnValue({
        user: undefined,
        logout: mockLogout,
      })

      expect(() => {
        render(
          <MemoryRouter>
            <Sidebar />
          </MemoryRouter>
        )
      }).not.toThrow()
    })

    it('should handle logout function errors gracefully', () => {
      const user = { full_name: 'Test User', email: 'test@example.com', role: 'admin' }
      const errorLogout = vi.fn(() => {
        throw new Error('Logout failed')
      })

      useAuth.mockReturnValue({
        user,
        logout: errorLogout,
      })

      renderSidebar()

      const logoutButton = screen.getByTitle('Sign out')

      expect(() => fireEvent.click(logoutButton)).toThrow('Logout failed')
    })

    it('should handle navigate function errors gracefully', () => {
      const user = { full_name: 'Test User', email: 'test@example.com', role: 'admin' }
      const errorNavigate = vi.fn(() => {
        throw new Error('Navigation failed')
      })

      const { useNavigate } = require('react-router-dom')
      useNavigate.mockReturnValue(errorNavigate)

      renderSidebar(user)

      const logoutButton = screen.getByTitle('Sign out')

      expect(() => fireEvent.click(logoutButton)).toThrow('Navigation failed')
    })
  })
})
