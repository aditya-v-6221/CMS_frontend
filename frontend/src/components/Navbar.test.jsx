import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'
import { AuthProvider } from '../context/AuthContext'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderNavbar(user = null) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  return render(
    <AuthProvider>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  describe('branding and navigation links', () => {
    it('should display CMS brand link', () => {
      renderNavbar({ id: 1, email: 'test@test.com' })

      const brandLink = screen.getByText('CMS')
      expect(brandLink).toBeInTheDocument()
      expect(brandLink.closest('a')).toHaveAttribute('href', '/')
    })

    it('should display Contracts link', () => {
      renderNavbar({ id: 1, email: 'test@test.com' })

      const link = screen.getByText('Contracts')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/contracts')
    })

    it('should display Search link', () => {
      renderNavbar({ id: 1, email: 'test@test.com' })

      const link = screen.getByText('Search')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/search')
    })

    it('should display Templates link', () => {
      renderNavbar({ id: 1, email: 'test@test.com' })

      const link = screen.getByText('Templates')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/templates')
    })
  })

  describe('admin-only Audit link', () => {
    it('should display Audit link for admin users', () => {
      renderNavbar({ id: 1, email: 'admin@test.com', role: 'admin' })

      const link = screen.getByText('Audit')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/audit')
    })

    it('should not display Audit link for editor users', () => {
      renderNavbar({ id: 1, email: 'editor@test.com', role: 'editor' })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not display Audit link for reviewer users', () => {
      renderNavbar({ id: 1, email: 'reviewer@test.com', role: 'reviewer' })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not display Audit link for viewer users', () => {
      renderNavbar({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not display Audit link when role is undefined', () => {
      renderNavbar({ id: 1, email: 'test@test.com' })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not display Audit link when role is null', () => {
      renderNavbar({ id: 1, email: 'test@test.com', role: null })

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })
  })

  describe('user display', () => {
    it('should display user full_name when available', () => {
      renderNavbar({ id: 1, email: 'test@test.com', full_name: 'John Doe', role: 'editor' })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display email when full_name is not available', () => {
      renderNavbar({ id: 1, email: 'test@example.com', role: 'viewer' })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should display email when full_name is empty string', () => {
      renderNavbar({ id: 1, email: 'test@test.com', full_name: '', role: 'editor' })

      expect(screen.getByText('test@test.com')).toBeInTheDocument()
    })

    it('should prefer full_name over email', () => {
      renderNavbar({ id: 1, email: 'test@test.com', full_name: 'Jane Smith', role: 'admin' })

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('test@test.com')).not.toBeInTheDocument()
    })

    it('should display user role badge', () => {
      renderNavbar({ id: 1, email: 'test@test.com', role: 'admin' })

      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    it('should display different roles correctly', () => {
      const roles = ['admin', 'editor', 'reviewer', 'viewer']

      roles.forEach(role => {
        const { unmount } = renderNavbar({ id: 1, email: 'test@test.com', role })
        expect(screen.getByText(role)).toBeInTheDocument()
        unmount()
        localStorage.clear()
      })
    })
  })

  describe('logout functionality', () => {
    it('should call logout and navigate to login when Sign out is clicked', async () => {
      const user = userEvent.setup()
      renderNavbar({ id: 1, email: 'test@test.com', role: 'admin' })

      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }))

      const signOutButton = screen.getByText('Sign out')
      await user.click(signOutButton)

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should display Sign out button', () => {
      renderNavbar({ id: 1, email: 'test@test.com' })

      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })

    it('should clear localStorage on logout', async () => {
      const user = userEvent.setup()
      localStorage.setItem('token', 'test-token-123')
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }))

      renderNavbar({ id: 1, email: 'test@test.com' })

      await user.click(screen.getByText('Sign out'))

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('styling and structure', () => {
    it('should render as nav element', () => {
      const { container } = renderNavbar({ id: 1, email: 'test@test.com' })

      expect(container.querySelector('nav')).toBeInTheDocument()
    })

    it('should have correct CSS classes for layout', () => {
      const { container } = renderNavbar({ id: 1, email: 'test@test.com' })
      const nav = container.querySelector('nav')

      expect(nav).toHaveClass('bg-white', 'border-b', 'border-gray-200')
    })
  })

  describe('boundary values', () => {
    it('should handle very long full_name', () => {
      const longName = 'A'.repeat(200)
      renderNavbar({ id: 1, email: 'test@test.com', full_name: longName, role: 'admin' })

      expect(screen.getByText(longName)).toBeInTheDocument()
    })

    it('should handle very long email', () => {
      const longEmail = 'a'.repeat(200) + '@example.com'
      renderNavbar({ id: 1, email: longEmail, role: 'viewer' })

      expect(screen.getByText(longEmail)).toBeInTheDocument()
    })

    it('should handle special characters in full_name', () => {
      renderNavbar({
        id: 1,
        email: 'test@test.com',
        full_name: "O'Brien-Smith <Test>",
        role: 'editor',
      })

      expect(screen.getByText("O'Brien-Smith <Test>")).toBeInTheDocument()
    })

    it('should handle user with id 0', () => {
      renderNavbar({ id: 0, email: 'zero@test.com', role: 'viewer' })

      expect(screen.getByText('zero@test.com')).toBeInTheDocument()
    })

    it('should handle undefined role', () => {
      renderNavbar({ id: 1, email: 'test@test.com', role: undefined })

      // Role badge should not be displayed or show empty
      const { container } = render(
        <AuthProvider>
          <MemoryRouter>
            <Navbar />
          </MemoryRouter>
        </AuthProvider>
      )
    })
  })

  describe('null/undefined user handling', () => {
    it('should handle null user gracefully', () => {
      renderNavbar(null)

      // Should still render navigation structure
      expect(screen.getByText('CMS')).toBeInTheDocument()
      expect(screen.getByText('Contracts')).toBeInTheDocument()
    })

    it('should not crash with undefined user properties', () => {
      renderNavbar({ id: 1 })

      expect(screen.getByText('CMS')).toBeInTheDocument()
    })
  })

  describe('equivalence partitioning', () => {
    // Admin role - should see all links including Audit
    it('should show all links for admin', () => {
      renderNavbar({ id: 1, email: 'admin@test.com', role: 'admin' })

      expect(screen.getByText('Contracts')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    // Non-admin roles - should not see Audit
    const nonAdminRoles = ['editor', 'reviewer', 'viewer']
    nonAdminRoles.forEach(role => {
      it(`should not show Audit link for ${role}`, () => {
        renderNavbar({ id: 1, email: 'test@test.com', role })

        expect(screen.getByText('Contracts')).toBeInTheDocument()
        expect(screen.queryByText('Audit')).not.toBeInTheDocument()
      })
    })
  })
})
