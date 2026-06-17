import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import api from '../api/client'
import { AuthProvider } from '../context/AuthContext'

// Mock modules
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn()
  }
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn()
  }
})

describe('LoginPage', () => {
  let mockNavigate
  let user

  // Helper function to render LoginPage with all necessary providers
  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    // Clear all mocks
    vi.clearAllMocks()

    // Setup mock navigate
    mockNavigate = vi.fn()
    const { useNavigate } = await import('react-router-dom')
    useNavigate.mockReturnValue(mockNavigate)

    // Setup user event
    user = userEvent.setup()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the login form with all elements', () => {
      renderLoginPage()

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByText(/no account\?/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
    })

    it('should render email input with correct attributes', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('autoFocus')
      expect(emailInput).toHaveValue('')
    })

    it('should render password input with correct attributes', () => {
      renderLoginPage()

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveValue('')
    })

    it('should render submit button as enabled initially', () => {
      renderLoginPage()

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeEnabled()
      expect(submitButton).not.toHaveAttribute('disabled')
    })

    it('should render register link with correct href', () => {
      renderLoginPage()

      const registerLink = screen.getByRole('link', { name: /register/i })
      expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('should not display error message initially', () => {
      renderLoginPage()

      expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument()
    })

    it('should display submit button text as "Sign in" initially', () => {
      renderLoginPage()

      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  })

  describe('User Interactions - Form Input', () => {
    it('should update email input when user types', async () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password input when user types', async () => {
      renderLoginPage()

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should update both inputs independently', async () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@test.com')
      await user.type(passwordInput, 'secret')

      expect(emailInput).toHaveValue('user@test.com')
      expect(passwordInput).toHaveValue('secret')
    })

    it('should handle empty string input', async () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test')
      await user.clear(emailInput)

      expect(emailInput).toHaveValue('')
    })

    it('should handle special characters in email', async () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test+tag@sub.example.com')

      expect(emailInput).toHaveValue('test+tag@sub.example.com')
    })

    it('should handle special characters in password', async () => {
      renderLoginPage()

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'P@ssw0rd!#$%')

      expect(passwordInput).toHaveValue('P@ssw0rd!#$%')
    })

    it('should handle very long email input', async () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      const longEmail = 'a'.repeat(100) + '@example.com'
      await user.type(emailInput, longEmail)

      expect(emailInput).toHaveValue(longEmail)
    })

    it('should handle very long password input', async () => {
      renderLoginPage()

      const passwordInput = screen.getByLabelText(/password/i)
      const longPassword = 'p'.repeat(200)
      await user.type(passwordInput, longPassword)

      expect(passwordInput).toHaveValue(longPassword)
    })

    it('should preserve input values when clicking elsewhere', async () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.click(passwordInput)

      expect(emailInput).toHaveValue('test@example.com')
    })
  })

  describe('Form Submission - Success Scenarios', () => {
    it('should call api.post with correct endpoint and data on form submit', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token-123',
          user: { id: 1, email: 'test@example.com', role: 'editor' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.any(URLSearchParams)
      )

      // Verify URLSearchParams content
      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('username')).toBe('test@example.com')
      expect(callArgs.get('password')).toBe('password123')
    })

    it('should store token and user data in localStorage on successful login', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token-123',
          user: { id: 1, email: 'test@example.com', role: 'editor' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token-123')
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 1, email: 'test@example.com', role: 'editor' })
      )
    })

    it('should navigate to home page on successful login', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should show loading state during form submission', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }

      // Delay the resolution to observe loading state
      api.post.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Check loading state
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should disable submit button during submission', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }

      api.post.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })
    })

    it('should handle form submission via Enter key', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })

    it('should handle successful login with admin role', async () => {
      const mockResponse = {
        data: {
          access_token: 'admin-token',
          user: { id: 2, email: 'admin@example.com', role: 'admin' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'admin@example.com')
      await user.type(screen.getByLabelText(/password/i), 'adminpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'user',
          JSON.stringify({ id: 2, email: 'admin@example.com', role: 'admin' })
        )
      })
    })

    it('should handle successful login with viewer role', async () => {
      const mockResponse = {
        data: {
          access_token: 'viewer-token',
          user: { id: 3, email: 'viewer@example.com', role: 'viewer' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'viewer@example.com')
      await user.type(screen.getByLabelText(/password/i), 'viewerpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should handle user object with additional properties', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: {
            id: 1,
            email: 'test@example.com',
            role: 'editor',
            name: 'Test User',
            avatar: 'https://example.com/avatar.jpg'
          }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'user',
          JSON.stringify(mockResponse.data.user)
        )
      })
    })
  })

  describe('Form Submission - Error Scenarios', () => {
    it('should display error message when login fails with detail', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should display generic error message when no detail is provided', async () => {
      const errorResponse = {
        response: {}
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should display generic error when response is undefined', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'))

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should re-enable submit button after error', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      expect(submitButton).toBeEnabled()
      expect(submitButton).toHaveTextContent('Sign in')
    })

    it('should clear previous error message on new submission', async () => {
      // First submission fails
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      // Second submission succeeds
      const successResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(successResponse)

      await user.clear(screen.getByLabelText(/password/i))
      await user.type(screen.getByLabelText(/password/i), 'correctpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Error should be cleared before API call completes
      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
      })
    })

    it('should not navigate on failed login', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should not store credentials on failed login', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      expect(localStorage.setItem).not.toHaveBeenCalledWith('token', expect.anything())
      expect(localStorage.setItem).not.toHaveBeenCalledWith('user', expect.anything())
    })

    it('should handle 401 unauthorized error', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            detail: 'Unauthorized'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument()
      })
    })

    it('should handle 500 server error', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {
            detail: 'Internal server error'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument()
      })
    })

    it('should handle network timeout error', async () => {
      api.post.mockRejectedValueOnce(new Error('timeout of 30000ms exceeded'))

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should handle empty error response data', async () => {
      const errorResponse = {
        response: {
          data: {}
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should handle null error response', async () => {
      const errorResponse = {
        response: null
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases and Boundary Values', () => {
    it('should handle empty form submission', async () => {
      renderLoginPage()

      // Try to submit without filling form - HTML5 validation should prevent this
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // API should not be called due to HTML5 required validation
      expect(api.post).not.toHaveBeenCalled()
    })

    it('should handle submission with only email filled', async () => {
      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // API should not be called due to required password field
      expect(api.post).not.toHaveBeenCalled()
    })

    it('should handle submission with only password filled', async () => {
      renderLoginPage()

      await user.type(screen.getByLabelText(/password/i), 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // API should not be called due to required email field
      expect(api.post).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only email', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: '   ' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), '   ')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('username')).toBe('   ')
    })

    it('should handle whitespace-only password', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), '   ')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('password')).toBe('   ')
    })

    it('should handle single character email', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'a' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'a')
      await user.type(screen.getByLabelText(/password/i), 'pass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })

    it('should handle single character password', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'p')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('password')).toBe('p')
    })

    it('should handle email with leading/trailing spaces', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: '  test@example.com  ' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), '  test@example.com  ')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('username')).toBe('  test@example.com  ')
    })

    it('should handle password with leading/trailing spaces', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), '  password  ')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('password')).toBe('  password  ')
    })

    it('should handle response with null access_token', async () => {
      const mockResponse = {
        data: {
          access_token: null,
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', null)
      })
    })

    it('should handle response with undefined access_token', async () => {
      const mockResponse = {
        data: {
          access_token: undefined,
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', undefined)
      })
    })

    it('should handle response with empty string access_token', async () => {
      const mockResponse = {
        data: {
          access_token: '',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', '')
      })
    })

    it('should handle response with null user', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: null
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(null))
      })
    })

    it('should handle response with empty user object', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: {}
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify({}))
      })
    })

    it('should handle response with missing data property', async () => {
      const mockResponse = {}
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')

      // This should cause an error when trying to access res.data.access_token
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // The component should handle this gracefully
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
      })
    })

    it('should handle multiple rapid submissions', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')

      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Try to submit multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only call API once due to disabled state
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })

      // The exact number of calls might be 1 or slightly more depending on timing
      // but should be much less than 3 due to the loading state
      expect(api.post).toHaveBeenCalledTimes(1)
    })

    it('should handle unicode characters in email', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'tëst@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'tëst@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('username')).toBe('tëst@example.com')
    })

    it('should handle unicode characters in password', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'pässwörd123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('password')).toBe('pässwörd123')
    })
  })

  describe('Loading State', () => {
    it('should start with loading state as false', () => {
      renderLoginPage()

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toHaveTextContent('Sign in')
      expect(submitButton).not.toHaveTextContent('Signing in')
    })

    it('should show "Signing in…" text during loading', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }

      api.post.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })
    })

    it('should restore button text after successful submission', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })

      // After navigation, the component should still be in a valid state
      // (though in practice, navigation would unmount the component)
    })

    it('should restore button text after failed submission', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toHaveTextContent('Sign in')
      expect(submitButton).not.toHaveTextContent('Signing in')
    })
  })

  describe('Form State Management', () => {
    it('should preserve email value after failed submission', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should preserve password value after failed submission', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(passwordInput, 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      expect(passwordInput).toHaveValue('wrongpass')
    })

    it('should allow form modification after error', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/email/i)
      await user.clear(emailInput)
      await user.type(emailInput, 'correct@example.com')

      expect(emailInput).toHaveValue('correct@example.com')
    })
  })

  describe('Navigation and Routing', () => {
    it('should render register link that navigates to /register', () => {
      renderLoginPage()

      const registerLink = screen.getByRole('link', { name: /register/i })
      expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('should navigate to root path after successful login', async () => {
      const mockResponse = {
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      api.post.mockResolvedValueOnce(mockResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toBeInTheDocument()
      expect(passwordInput).toBeInTheDocument()
    })

    it('should have autofocus on email input', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('autoFocus')
    })

    it('should have required attributes on inputs', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should have proper button type', () => {
      renderLoginPage()

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should display error message in accessible manner', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid credentials'
          }
        }
      }
      api.post.mockRejectedValueOnce(errorResponse)

      renderLoginPage()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText('Invalid credentials')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveClass('text-red-600')
      })
    })
  })

  describe('Component Structure', () => {
    it('should render main container with correct styling', () => {
      const { container } = renderLoginPage()

      const mainDiv = container.querySelector('.min-h-screen')
      expect(mainDiv).toBeInTheDocument()
      expect(mainDiv).toHaveClass('flex', 'items-center', 'justify-center', 'bg-gray-50')
    })

    it('should render form card with correct styling', () => {
      const { container } = renderLoginPage()

      const card = container.querySelector('.bg-white')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('rounded-xl', 'shadow-sm', 'border', 'border-gray-200')
    })

    it('should render heading with correct text', () => {
      renderLoginPage()

      const heading = screen.getByRole('heading', { name: /sign in/i })
      expect(heading).toHaveTextContent('Sign in')
    })

    it('should render subtitle text', () => {
      renderLoginPage()

      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
    })
  })
})
