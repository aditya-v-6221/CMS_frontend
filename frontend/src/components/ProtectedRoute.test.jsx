import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: vi.fn(({ to }) => <div data-testid="navigate">{to}</div>),
  }
})

const renderProtectedRoute = (user) => {
  if (user) {
    localStorage.getItem.mockReturnValue(JSON.stringify(user))
  } else {
    localStorage.getItem.mockReturnValue(null)
  }

  return render(
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('ProtectedRoute', () => {
  describe('authenticated user', () => {
    it('should render children when user is authenticated', () => {
      const user = { id: 1, email: 'test@example.com', role: 'admin' }
      const { getByTestId, queryByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
      expect(queryByTestId('navigate')).toBeNull()
    })

    it('should render children for admin user', () => {
      const user = { id: 1, email: 'admin@test.com', role: 'admin' }
      const { getByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
      expect(getByTestId('protected-content').textContent).toBe('Protected Content')
    })

    it('should render children for editor user', () => {
      const user = { id: 2, email: 'editor@test.com', role: 'editor' }
      const { getByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
    })

    it('should render children for reviewer user', () => {
      const user = { id: 3, email: 'reviewer@test.com', role: 'reviewer' }
      const { getByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
    })

    it('should render children for viewer user', () => {
      const user = { id: 4, email: 'viewer@test.com', role: 'viewer' }
      const { getByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
    })

    it('should render children when user has minimal properties', () => {
      const user = { id: 1 }
      const { getByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
    })

    it('should render children when user has extra properties', () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        role: 'admin',
        full_name: 'Test User',
        department: 'Legal',
        created_at: '2024-01-01'
      }
      const { getByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
    })
  })

  describe('unauthenticated user', () => {
    it('should redirect to /login when user is null', () => {
      const { getByTestId, queryByTestId } = renderProtectedRoute(null)

      expect(getByTestId('navigate')).toBeTruthy()
      expect(getByTestId('navigate').textContent).toBe('/login')
      expect(queryByTestId('protected-content')).toBeNull()
    })

    it('should not render children when user is not authenticated', () => {
      const { queryByTestId } = renderProtectedRoute(null)

      expect(queryByTestId('protected-content')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should redirect when localStorage contains invalid JSON', () => {
      localStorage.getItem.mockReturnValue('{invalid json')

      const { getByTestId, queryByTestId } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(getByTestId('navigate')).toBeTruthy()
      expect(queryByTestId('protected-content')).toBeNull()
    })

    it('should redirect when localStorage returns empty string', () => {
      localStorage.getItem.mockReturnValue('')

      const { getByTestId, queryByTestId } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(getByTestId('navigate')).toBeTruthy()
      expect(queryByTestId('protected-content')).toBeNull()
    })

    it('should redirect when localStorage returns undefined', () => {
      localStorage.getItem.mockReturnValue(undefined)

      const { getByTestId } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(getByTestId('navigate')).toBeTruthy()
    })
  })

  describe('multiple children rendering', () => {
    it('should render multiple children when authenticated', () => {
      const user = { id: 1, email: 'test@test.com' }
      localStorage.getItem.mockReturnValue(JSON.stringify(user))

      const { getByText } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Child 1</div>
              <div>Child 2</div>
              <div>Child 3</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(getByText('Child 1')).toBeTruthy()
      expect(getByText('Child 2')).toBeTruthy()
      expect(getByText('Child 3')).toBeTruthy()
    })

    it('should render nested children when authenticated', () => {
      const user = { id: 1, email: 'test@test.com' }
      localStorage.getItem.mockReturnValue(JSON.stringify(user))

      const { getByText } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>
                <span>Nested Content</span>
              </div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(getByText('Nested Content')).toBeTruthy()
    })
  })

  describe('boundary values', () => {
    it('should render when user object is empty but truthy', () => {
      const user = {}
      const { getByTestId } = renderProtectedRoute(user)

      expect(getByTestId('protected-content')).toBeTruthy()
    })

    it('should render when user is empty array (truthy)', () => {
      localStorage.getItem.mockReturnValue('[]')

      const { getByTestId } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(getByTestId('protected-content')).toBeTruthy()
    })

    it('should redirect when user is explicitly false', () => {
      localStorage.getItem.mockReturnValue('false')

      const { queryByTestId } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(queryByTestId('protected-content')).toBeNull()
    })

    it('should redirect when user is number 0', () => {
      localStorage.getItem.mockReturnValue('0')

      const { queryByTestId } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(queryByTestId('protected-content')).toBeNull()
    })
  })
})
