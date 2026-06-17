import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

// Mock api client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Helper function to render LoginPage with all required providers
const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('rendering', () => {
    it('should render Sign in heading', () => {
      renderLoginPage()
      expect(screen.getByText('Sign in')).toBeTruthy()
    })

    it('should render Contract Management System subtitle', () => {
      renderLoginPage()
      expect(screen.getByText('Contract Management System')).toBeTruthy()
    })

    it('should render email input field', () => {
      renderLoginPage()
      expect(screen.getByLabelText('Email')).toBeTruthy()
    })

    it('should render password input field', () => {
      renderLoginPage()
      expect(screen.getByLabelText('Password')).toBeTruthy()
    })

    it('should render Sign in button', () => {
      renderLoginPage()
      expect(screen.getByRole('button', { name: /Sign in/i })).toBeTruthy()
    })

    it('should render Register link', () => {
      renderLoginPage()
      expect(screen.getByText('Register')).toBeTruthy()
    })

    it('should have email input with type email', () => {
      renderLoginPage()
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput.type).toBe('email')
    })

    it('should have password input with type password', () => {
      renderLoginPage()
      const passwordInput = screen.getByLabelText('Password')
      expect(passwordInput.type).toBe('password')
    })

    it('should have email input with required attribute', () => {
      renderLoginPage()
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput.required).toBe(true)
    })

    it('should have password input with required attribute', () => {
      renderLoginPage()
      const passwordInput = screen.getByLabelText('Password')
      expect(passwordInput.required).toBe(true)
    })

    it('should have email input with autofocus', () => {
      renderLoginPage()
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput.autofocus).toBeDefined()
    })
  })

  describe('form input changes', () => {
    it('should update email field on user input', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test@example.com')

      expect(emailInput.value).toBe('test@example.com')
    })

    it('should update password field on user input', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'password123')

      expect(passwordInput.value).toBe('password123')
    })

    it('should handle empty email', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test')
      await user.clear(emailInput)

      expect(emailInput.value).toBe('')
    })

    it('should handle empty password', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'pass')
      await user.clear(passwordInput)

      expect(passwordInput.value).toBe('')
    })

    it('should handle special characters in email', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test+tag@example.co.uk')

      expect(emailInput.value).toBe('test+tag@example.co.uk')
    })

    it('should handle special characters in password', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'P@ssw0rd!#$%')

      expect(passwordInput.value).toBe('P@ssw0rd!#$%')
    })
  })

  describe('successful login', () => {
    it('should call API with correct credentials on form submit', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          user: { id: 1, email: 'test@test.com', role: 'admin' }
        }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/auth/login',
          expect.any(URLSearchParams)
        )
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('username')).toBe('test@test.com')
      expect(callArgs.get('password')).toBe('password123')
    })

    it('should save token to localStorage on successful login', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'auth-token-123',
          user: { id: 1, email: 'user@test.com', role: 'editor' }
        }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'user@test.com')
      await user.type(screen.getByLabelText('Password'), 'mypassword')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'auth-token-123')
      })
    })

    it('should save user data to localStorage on successful login', async () => {
      const user = userEvent.setup()
      const userData = { id: 5, email: 'admin@test.com', role: 'admin', full_name: 'Admin User' }
      api.post.mockResolvedValue({
        data: {
          access_token: 'token',
          user: userData
        }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'admin@test.com')
      await user.type(screen.getByLabelText('Password'), 'adminpass')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData))
      })
    })

    it('should navigate to home page on successful login', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@test.com' }
        }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should show loading state during login', async () => {
      const user = userEvent.setup()
      let resolveLogin
      api.post.mockReturnValue(new Promise(resolve => { resolveLogin = resolve }))

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      expect(screen.getByText('Signing in…')).toBeTruthy()

      resolveLogin({ data: { access_token: 'token', user: { id: 1 } } })
    })

    it('should disable button during loading', async () => {
      const user = userEvent.setup()
      let resolveLogin
      api.post.mockReturnValue(new Promise(resolve => { resolveLogin = resolve }))

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      const button = screen.getByRole('button', { name: /Sign in/i })
      await user.click(button)

      expect(button.disabled).toBe(true)

      resolveLogin({ data: { access_token: 'token', user: { id: 1 } } })
    })
  })

  describe('login errors', () => {
    it('should display error message on API error with detail string', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'wrong@test.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeTruthy()
      })
    })

    it('should display default error message when detail is missing', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: {} }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'pass')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeTruthy()
      })
    })

    it('should display default error message on network error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({ message: 'Network Error' })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeTruthy()
      })
    })

    it('should clear previous error on new submission', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'First error' } }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'pass1')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeTruthy()
      })

      api.post.mockResolvedValueOnce({
        data: { access_token: 'token', user: { id: 1 } }
      })

      await user.clear(screen.getByLabelText('Password'))
      await user.type(screen.getByLabelText('Password'), 'pass2')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(screen.queryByText('First error')).toBeNull()
      })
    })

    it('should re-enable button after error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Error' } }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'pass')
      const button = screen.getByRole('button', { name: /Sign in/i })
      await user.click(button)

      await waitFor(() => {
        expect(button.disabled).toBe(false)
      })
    })

    it('should handle error with no response object', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue(new Error('Unknown error'))

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'pass')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeTruthy()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle very long email', async () => {
      const user = userEvent.setup()
      const longEmail = 'a'.repeat(200) + '@example.com'

      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, longEmail)

      expect(emailInput.value).toBe(longEmail)
    })

    it('should handle very long password', async () => {
      const user = userEvent.setup()
      const longPassword = 'p'.repeat(500)

      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, longPassword)

      expect(passwordInput.value).toBe(longPassword)
    })

    it('should handle single character email', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'a')

      expect(emailInput.value).toBe('a')
    })

    it('should handle single character password', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'p')

      expect(passwordInput.value).toBe('p')
    })

    it('should handle empty form submission (browser validation)', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const button = screen.getByRole('button', { name: /Sign in/i })
      await user.click(button)

      expect(api.post).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined access_token in response', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: { user: { id: 1 } }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', undefined)
      })
    })

    it('should handle null user in response', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: { access_token: 'token', user: null }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('user', 'null')
      })
    })

    it('should handle empty string token', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: { access_token: '', user: { id: 1 } }
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /Sign in/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', '')
      })
    })
  })
})
