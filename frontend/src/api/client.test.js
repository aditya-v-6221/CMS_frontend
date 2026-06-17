import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import api from './client'

vi.mock('axios')

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear()
    delete window.location
    window.location = { href: '' }
  })

  describe('axios instance creation', () => {
    it('should create axios instance with /api baseURL', () => {
      expect(axios.create).toHaveBeenCalledWith({ baseURL: '/api' })
    })
  })

  describe('request interceptor', () => {
    let mockConfig
    let requestInterceptor

    beforeEach(() => {
      mockConfig = { headers: {} }
      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      }
      axios.create.mockReturnValue(mockAxiosInstance)

      // Re-import to trigger interceptor setup
      vi.resetModules()
    })

    it('should add Authorization header when token exists in localStorage', () => {
      const token = 'test-token-123'
      localStorage.setItem('token', token)

      // Manually call the interceptor function
      const config = { headers: {} }
      const result = api.interceptors.request.handlers[0].fulfilled(config)

      expect(result.headers.Authorization).toBe(`Bearer ${token}`)
    })

    it('should not add Authorization header when token does not exist', () => {
      localStorage.removeItem('token')

      const config = { headers: {} }
      const result = api.interceptors.request.handlers[0].fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should return config object', () => {
      const config = { headers: {}, url: '/test' }
      const result = api.interceptors.request.handlers[0].fulfilled(config)

      expect(result).toBe(config)
      expect(result.url).toBe('/test')
    })
  })

  describe('response interceptor - success', () => {
    it('should return response as-is on success', () => {
      const mockResponse = { data: { id: 1 }, status: 200 }
      const result = api.interceptors.response.handlers[0].fulfilled(mockResponse)

      expect(result).toBe(mockResponse)
    })
  })

  describe('response interceptor - error handling', () => {
    it('should clear localStorage and redirect on 401 error', () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      const error = {
        response: {
          status: 401,
          data: { detail: 'Unauthorized' }
        }
      }

      expect(() => {
        api.interceptors.response.handlers[0].rejected(error)
      }).rejects.toEqual(error)

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(window.location.href).toBe('/login')
    })

    it('should not clear localStorage on non-401 errors', () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      const error = {
        response: {
          status: 500,
          data: { detail: 'Server error' }
        }
      }

      expect(() => {
        api.interceptors.response.handlers[0].rejected(error)
      }).rejects.toEqual(error)

      expect(localStorage.getItem('token')).toBe('test-token')
      expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 1 }))
    })

    it('should handle error without response object', () => {
      const error = new Error('Network error')

      expect(() => {
        api.interceptors.response.handlers[0].rejected(error)
      }).rejects.toEqual(error)

      expect(window.location.href).toBe('')
    })

    it('should handle 401 error without response.data', () => {
      localStorage.setItem('token', 'test-token')

      const error = {
        response: { status: 401 }
      }

      expect(() => {
        api.interceptors.response.handlers[0].rejected(error)
      }).rejects.toEqual(error)

      expect(localStorage.getItem('token')).toBeNull()
      expect(window.location.href).toBe('/login')
    })
  })

  describe('boundary values', () => {
    it('should handle empty token string', () => {
      localStorage.setItem('token', '')

      const config = { headers: {} }
      const result = api.interceptors.request.handlers[0].fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should handle very long token', () => {
      const longToken = 'a'.repeat(10000)
      localStorage.setItem('token', longToken)

      const config = { headers: {} }
      const result = api.interceptors.request.handlers[0].fulfilled(config)

      expect(result.headers.Authorization).toBe(`Bearer ${longToken}`)
    })

    it('should handle status codes at boundary (400, 402)', () => {
      localStorage.setItem('token', 'test-token')

      const error400 = { response: { status: 400 } }
      expect(() => {
        api.interceptors.response.handlers[0].rejected(error400)
      }).rejects.toEqual(error400)
      expect(localStorage.getItem('token')).toBe('test-token')

      const error402 = { response: { status: 402 } }
      expect(() => {
        api.interceptors.response.handlers[0].rejected(error402)
      }).rejects.toEqual(error402)
      expect(localStorage.getItem('token')).toBe('test-token')
    })
  })
})
