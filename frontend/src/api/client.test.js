import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import api from './client'

vi.mock('axios')

describe('api client', () => {
  let mockCreate
  let mockInterceptors
  let requestInterceptor
  let responseInterceptor

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    mockInterceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    }

    mockCreate = {
      interceptors: mockInterceptors,
    }

    axios.create = vi.fn(() => mockCreate)

    requestInterceptor = mockInterceptors.request.use.mock.calls[0]?.[0]
    responseInterceptor = mockInterceptors.response.use.mock.calls[0]
  })

  describe('axios instance creation', () => {
    it('should create axios instance with correct baseURL', () => {
      const clientModule = require('./client')
      expect(axios.create).toHaveBeenCalledWith({ baseURL: '/api' })
    })
  })

  describe('request interceptor', () => {
    beforeEach(() => {
      const clientModule = require('./client')
      requestInterceptor = mockInterceptors.request.use.mock.calls[0][0]
    })

    it('should add Authorization header when token exists', () => {
      localStorage.getItem.mockReturnValue('test-token-123')
      const config = { headers: {} }

      const result = requestInterceptor(config)

      expect(localStorage.getItem).toHaveBeenCalledWith('token')
      expect(result.headers.Authorization).toBe('Bearer test-token-123')
    })

    it('should not add Authorization header when token is null', () => {
      localStorage.getItem.mockReturnValue(null)
      const config = { headers: {} }

      const result = requestInterceptor(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should not add Authorization header when token is empty string', () => {
      localStorage.getItem.mockReturnValue('')
      const config = { headers: {} }

      const result = requestInterceptor(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should preserve existing config properties', () => {
      localStorage.getItem.mockReturnValue('token')
      const config = {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        url: '/test'
      }

      const result = requestInterceptor(config)

      expect(result.method).toBe('POST')
      expect(result.url).toBe('/test')
      expect(result.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('response interceptor', () => {
    beforeEach(() => {
      const clientModule = require('./client')
      responseInterceptor = mockInterceptors.response.use.mock.calls[0]
    })

    it('should pass through successful responses', () => {
      const successHandler = responseInterceptor[0]
      const response = { data: { test: 'data' }, status: 200 }

      const result = successHandler(response)

      expect(result).toBe(response)
    })

    it('should remove token and user on 401 error', () => {
      const errorHandler = responseInterceptor[1]
      const error = {
        response: { status: 401, data: {} }
      }

      const promise = errorHandler(error)

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(promise).rejects.toBe(error)
    })

    it('should redirect to /login on 401 error', () => {
      const errorHandler = responseInterceptor[1]
      const error = {
        response: { status: 401 }
      }

      errorHandler(error)

      expect(window.location.href).toBe('/login')
    })

    it('should not redirect on 403 error', () => {
      const errorHandler = responseInterceptor[1]
      const error = {
        response: { status: 403 }
      }

      errorHandler(error)

      expect(window.location.href).not.toBe('/login')
      expect(localStorage.removeItem).not.toHaveBeenCalled()
    })

    it('should not redirect on 500 error', () => {
      const errorHandler = responseInterceptor[1]
      const error = {
        response: { status: 500 }
      }

      errorHandler(error)

      expect(window.location.href).not.toBe('/login')
      expect(localStorage.removeItem).not.toHaveBeenCalled()
    })

    it('should handle error with no response object', () => {
      const errorHandler = responseInterceptor[1]
      const error = { message: 'Network Error' }

      const promise = errorHandler(error)

      expect(localStorage.removeItem).not.toHaveBeenCalled()
      expect(promise).rejects.toBe(error)
    })

    it('should handle error with undefined response status', () => {
      const errorHandler = responseInterceptor[1]
      const error = { response: {} }

      const promise = errorHandler(error)

      expect(localStorage.removeItem).not.toHaveBeenCalled()
      expect(promise).rejects.toBe(error)
    })

    it('should reject promise with original error on 401', async () => {
      const errorHandler = responseInterceptor[1]
      const error = {
        response: { status: 401, data: { detail: 'Unauthorized' } }
      }

      await expect(errorHandler(error)).rejects.toBe(error)
    })

    it('should reject promise with original error on non-401', async () => {
      const errorHandler = responseInterceptor[1]
      const error = {
        response: { status: 400, data: { detail: 'Bad request' } }
      }

      await expect(errorHandler(error)).rejects.toBe(error)
    })
  })
})
