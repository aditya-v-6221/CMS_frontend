import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Test component to access context
function TestComponent() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button onClick={() => login('token123', { id: 1, email: 'test@example.com' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('AuthProvider initialization', () => {
    it('should initialize with null user when localStorage is empty', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should initialize with user from localStorage when valid JSON exists', () => {
      const userData = { id: 42, email: 'user@test.com', role: 'admin' }
      localStorage.setItem('user', JSON.stringify(userData))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(userData))
    })

    it('should initialize with null when localStorage has invalid JSON', () => {
      localStorage.setItem('user', 'invalid-json-{]')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should handle empty string in localStorage', () => {
      localStorage.setItem('user', '')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should handle null value in localStorage', () => {
      localStorage.setItem('user', 'null')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })
  })

  describe('login function', () => {
    it('should set token and user in localStorage', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      expect(localStorage.getItem('token')).toBe('token123')
      expect(localStorage.getItem('user')).toBe(
        JSON.stringify({ id: 1, email: 'test@example.com' })
      )
    })

    it('should update user state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      expect(screen.getByTestId('user')).toHaveTextContent(
        JSON.stringify({ id: 1, email: 'test@example.com' })
      )
    })

    it('should handle user data with all fields', () => {
      function CustomTest() {
        const { user, login } = useAuth()
        return (
          <div>
            <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
            <button
              onClick={() =>
                login('token-abc', {
                  id: 99,
                  email: 'admin@test.com',
                  role: 'admin',
                  full_name: 'Test Admin',
                })
              }
            >
              Login
            </button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <CustomTest />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      const userData = JSON.parse(screen.getByTestId('user').textContent)
      expect(userData.id).toBe(99)
      expect(userData.email).toBe('admin@test.com')
      expect(userData.role).toBe('admin')
      expect(userData.full_name).toBe('Test Admin')
    })

    it('should overwrite existing user data', () => {
      localStorage.setItem('token', 'old-token')
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'old@test.com' }))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      expect(localStorage.getItem('token')).toBe('token123')
      expect(localStorage.getItem('user')).toBe(
        JSON.stringify({ id: 1, email: 'test@example.com' })
      )
    })
  })

  describe('logout function', () => {
    it('should remove token and user from localStorage', () => {
      localStorage.setItem('token', 'token123')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Logout').click()
      })

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })

    it('should set user state to null', () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).not.toHaveTextContent('null')

      act(() => {
        screen.getByText('Logout').click()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should work even when user is already logged out', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Logout').click()
      })

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow()

      spy.mockRestore()
    })

    it('should provide user, login, and logout functions', () => {
      function HookTest() {
        const context = useAuth()
        return (
          <div>
            <div data-testid="has-user">{context.user !== undefined ? 'yes' : 'no'}</div>
            <div data-testid="has-login">{typeof context.login === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-logout">{typeof context.logout === 'function' ? 'yes' : 'no'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <HookTest />
        </AuthProvider>
      )

      expect(screen.getByTestId('has-user')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-login')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-logout')).toHaveTextContent('yes')
    })
  })

  describe('boundary values', () => {
    it('should handle extremely long token', () => {
      const longToken = 'a'.repeat(100000)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        const { login } = useAuth()
        login(longToken, { id: 1 })
      })

      expect(localStorage.getItem('token')).toBe(longToken)
    })

    it('should handle user object with special characters', () => {
      function SpecialTest() {
        const { user, login } = useAuth()
        return (
          <div>
            <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
            <button
              onClick={() =>
                login('token', {
                  id: 1,
                  email: 'test+special@example.com',
                  name: "O'Brien \"Test\"",
                })
              }
            >
              Login
            </button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <SpecialTest />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      const stored = JSON.parse(localStorage.getItem('user'))
      expect(stored.email).toBe('test+special@example.com')
      expect(stored.name).toBe("O'Brien \"Test\"")
    })

    it('should handle empty user object', () => {
      function EmptyUserTest() {
        const { user, login } = useAuth()
        return (
          <div>
            <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
            <button onClick={() => login('token', {})}>Login</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <EmptyUserTest />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      expect(localStorage.getItem('user')).toBe('{}')
    })
  })
})
