import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('AuthProvider initialization', () => {
    it('should initialize with null user when localStorage is empty', () => {
      localStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current.user).toBeNull()
    })

    it('should initialize with user from localStorage when valid JSON exists', () => {
      const userData = { id: 1, email: 'test@example.com', role: 'admin' }
      localStorage.getItem.mockReturnValue(JSON.stringify(userData))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current.user).toEqual(userData)
    })

    it('should initialize with null when localStorage contains invalid JSON', () => {
      localStorage.getItem.mockReturnValue('{invalid json')

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current.user).toBeNull()
    })

    it('should initialize with null when localStorage returns empty string', () => {
      localStorage.getItem.mockReturnValue('')

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current.user).toBeNull()
    })

    it('should initialize with null when localStorage returns undefined', () => {
      localStorage.getItem.mockReturnValue(undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current.user).toBeNull()
    })

    it('should call localStorage.getItem with "user" key', () => {
      localStorage.getItem.mockReturnValue(null)

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(localStorage.getItem).toHaveBeenCalledWith('user')
    })
  })

  describe('login function', () => {
    it('should save token to localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.login('test-token', { id: 1, email: 'user@test.com' })
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token')
    })

    it('should save user data as JSON string to localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })
      const userData = { id: 1, email: 'user@test.com', role: 'editor' }

      act(() => {
        result.current.login('token', userData)
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(userData)
      )
    })

    it('should update user state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })
      const userData = { id: 5, email: 'admin@test.com', role: 'admin', full_name: 'Admin User' }

      act(() => {
        result.current.login('my-token', userData)
      })

      expect(result.current.user).toEqual(userData)
    })

    it('should handle empty string token', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.login('', { id: 1 })
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('token', '')
    })

    it('should handle user object with many properties', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })
      const userData = {
        id: 123,
        email: 'complex@test.com',
        role: 'reviewer',
        full_name: 'Complex User',
        department: 'Legal',
        created_at: '2024-01-01'
      }

      act(() => {
        result.current.login('token', userData)
      })

      expect(result.current.user).toEqual(userData)
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData))
    })

    it('should overwrite existing user data', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'old@test.com' }))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      const newUserData = { id: 2, email: 'new@test.com' }
      act(() => {
        result.current.login('new-token', newUserData)
      })

      expect(result.current.user).toEqual(newUserData)
    })
  })

  describe('logout function', () => {
    it('should remove token from localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.logout()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
    })

    it('should remove user from localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.logout()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })

    it('should set user state to null', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'test@test.com' }))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
    })

    it('should work when called multiple times', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.login('token', { id: 1 })
        result.current.logout()
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledTimes(4)
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow()
    })

    it('should return context value with user, login, and logout', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('logout')
      expect(typeof result.current.login).toBe('function')
      expect(typeof result.current.logout).toBe('function')
    })
  })

  describe('AuthProvider rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      )

      expect(getByText('Test Child')).toBeTruthy()
    })

    it('should render multiple children', () => {
      const { getByText } = render(
        <AuthProvider>
          <div>Child 1</div>
          <div>Child 2</div>
        </AuthProvider>
      )

      expect(getByText('Child 1')).toBeTruthy()
      expect(getByText('Child 2')).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('should handle login with null userData', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.login('token', null)
      })

      expect(result.current.user).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', 'null')
    })

    it('should handle login with undefined userData', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      act(() => {
        result.current.login('token', undefined)
      })

      expect(result.current.user).toBeUndefined()
    })

    it('should handle extremely long token string', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })
      const longToken = 'a'.repeat(10000)

      act(() => {
        result.current.login(longToken, { id: 1 })
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('token', longToken)
    })
  })
})
