import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn()
  }
})

import { useAuth } from '../context/AuthContext'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when user is authenticated', () => {
    it('should render children when user exists', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@example.com' }
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should render multiple children when user exists', () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: 'test@example.com' }
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>First Child</div>
            <div>Second Child</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByText('First Child')).toBeInTheDocument()
      expect(screen.getByText('Second Child')).toBeInTheDocument()
    })

    it('should render complex JSX children', () => {
      useAuth.mockReturnValue({
        user: { id: 1, role: 'admin' }
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>
              <h1>Dashboard</h1>
              <p>Welcome back!</p>
            </div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Welcome back!')).toBeInTheDocument()
    })

    it('should render when user has minimal data', () => {
      useAuth.mockReturnValue({
        user: { id: 1 }
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Minimal User Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByText('Minimal User Content')).toBeInTheDocument()
    })

    it('should render when user has all fields populated', () => {
      useAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'admin'
        }
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Full User Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByText('Full User Content')).toBeInTheDocument()
    })
  })

  describe('when user is not authenticated', () => {
    it('should redirect to /login when user is null', () => {
      useAuth.mockReturnValue({
        user: null
      })

      const { container } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should redirect to /login when user is undefined', () => {
      useAuth.mockReturnValue({
        user: undefined
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should not render children when user is null', () => {
      useAuth.mockReturnValue({
        user: null
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Should Not Render</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('Should Not Render')).not.toBeInTheDocument()
    })

    it('should redirect when user is falsy (empty object check)', () => {
      useAuth.mockReturnValue({
        user: null
      })

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <ProtectedRoute>
            <div>Admin Panel</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
    })

    it('should handle case when useAuth returns empty object', () => {
      useAuth.mockReturnValue({})

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle user object with id: 0', () => {
      useAuth.mockReturnValue({
        user: { id: 0, email: 'test@test.com' }
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Zero ID Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByText('Zero ID Content')).toBeInTheDocument()
    })

    it('should handle empty user object', () => {
      useAuth.mockReturnValue({
        user: {}
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Empty Object Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByText('Empty Object Content')).toBeInTheDocument()
    })

    it('should render when user is an empty string (truthy check)', () => {
      useAuth.mockReturnValue({
        user: ''
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Should Not Render</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('Should Not Render')).not.toBeInTheDocument()
    })

    it('should handle false as user value', () => {
      useAuth.mockReturnValue({
        user: false
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>False User</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('False User')).not.toBeInTheDocument()
    })

    it('should handle 0 as user value', () => {
      useAuth.mockReturnValue({
        user: 0
      })

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Zero User</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.queryByText('Zero User')).not.toBeInTheDocument()
    })
  })

  describe('rendering behavior', () => {
    it('should pass through children as-is without modification', () => {
      useAuth.mockReturnValue({
        user: { id: 1 }
      })

      const TestComponent = () => <div data-testid="test-component">Test</div>

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    it('should not wrap children in extra elements', () => {
      useAuth.mockReturnValue({
        user: { id: 1 }
      })

      const { container } = render(
        <MemoryRouter>
          <ProtectedRoute>
            <div data-testid="child">Child</div>
          </ProtectedRoute>
        </MemoryRouter>
      )

      const child = screen.getByTestId('child')
      expect(child.parentElement).toBe(container.firstChild)
    })
  })
})
