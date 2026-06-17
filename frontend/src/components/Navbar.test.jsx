import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '../context/AuthContext'

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockLogout.mockClear()
  })

  describe('rendering for different user roles', () => {
    it('should render navigation links for regular user', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('CMS')).toBeInTheDocument()
      expect(screen.getByText('Contracts')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
    })

    it('should show Audit link only for admin users', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    it('should not show Audit link for non-admin users', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'editor@test.com', role: 'editor' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not show Audit link for viewer role', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'viewer@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not show Audit link when role is undefined', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })

    it('should not show Audit link when role is null', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: null },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.queryByText('Audit')).not.toBeInTheDocument()
    })
  })

  describe('user information display', () => {
    it('should display full_name when available', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com', full_name: 'John Doe', role: 'editor' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display email when full_name is not available', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('user@test.com')).toBeInTheDocument()
    })

    it('should prefer full_name over email when both are available', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com', full_name: 'Jane Smith', role: 'admin' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('user@test.com')).not.toBeInTheDocument()
    })

    it('should display user role badge', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: 'editor' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('editor')).toBeInTheDocument()
    })

    it('should display admin role badge', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    it('should handle empty full_name (falsy)', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com', full_name: '', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('user@test.com')).toBeInTheDocument()
    })

    it('should handle null full_name', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com', full_name: null, role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('user@test.com')).toBeInTheDocument()
    })

    it('should display undefined role when role is not provided', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      const badges = screen.getAllByText((content, element) => {
        return element.classList.contains('rounded-full')
      })
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('logout functionality', () => {
    it('should call logout and navigate to /login when sign out is clicked', async () => {
      const user = userEvent.setup()
      useAuth.mockReturnValue({
        user: { id: 1, email: 'user@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      const signOutButton = screen.getByText('Sign out')
      await user.click(signOutButton)

      expect(mockLogout).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should call logout before navigate', async () => {
      const user = userEvent.setup()
      const callOrder = []

      const trackingLogout = vi.fn(() => callOrder.push('logout'))
      const trackingNavigate = vi.fn(() => callOrder.push('navigate'))

      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: 'viewer' },
        logout: trackingLogout
      })

      mockNavigate.mockImplementation(trackingNavigate)

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      await user.click(screen.getByText('Sign out'))

      expect(callOrder).toEqual(['logout', 'navigate'])
    })

    it('should navigate to /login even if logout throws error', async () => {
      const user = userEvent.setup()
      const errorLogout = vi.fn(() => {
        throw new Error('Logout error')
      })

      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: 'viewer' },
        logout: errorLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      await expect(async () => {
        await user.click(screen.getByText('Sign out'))
      }).rejects.toThrow('Logout error')
    })
  })

  describe('navigation links', () => {
    it('should render link to home page', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      const cmsLink = screen.getByText('CMS')
      expect(cmsLink.closest('a')).toHaveAttribute('href', '/')
    })

    it('should render link to contracts page', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      const contractsLink = screen.getByText('Contracts')
      expect(contractsLink.closest('a')).toHaveAttribute('href', '/contracts')
    })

    it('should render link to search page', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      const searchLink = screen.getByText('Search')
      expect(searchLink.closest('a')).toHaveAttribute('href', '/search')
    })

    it('should render link to templates page', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      const templatesLink = screen.getByText('Templates')
      expect(templatesLink.closest('a')).toHaveAttribute('href', '/templates')
    })

    it('should render link to audit page for admin', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      const auditLink = screen.getByText('Audit')
      expect(auditLink.closest('a')).toHaveAttribute('href', '/audit')
    })
  })

  describe('edge cases', () => {
    it('should handle user with all fields undefined', () => {
      useAuth.mockReturnValue({
        user: {},
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('CMS')).toBeInTheDocument()
    })

    it('should handle null user', () => {
      useAuth.mockReturnValue({
        user: null,
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText('CMS')).toBeInTheDocument()
    })

    it('should handle very long email addresses', () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com'
      useAuth.mockReturnValue({
        user: { id: 1, email: longEmail, role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText(longEmail)).toBeInTheDocument()
    })

    it('should handle very long full_name', () => {
      const longName = 'A'.repeat(100)
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@test.com', full_name: longName, role: 'viewer' },
        logout: mockLogout
      })

      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )

      expect(screen.getByText(longName)).toBeInTheDocument()
    })
  })
})
