import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('AuthProvider', () => {
    it('should render children', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      )
      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })

    it('should initialize user from localStorage when valid JSON exists', () => {
      const userData = { id: 1, email: 'test@example.com', role: 'editor' }
      localStorage.setItem('user', JSON.stringify(userData))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      expect(result.current.user).toEqual(userData)
    })

    it('should initialize user as null when localStorage is empty', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      expect(result.current.user).toBeNull()
    })

    it('should initialize user as null when localStorage contains invalid JSON', () => {
      localStorage.setItem('user', 'invalid-json{')

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      expect(result.current.user).toBeNull()
    })

    it('should initialize user as null when localStorage contains null', () => {
      localStorage.setItem('user', null)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      expect(result.current.user).toBeNull()
    })

    it('should initialize user as null when localStorage contains undefined', () => {
      localStorage.setItem('user', undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      expect(result.current.user).toBeNull()
    })
  })

  describe('login function', () => {
    it('should store token in localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const token = 'test-token-123'
      const userData = { id: 1, email: 'user@test.com' }

      act(() => {
        result.current.login(token, userData)
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('token', token)
    })

    it('should store user data in localStorage as JSON', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const token = 'test-token-123'
      const userData = { id: 1, email: 'user@test.com', role: 'admin' }

      act(() => {
        result.current.login(token, userData)
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData))
    })

    it('should update user state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const token = 'test-token-123'
      const userData = { id: 1, email: 'user@test.com' }

      act(() => {
        result.current.login(token, userData)
      })

      expect(result.current.user).toEqual(userData)
    })

    it('should handle empty token', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const userData = { id: 1, email: 'user@test.com' }

      act(() => {
        result.current.login('', userData)
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('token', '')
      expect(result.current.user).toEqual(userData)
    })

    it('should handle null token', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const userData = { id: 1, email: 'user@test.com' }

      act(() => {
        result.current.login(null, userData)
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('token', null)
    })

    it('should handle user data with complex nested objects', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const token = 'test-token'
      const userData = {
        id: 1,
        email: 'user@test.com',
        profile: {
          name: 'Test User',
          settings: { theme: 'dark' }
        }
      }

      act(() => {
        result.current.login(token, userData)
      })

      expect(result.current.user).toEqual(userData)
    })

    it('should overwrite existing user data', () => {
      localStorage.setItem('user', JSON.stringify({ id: 999, email: 'old@test.com' }))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const newUserData = { id: 1, email: 'new@test.com' }

      act(() => {
        result.current.login('new-token', newUserData)
      })

      expect(result.current.user).toEqual(newUserData)
    })
  })

  describe('logout function', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      act(() => {
        result.current.logout()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
    })

    it('should remove user from localStorage', () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      act(() => {
        result.current.logout()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })

    it('should set user state to null', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      act(() => {
        result.current.login('token', { id: 1 })
      })

      expect(result.current.user).toEqual({ id: 1 })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
    })

    it('should work when called multiple times', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      act(() => {
        result.current.login('token', { id: 1 })
        result.current.logout()
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
    })

    it('should work when no user is logged in', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAuth())
      }).toThrow()

      consoleSpy.mockRestore()
    })

    it('should return context value when used inside AuthProvider', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('logout')
    })

    it('should provide stable function references', () => {
      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      const loginRef = result.current.login
      const logoutRef = result.current.logout

      rerender()

      expect(result.current.login).toBe(loginRef)
      expect(result.current.logout).toBe(logoutRef)
    })
  })
})
