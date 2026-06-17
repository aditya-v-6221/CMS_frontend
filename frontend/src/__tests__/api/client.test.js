import axios from 'axios'
import api from '../../api/client'

jest.mock('axios')

describe('API Client', () => {
  let mockCreate
  let mockInterceptors

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    window.location.href = ''

    mockInterceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    }

    mockCreate = {
      interceptors: mockInterceptors,
    }

    axios.create.mockReturnValue(mockCreate)
  })

  describe('Initialization', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(axios.create).toHaveBeenCalledWith({ baseURL: '/api' })
    })

    it('should register request interceptor', () => {
      expect(mockInterceptors.request.use).toHaveBeenCalled()
    })

    it('should register response interceptor', () => {
      expect(mockInterceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('Request Interceptor', () => {
    let requestInterceptor

    beforeEach(() => {
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

    it('should return the config object', () => {
      const config = { headers: {}, url: '/test' }

      const result = requestInterceptor(config)

      expect(result).toBe(config)
      expect(result.url).toBe('/test')
    })
  })

  describe('Response Interceptor', () => {
    let successHandler
    let errorHandler

    beforeEach(() => {
      successHandler = mockInterceptors.response.use.mock.calls[0][0]
      errorHandler = mockInterceptors.response.use.mock.calls[0][1]
    })

    describe('Success Handler', () => {
      it('should return response unchanged for successful responses', () => {
        const response = { data: { id: 1 }, status: 200 }

        const result = successHandler(response)

        expect(result).toBe(response)
      })
    })

    describe('Error Handler', () => {
      it('should clear localStorage and redirect to login on 401 error', () => {
        const error = {
          response: { status: 401 },
        }

        const promise = errorHandler(error)

        expect(localStorage.removeItem).toHaveBeenCalledWith('token')
        expect(localStorage.removeItem).toHaveBeenCalledWith('user')
        expect(window.location.href).toBe('/login')
        expect(promise).rejects.toBe(error)
      })

      it('should not redirect for 400 error', () => {
        const error = {
          response: { status: 400, data: { detail: 'Bad request' } },
        }

        const promise = errorHandler(error)

        expect(localStorage.removeItem).not.toHaveBeenCalled()
        expect(window.location.href).toBe('')
        expect(promise).rejects.toBe(error)
      })

      it('should not redirect for 403 error', () => {
        const error = {
          response: { status: 403 },
        }

        const promise = errorHandler(error)

        expect(localStorage.removeItem).not.toHaveBeenCalled()
        expect(window.location.href).toBe('')
        expect(promise).rejects.toBe(error)
      })

      it('should not redirect for 500 error', () => {
        const error = {
          response: { status: 500 },
        }

        const promise = errorHandler(error)

        expect(localStorage.removeItem).not.toHaveBeenCalled()
        expect(window.location.href).toBe('')
        expect(promise).rejects.toBe(error)
      })

      it('should handle error without response object', () => {
        const error = { message: 'Network error' }

        const promise = errorHandler(error)

        expect(localStorage.removeItem).not.toHaveBeenCalled()
        expect(window.location.href).toBe('')
        expect(promise).rejects.toBe(error)
      })

      it('should handle error with null response', () => {
        const error = { response: null }

        const promise = errorHandler(error)

        expect(localStorage.removeItem).not.toHaveBeenCalled()
        expect(promise).rejects.toBe(error)
      })

      it('should return rejected promise with original error', async () => {
        const error = {
          response: { status: 404, data: { detail: 'Not found' } },
        }

        await expect(errorHandler(error)).rejects.toBe(error)
      })
    })
  })
})
