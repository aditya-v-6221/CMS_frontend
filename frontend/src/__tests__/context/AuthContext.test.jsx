import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  const TestConsumer = () => {
    const { user, login, logout } = useAuth()
    return (
      <div>
        <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
        <button onClick={() => login('token123', { id: 1, email: 'test@example.com', role: 'viewer' })}>
          Login
        </button>
        <button onClick={logout}>Logout</button>
      </div>
    )
  }

  describe('AuthProvider Initialization', () => {
    it('should initialize with null user when localStorage is empty', () => {
      localStorage.getItem.mockReturnValue(null)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should initialize with user from localStorage when valid JSON exists', () => {
      const userData = { id: 5, email: 'stored@example.com', role: 'admin' }
      localStorage.getItem.mockReturnValue(JSON.stringify(userData))

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      expect(localStorage.getItem).toHaveBeenCalledWith('user')
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(userData))
    })

    it('should initialize with null user when localStorage has invalid JSON', () => {
      localStorage.getItem.mockReturnValue('invalid-json{')

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should initialize with null user when localStorage throws error', () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })
  })

  describe('login function', () => {
    it('should store token and user data in localStorage', () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'token123')
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify({ id: 1, email: 'test@example.com', role: 'viewer' }))
    })

    it('should update user state after login', () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    it('should handle login with minimal user data', () => {
      const TestMinimalLogin = () => {
        const { user, login } = useAuth()
        return (
          <div>
            <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
            <button onClick={() => login('token', { email: 'min@example.com' })}>Login</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestMinimalLogin />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify({ email: 'min@example.com' }))
    })

    it('should handle login with full user data including full_name and department', () => {
      const TestFullLogin = () => {
        const { user, login } = useAuth()
        return (
          <div>
            <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
            <button onClick={() => login('token', { id: 10, email: 'full@example.com', full_name: 'John Doe', department: 'Engineering', role: 'editor' })}>Login</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestFullLogin />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Login').click()
      })

      const storedUser = JSON.parse(localStorage.setItem.mock.calls.find(call => call[0] === 'user')[1])
      expect(storedUser).toEqual({ id: 10, email: 'full@example.com', full_name: 'John Doe', department: 'Engineering', role: 'editor' })
    })
  })

  describe('logout function', () => {
    it('should remove token and user from localStorage', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'test@example.com' }))

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Logout').click()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })

    it('should set user state to null after logout', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'test@example.com' }))

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).not.toHaveTextContent('null')

      act(() => {
        screen.getByText('Logout').click()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should handle logout when already logged out', () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      act(() => {
        screen.getByText('Logout').click()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestOutsideProvider = () => {
        useAuth()
        return null
      }

      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => render(<TestOutsideProvider />)).toThrow()

      consoleError.mockRestore()
    })

    it('should provide access to user, login, and logout', () => {
      const TestHookAccess = () => {
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
          <TestHookAccess />
        </AuthProvider>
      )

      expect(screen.getByTestId('has-user')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-login')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-logout')).toHaveTextContent('yes')
    })
  })

  describe('Multiple children', () => {
    it('should share user state across multiple consumers', () => {
      const Consumer1 = () => {
        const { user } = useAuth()
        return <div data-testid="consumer1">{user?.email || 'no-user'}</div>
      }

      const Consumer2 = () => {
        const { user, login } = useAuth()
        return (
          <div>
            <div data-testid="consumer2">{user?.email || 'no-user'}</div>
            <button onClick={() => login('token', { email: 'shared@example.com' })}>Login</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <Consumer1 />
          <Consumer2 />
        </AuthProvider>
      )

      expect(screen.getByTestId('consumer1')).toHaveTextContent('no-user')
      expect(screen.getByTestId('consumer2')).toHaveTextContent('no-user')

      act(() => {
        screen.getByText('Login').click()
      })

      expect(screen.getByTestId('consumer1')).toHaveTextContent('shared@example.com')
      expect(screen.getByTestId('consumer2')).toHaveTextContent('shared@example.com')
    })
  })
})
