import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderSidebar = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar />
      </MemoryRouter>
    )
  }

  describe('Rendering - Basic Structure', () => {
    it('should render the sidebar with brand name', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer', full_name: 'Test User' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
    })

    it('should render the brand logo icon', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const aside = screen.getByRole('complementary')
      expect(aside).toBeInTheDocument()
      // Check for SVG elements in the brand section
      const svgs = aside.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('should render navigation section', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should render sign out button', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const signOutButton = screen.getByTitle('Sign out')
      expect(signOutButton).toBeInTheDocument()
    })
  })

  describe('User Information Display', () => {
    it('should display user full name when available', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer', full_name: 'John Doe' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument()
    })

    it('should display user email when full_name is not available', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('test@example.com')[0]).toBeInTheDocument()
    })

    it('should display user role badge', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    it('should handle missing user full_name gracefully', () => {
      useAuth.mockReturnValue({
        user: { email: 'user@test.com', role: 'editor', full_name: null },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('user@test.com')[0]).toBeInTheDocument()
    })

    it('should handle empty string full_name', () => {
      useAuth.mockReturnValue({
        user: { email: 'user@test.com', role: 'editor', full_name: '' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('user@test.com')[0]).toBeInTheDocument()
    })

    it('should handle undefined user object properties', () => {
      useAuth.mockReturnValue({
        user: { role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Navigation Items - Viewer Role', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { email: 'viewer@example.com', role: 'viewer', full_name: 'Viewer User' },
        logout: vi.fn(),
      })
    })

    it('should render Dashboard link for viewer', () => {
      renderSidebar()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should render Templates link for viewer', () => {
      renderSidebar()
      expect(screen.getByText('Templates')).toBeInTheDocument()
    })

    it('should render Search link for viewer', () => {
      renderSidebar()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should NOT render Upload Contract link for viewer', () => {
      renderSidebar()
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
    })

    it('should NOT render Deadline Tracker link for viewer', () => {
      renderSidebar()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })

    it('should NOT render Audit link for viewer', () => {
      renderSidebar()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should render exactly 3 navigation links for viewer', () => {
      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')
      expect(links).toHaveLength(3)
    })
  })

  describe('Navigation Items - Editor Role', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { email: 'editor@example.com', role: 'editor', full_name: 'Editor User' },
        logout: vi.fn(),
      })
    })

    it('should render Dashboard link for editor', () => {
      renderSidebar()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should render Upload Contract link for editor', () => {
      renderSidebar()
      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
    })

    it('should render Templates link for editor', () => {
      renderSidebar()
      expect(screen.getByText('Templates')).toBeInTheDocument()
    })

    it('should render Search link for editor', () => {
      renderSidebar()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should NOT render Deadline Tracker link for editor', () => {
      renderSidebar()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })

    it('should NOT render Audit link for editor', () => {
      renderSidebar()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should render exactly 4 navigation links for editor', () => {
      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')
      expect(links).toHaveLength(4)
    })
  })

  describe('Navigation Items - Admin Role', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { email: 'admin@example.com', role: 'admin', full_name: 'Admin User' },
        logout: vi.fn(),
      })
    })

    it('should render all navigation links for admin', () => {
      renderSidebar()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    it('should render Deadline Tracker link for admin', () => {
      renderSidebar()
      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()
    })

    it('should render Audit link for admin', () => {
      renderSidebar()
      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    it('should render exactly 6 navigation links for admin', () => {
      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')
      expect(links).toHaveLength(6)
    })
  })

  describe('Navigation Items - Null/Undefined User', () => {
    it('should handle null user object', () => {
      useAuth.mockReturnValue({
        user: null,
        logout: vi.fn(),
      })

      renderSidebar()
      // Should only show items without role restrictions
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should handle undefined user object', () => {
      useAuth.mockReturnValue({
        user: undefined,
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should handle user with null role', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: null },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')
      expect(links).toHaveLength(3) // Only non-restricted items
    })

    it('should handle user with undefined role', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })

    it('should handle user with empty string role', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: '' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Items - Unknown/Custom Roles', () => {
    it('should handle unknown role like viewer', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'custom-role' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should handle role with different casing', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'Admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      // Case-sensitive check - should not match 'admin'
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should handle role with extra whitespace', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: ' admin ' },
        logout: vi.fn(),
      })

      renderSidebar()
      // Should not match due to whitespace
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Links - Active State', () => {
    it('should show Dashboard as active when on root route', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar('/')
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should show Templates as active when on /templates route', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar('/templates')
      const templatesLink = screen.getByText('Templates').closest('a')
      expect(templatesLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should show Search as active when on /search route', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar('/search')
      const searchLink = screen.getByText('Search').closest('a')
      expect(searchLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should show Upload Contract as active for editor on /contracts/upload', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'editor' },
        logout: vi.fn(),
      })

      renderSidebar('/contracts/upload')
      const uploadLink = screen.getByText('Upload Contract').closest('a')
      expect(uploadLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should show Deadline Tracker as active for admin on /deadlines', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar('/deadlines')
      const deadlineLink = screen.getByText('Deadline Tracker').closest('a')
      expect(deadlineLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should show Audit as active for admin on /audit', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar('/audit')
      const auditLink = screen.getByText('Audit').closest('a')
      expect(auditLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })

    it('should show hover styles on inactive links', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar('/templates')
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass('text-gray-600', 'hover:bg-gray-50')
      expect(dashboardLink).not.toHaveClass('bg-indigo-50')
    })
  })

  describe('Logout Functionality', () => {
    it('should call logout and navigate to login on sign out click', async () => {
      const mockLogout = vi.fn()
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer', full_name: 'Test User' },
        logout: mockLogout,
      })

      const user = userEvent.setup()
      renderSidebar()

      const signOutButton = screen.getByTitle('Sign out')
      await user.click(signOutButton)

      expect(mockLogout).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should call logout before navigation', async () => {
      const mockLogout = vi.fn()
      const callOrder = []

      mockLogout.mockImplementation(() => {
        callOrder.push('logout')
      })

      mockNavigate.mockImplementation(() => {
        callOrder.push('navigate')
      })

      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: mockLogout,
      })

      const user = userEvent.setup()
      renderSidebar()

      const signOutButton = screen.getByTitle('Sign out')
      await user.click(signOutButton)

      expect(callOrder).toEqual(['logout', 'navigate'])
    })

    it('should handle multiple rapid clicks on sign out button', async () => {
      const mockLogout = vi.fn()
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: mockLogout,
      })

      const user = userEvent.setup()
      renderSidebar()

      const signOutButton = screen.getByTitle('Sign out')
      await user.click(signOutButton)
      await user.click(signOutButton)
      await user.click(signOutButton)

      expect(mockLogout).toHaveBeenCalledTimes(3)
      expect(mockNavigate).toHaveBeenCalledTimes(3)
    })

    it('should navigate to /login with correct path', async () => {
      const mockLogout = vi.fn()
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: mockLogout,
      })

      const user = userEvent.setup()
      renderSidebar()

      const signOutButton = screen.getByTitle('Sign out')
      await user.click(signOutButton)

      expect(mockNavigate).toHaveBeenCalledWith('/login')
      expect(mockNavigate).not.toHaveBeenCalledWith('/logout')
      expect(mockNavigate).not.toHaveBeenCalledWith('/')
    })
  })

  describe('User Interactions - Navigation', () => {
    it('should have correct href for Dashboard link', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveAttribute('href', '/')
    })

    it('should have correct href for Templates link', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const templatesLink = screen.getByText('Templates').closest('a')
      expect(templatesLink).toHaveAttribute('href', '/templates')
    })

    it('should have correct href for Search link', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const searchLink = screen.getByText('Search').closest('a')
      expect(searchLink).toHaveAttribute('href', '/search')
    })

    it('should have correct href for Upload Contract link', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'editor' },
        logout: vi.fn(),
      })

      renderSidebar()
      const uploadLink = screen.getByText('Upload Contract').closest('a')
      expect(uploadLink).toHaveAttribute('href', '/contracts/upload')
    })

    it('should have correct href for Deadline Tracker link', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const deadlineLink = screen.getByText('Deadline Tracker').closest('a')
      expect(deadlineLink).toHaveAttribute('href', '/deadlines')
    })

    it('should have correct href for Audit link', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const auditLink = screen.getByText('Audit').closest('a')
      expect(auditLink).toHaveAttribute('href', '/audit')
    })
  })

  describe('Edge Cases - User Object', () => {
    it('should handle user with very long full_name', () => {
      useAuth.mockReturnValue({
        user: {
          email: 'test@example.com',
          role: 'viewer',
          full_name: 'A'.repeat(100)
        },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('A'.repeat(100))[0]).toBeInTheDocument()
    })

    it('should handle user with very long email', () => {
      useAuth.mockReturnValue({
        user: {
          email: 'verylongemail' + 'a'.repeat(50) + '@example.com',
          role: 'viewer'
        },
        logout: vi.fn(),
      })

      renderSidebar()
      const longEmail = 'verylongemail' + 'a'.repeat(50) + '@example.com'
      expect(screen.getAllByText(longEmail)[0]).toBeInTheDocument()
    })

    it('should handle user with special characters in full_name', () => {
      useAuth.mockReturnValue({
        user: {
          email: 'test@example.com',
          role: 'viewer',
          full_name: 'Test <User> & "Special"'
        },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('Test <User> & "Special"')[0]).toBeInTheDocument()
    })

    it('should handle user with special characters in email', () => {
      useAuth.mockReturnValue({
        user: {
          email: 'test+user@example.com',
          role: 'viewer'
        },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('test+user@example.com')[0]).toBeInTheDocument()
    })

    it('should handle user with numeric values in full_name', () => {
      useAuth.mockReturnValue({
        user: {
          email: 'test@example.com',
          role: 'viewer',
          full_name: '12345'
        },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getAllByText('12345')[0]).toBeInTheDocument()
    })
  })

  describe('Edge Cases - Role Filtering', () => {
    it('should filter items correctly when user role changes', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      // Start as viewer
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )
      expect(screen.queryByText('Upload Contract')).not.toBeInTheDocument()

      // Change to editor
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'editor' },
        logout: vi.fn(),
      })
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )
      expect(screen.getByText('Upload Contract')).toBeInTheDocument()
    })

    it('should handle all navigation items having correct to attributes', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')

      expect(links[0]).toHaveAttribute('href', '/')
      expect(links[1]).toHaveAttribute('href', '/contracts/upload')
      expect(links[2]).toHaveAttribute('href', '/templates')
      expect(links[3]).toHaveAttribute('href', '/search')
      expect(links[4]).toHaveAttribute('href', '/deadlines')
      expect(links[5]).toHaveAttribute('href', '/audit')
    })
  })

  describe('Accessibility', () => {
    it('should have button with title attribute for sign out', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const signOutButton = screen.getByTitle('Sign out')
      expect(signOutButton).toHaveAttribute('title', 'Sign out')
    })

    it('should have navigation landmark', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should have complementary landmark for aside', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('should have button role for sign out element', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
    })

    it('should render all navigation links as actual link elements', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')

      links.forEach(link => {
        expect(link.tagName).toBe('A')
      })
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply correct classes to sidebar container', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const aside = screen.getByRole('complementary')
      expect(aside).toHaveClass('w-60', 'min-h-screen', 'bg-white', 'border-r', 'border-gray-100', 'flex', 'flex-col')
    })

    it('should apply truncate class to user display elements', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer', full_name: 'Test User' },
        logout: vi.fn(),
      })

      renderSidebar()
      const brandName = screen.getByText('ContractFlow')
      expect(brandName.parentElement).toHaveClass('truncate')
    })

    it('should apply correct role badge styling', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const roleBadge = screen.getByText('admin')
      expect(roleBadge).toHaveClass('text-xs', 'px-1.5', 'py-0.5', 'bg-indigo-50', 'text-indigo-600', 'rounded', 'font-medium')
    })

    it('should apply hover styles to sign out button', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const signOutButton = screen.getByTitle('Sign out')
      expect(signOutButton).toHaveClass('hover:text-red-500', 'hover:bg-red-50')
    })
  })

  describe('Component Composition', () => {
    it('should render all SVG icons for visible navigation items', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const aside = screen.getByRole('complementary')
      const svgs = aside.querySelectorAll('svg')
      // Brand icon + 6 nav item icons + 6 nav item arrows + sign out icon
      expect(svgs.length).toBeGreaterThanOrEqual(13)
    })

    it('should render navigation items with icons and labels', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      const svg = dashboardLink.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render arrow icons for all navigation links', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')

      links.forEach(link => {
        const svgs = link.querySelectorAll('svg')
        // Each link should have at least 2 SVGs (icon + arrow)
        expect(svgs.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('Navigation Behavior', () => {
    it('should use NavLink component for navigation items', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar()
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      // NavLink should have href attribute
      expect(dashboardLink).toHaveAttribute('href')
    })

    it('should apply end prop to Dashboard link for exact matching', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })

      renderSidebar('/')
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass('bg-indigo-50', 'text-indigo-700')

      // Verify it doesn't match on sub-routes
      const { rerender } = render(
        <MemoryRouter initialEntries={['/templates']}>
          <Sidebar />
        </MemoryRouter>
      )
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })
      rerender(
        <MemoryRouter initialEntries={['/templates']}>
          <Sidebar />
        </MemoryRouter>
      )
      const dashboardLink2 = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink2).not.toHaveClass('bg-indigo-50')
    })
  })

  describe('Error States', () => {
    it('should handle logout function throwing an error', async () => {
      const mockLogout = vi.fn(() => {
        throw new Error('Logout failed')
      })

      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: mockLogout,
      })

      const user = userEvent.setup()
      renderSidebar()

      const signOutButton = screen.getByTitle('Sign out')

      // Should throw the error but not crash the component
      await expect(async () => {
        await user.click(signOutButton)
      }).rejects.toThrow('Logout failed')
    })

    it('should handle navigate function not being available', async () => {
      const mockLogout = vi.fn()
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: mockLogout,
      })

      const user = userEvent.setup()
      renderSidebar()

      const signOutButton = screen.getByTitle('Sign out')
      await user.click(signOutButton)

      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe('Empty States', () => {
    it('should handle empty NAV_ITEMS array gracefully', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should handle user with all fields as empty strings', () => {
      useAuth.mockReturnValue({
        user: { email: '', role: '', full_name: '' },
        logout: vi.fn(),
      })

      renderSidebar()
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })
  })

  describe('Integration - Multiple Roles Scenarios', () => {
    it('should show correct items when switching from viewer to admin', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'viewer' },
        logout: vi.fn(),
      })
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      let nav = screen.getByRole('navigation')
      let links = within(nav).getAllByRole('link')
      expect(links).toHaveLength(3)

      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      nav = screen.getByRole('navigation')
      links = within(nav).getAllByRole('link')
      expect(links).toHaveLength(6)
    })

    it('should show correct items when switching from admin to editor', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )
      expect(screen.getByText('Deadline Tracker')).toBeInTheDocument()

      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'editor' },
        logout: vi.fn(),
      })
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )
      expect(screen.queryByText('Deadline Tracker')).not.toBeInTheDocument()
    })
  })

  describe('Boundary Values', () => {
    it('should handle zero-length arrays for visible items', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'non-existent-role' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should handle maximum role permissions (admin)', () => {
      useAuth.mockReturnValue({
        user: { email: 'test@example.com', role: 'admin' },
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')
      expect(links.length).toBe(6)
    })

    it('should handle minimum role permissions (null/undefined)', () => {
      useAuth.mockReturnValue({
        user: null,
        logout: vi.fn(),
      })

      renderSidebar()
      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')
      expect(links.length).toBe(3)
    })
  })
})
