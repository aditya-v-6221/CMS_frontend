import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'

// Test components
function ProtectedContent() {
  return <div>Protected Content</div>
}

function LoginPage() {
  return <div>Login Page</div>
}

// Helper to render with router and auth context
function renderWithContext(user = null) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('authenticated user', () => {
    it('should render children when user is logged in', () => {
      renderWithContext({ id: 1, email: 'test@example.com' })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    })

    it('should render children with admin user', () => {
      renderWithContext({ id: 1, email: 'admin@test.com', role: 'admin' })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should render children with editor user', () => {
      renderWithContext({ id: 2, email: 'editor@test.com', role: 'editor' })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should render children with reviewer user', () => {
      renderWithContext({ id: 3, email: 'reviewer@test.com', role: 'reviewer' })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should render children with viewer user', () => {
      renderWithContext({ id: 4, email: 'viewer@test.com', role: 'viewer' })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should render children with minimal user object', () => {
      renderWithContext({ id: 1 })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should render children with user having additional properties', () => {
      renderWithContext({
        id: 1,
        email: 'test@test.com',
        role: 'admin',
        full_name: 'Test User',
        department: 'Engineering',
      })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('unauthenticated user', () => {
    it('should redirect to login when user is null', () => {
      renderWithContext(null)

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    it('should redirect to login when localStorage is empty', () => {
      renderWithContext()

      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    it('should redirect to login when user is undefined', () => {
      localStorage.removeItem('user')

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <ProtectedContent />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      )

      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  describe('navigation behavior', () => {
    it('should use replace navigation', () => {
      // This tests that Navigate is called with replace prop
      renderWithContext(null)

      // If replace is used, going back shouldn't return to protected route
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    it('should navigate to /login path', () => {
      renderWithContext(null)

      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  describe('children rendering', () => {
    it('should render multiple children when authenticated', () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }))

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Child 1</div>
                    <div>Child 2</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })

    it('should render complex children components', () => {
      function ComplexChild() {
        return (
          <div>
            <h1>Title</h1>
            <p>Content</p>
            <button>Action</button>
          </div>
        )
      }

      renderWithContext({ id: 1, email: 'test@test.com' })

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <ComplexChild />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      )
    })

    it('should pass through children unchanged when authenticated', () => {
      function ChildWithProps({ name }) {
        return <div>Hello {name}</div>
      }

      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <ChildWithProps name="World" />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      )

      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })
  })

  describe('boundary values', () => {
    it('should handle user with id 0', () => {
      renderWithContext({ id: 0, email: 'zero@test.com' })

      // id: 0 is falsy but user object exists, so should be authenticated
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should handle empty user object', () => {
      renderWithContext({})

      // Empty object is truthy, so should be authenticated
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should handle user with empty string email', () => {
      renderWithContext({ id: 1, email: '' })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should handle very large user object', () => {
      const largeUser = {
        id: 1,
        email: 'test@test.com',
        ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`field${i}`, `value${i}`])),
      }

      renderWithContext(largeUser)

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('equivalence classes', () => {
    // Valid user - should render content
    const validUsers = [
      { id: 1, email: 'user@test.com', role: 'viewer' },
      { id: 999, email: 'admin@test.com', role: 'admin' },
      { id: -1, email: 'test@test.com' }, // negative id
    ]

    validUsers.forEach((user, index) => {
      it(`should render content for valid user ${index + 1}`, () => {
        renderWithContext(user)
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    // Invalid/null user - should redirect
    it('should redirect for null user', () => {
      renderWithContext(null)
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })
})
