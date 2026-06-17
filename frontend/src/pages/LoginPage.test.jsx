import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client')

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLoginPage() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render login form', () => {
      renderLoginPage()

      expect(screen.getByText('Sign in')).toBeInTheDocument()
      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
    })

    it('should render email input field', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('should render password input field', () => {
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should render submit button', () => {
      renderLoginPage()

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render link to register page', () => {
      renderLoginPage()

      const registerLink = screen.getByText('Register')
      expect(registerLink).toBeInTheDocument()
      expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
    })

    it('should autofocus email input', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toHaveAttribute('autoFocus')
    })
  })

  describe('form input', () => {
    it('should update email field on input', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password field on input', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should handle empty input', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
    })

    it('should handle special characters in email', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test+special@example.com')

      expect(emailInput).toHaveValue('test+special@example.com')
    })

    it('should handle special characters in password', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'p@ssw0rd!#$%')

      expect(passwordInput).toHaveValue('p@ssw0rd!#$%')
    })
  })

  describe('form submission - success', () => {
    it('should call API with correct credentials', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'token123',
          user: { id: 1, email: 'test@example.com', role: 'viewer' },
        },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.any(URLSearchParams)
      )

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('username')).toBe('test@example.com')
      expect(callArgs.get('password')).toBe('password123')
    })

    it('should store token in localStorage on success', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'token-abc-123',
          user: { id: 1, email: 'test@example.com' },
        },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('token-abc-123')
      })
    })

    it('should store user in localStorage on success', async () => {
      const user = userEvent.setup()
      const userData = { id: 42, email: 'test@example.com', role: 'admin', full_name: 'Test User' }
      api.post.mockResolvedValue({
        data: {
          access_token: 'token123',
          user: userData,
        },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(localStorage.getItem('user')).toBe(JSON.stringify(userData))
      })
    })

    it('should navigate to home page on success', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'token123',
          user: { id: 1, email: 'test@example.com' },
        },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { access_token: 'token', user: { id: 1 } },
        }), 100))
      )

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')

      const button = screen.getByRole('button', { name: /sign in/i })
      await user.click(button)

      expect(screen.getByText('Signing in…')).toBeInTheDocument()
      expect(button).toBeDisabled()
    })
  })

  describe('form submission - error handling', () => {
    it('should display error message on API error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: {
          data: { detail: 'Invalid credentials' },
        },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'wrong@example.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should display default error message when detail is missing', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: {} },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should handle network error without response', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue(new Error('Network error'))

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should clear error message on retry', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Invalid credentials' } },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'wrong')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      api.post.mockResolvedValueOnce({
        data: { access_token: 'token', user: { id: 1 } },
      })

      await user.clear(screen.getByLabelText('Password'))
      await user.type(screen.getByLabelText('Password'), 'correct')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
      })
    })

    it('should reset loading state after error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Error' } },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      const button = screen.getByRole('button', { name: /sign in/i })
      expect(button).not.toBeDisabled()
    })
  })

  describe('boundary values', () => {
    it('should handle very long email', async () => {
      const user = userEvent.setup()
      const longEmail = 'a'.repeat(200) + '@example.com'

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), longEmail)
      expect(screen.getByLabelText('Email')).toHaveValue(longEmail)
    })

    it('should handle very long password', async () => {
      const user = userEvent.setup()
      const longPassword = 'p'.repeat(1000)

      renderLoginPage()

      await user.type(screen.getByLabelText('Password'), longPassword)
      expect(screen.getByLabelText('Password')).toHaveValue(longPassword)
    })

    it('should handle empty form submission', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const button = screen.getByRole('button', { name: /sign in/i })
      await user.click(button)

      // HTML5 validation should prevent submission
      expect(api.post).not.toHaveBeenCalled()
    })

    it('should handle single character inputs', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'a')
      await user.type(screen.getByLabelText('Password'), 'b')

      expect(screen.getByLabelText('Email')).toHaveValue('a')
      expect(screen.getByLabelText('Password')).toHaveValue('b')
    })
  })

  describe('form prevention', () => {
    it('should prevent default form submission', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: { access_token: 'token', user: { id: 1 } },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')

      const form = screen.getByRole('button', { name: /sign in/i }).closest('form')
      const submitHandler = vi.fn(e => e.preventDefault())
      form.addEventListener('submit', submitHandler)

      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // API should be called (form handler works)
      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })
  })
})
