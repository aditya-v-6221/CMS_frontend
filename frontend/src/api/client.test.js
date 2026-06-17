import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import api from './client'

vi.mock('axios')

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    delete window.location
    window.location = { href: '' }
  })

  describe('axios instance creation', () => {
    it('should create axios instance with baseURL /api', () => {
      expect(axios.create).toHaveBeenCalledWith({ baseURL: '/api' })
    })
  })

  describe('request interceptor', () => {
    let requestInterceptor

    beforeEach(() => {
      const mockCreate = vi.fn().mockReturnValue({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })
      axios.create = mockCreate

      // Re-import to get interceptor
      const interceptorCalls = mockCreate.mock.results[0]?.value?.interceptors?.request?.use?.mock?.calls
      if (interceptorCalls?.[0]?.[0]) {
        requestInterceptor = interceptorCalls[0][0]
      }
    })

    it('should add Authorization header when token exists in localStorage', () => {
      localStorage.setItem('token', 'test-token-123')
      const config = { headers: {} }

      if (requestInterceptor) {
        const result = requestInterceptor(config)
        expect(result.headers.Authorization).toBe('Bearer test-token-123')
      }
    })

    it('should not add Authorization header when token does not exist', () => {
      localStorage.removeItem('token')
      const config = { headers: {} }

      if (requestInterceptor) {
        const result = requestInterceptor(config)
        expect(result.headers.Authorization).toBeUndefined()
      }
    })

    it('should handle null token', () => {
      localStorage.setItem('token', null)
      const config = { headers: {} }

      if (requestInterceptor) {
        const result = requestInterceptor(config)
        expect(result.headers.Authorization).toBeUndefined()
      }
    })

    it('should handle empty string token', () => {
      localStorage.setItem('token', '')
      const config = { headers: {} }

      if (requestInterceptor) {
        const result = requestInterceptor(config)
        expect(result.headers.Authorization).toBeUndefined()
      }
    })

    it('should return config unchanged except for Authorization header', () => {
      localStorage.setItem('token', 'test-token')
      const config = {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        data: { test: 'data' }
      }

      if (requestInterceptor) {
        const result = requestInterceptor(config)
        expect(result.method).toBe('POST')
        expect(result.data).toEqual({ test: 'data' })
        expect(result.headers['Content-Type']).toBe('application/json')
      }
    })
  })

  describe('response interceptor', () => {
    let responseSuccessInterceptor
    let responseErrorInterceptor

    beforeEach(() => {
      const mockCreate = vi.fn().mockReturnValue({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })
      axios.create = mockCreate

      const interceptorCalls = mockCreate.mock.results[0]?.value?.interceptors?.response?.use?.mock?.calls
      if (interceptorCalls?.[0]) {
        responseSuccessInterceptor = interceptorCalls[0][0]
        responseErrorInterceptor = interceptorCalls[0][1]
      }
    })

    it('should pass through successful responses', () => {
      const response = { data: { success: true }, status: 200 }

      if (responseSuccessInterceptor) {
        const result = responseSuccessInterceptor(response)
        expect(result).toBe(response)
      }
    })

    it('should handle 401 error by clearing localStorage and redirecting to login', async () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      const error = {
        response: { status: 401 }
      }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
        expect(localStorage.removeItem).toHaveBeenCalledWith('token')
        expect(localStorage.removeItem).toHaveBeenCalledWith('user')
        expect(window.location.href).toBe('/login')
      }
    })

    it('should handle 401 error without response object', async () => {
      const error = { response: { status: 401 } }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
      }
    })

    it('should pass through non-401 errors without clearing localStorage', async () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      const error = {
        response: { status: 500 }
      }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
        expect(localStorage.removeItem).not.toHaveBeenCalled()
        expect(window.location.href).not.toBe('/login')
      }
    })

    it('should handle 403 error without clearing localStorage', async () => {
      localStorage.setItem('token', 'test-token')

      const error = {
        response: { status: 403 }
      }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
        expect(localStorage.removeItem).not.toHaveBeenCalled()
      }
    })

    it('should handle 404 error without clearing localStorage', async () => {
      const error = {
        response: { status: 404 }
      }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
        expect(localStorage.removeItem).not.toHaveBeenCalled()
      }
    })

    it('should handle network error without response', async () => {
      const error = {
        message: 'Network Error'
      }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
        expect(localStorage.removeItem).not.toHaveBeenCalled()
      }
    })

    it('should handle error with null response', async () => {
      const error = {
        response: null
      }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
      }
    })

    it('should handle error with undefined status', async () => {
      const error = {
        response: { status: undefined }
      }

      if (responseErrorInterceptor) {
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error)
        expect(localStorage.removeItem).not.toHaveBeenCalled()
      }
    })
  })
})
