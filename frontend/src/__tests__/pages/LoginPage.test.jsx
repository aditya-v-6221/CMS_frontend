import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '../../pages/LoginPage'
import { AuthProvider } from '../../context/AuthContext'
import api from '../../api/client'

jest.mock('../../api/client')

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('LoginPage', () => {
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
    localStorage.clear()
    jest.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      renderLoginPage()

      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    })

    it('should render register link', () => {
      renderLoginPage()

      const registerLink = screen.getByRole('link', { name: 'Register' })
      expect(registerLink).toBeInTheDocument()
      expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('should have email input with correct type', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('should have password input with correct type', () => {
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should have autofocus on email input', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toHaveAttribute('autoFocus')
    })
  })

  describe('Form input handling', () => {
    it('should update email field on user input', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password field on user input', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should handle empty input fields', () => {
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
    })
  })

  describe('Successful login', () => {
    it('should call API with correct credentials on form submit', async () => {
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
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/auth/login',
          expect.any(URLSearchParams)
        )
      })

      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.get('username')).toBe('test@example.com')
      expect(callArgs.get('password')).toBe('password123')
    })

    it('should store token and user data in localStorage on success', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'token456',
          user: { id: 2, email: 'admin@example.com', role: 'admin', full_name: 'Admin User' },
        },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'admin@example.com')
      await user.type(screen.getByLabelText('Password'), 'adminpass')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'token456')
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'user',
          JSON.stringify({ id: 2, email: 'admin@example.com', role: 'admin', full_name: 'Admin User' })
        )
      })
    })

    it('should navigate to home page on successful login', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          access_token: 'token789',
          user: { id: 3, email: 'user@example.com', role: 'viewer' },
        },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'user@example.com')
      await user.type(screen.getByLabelText('Password'), 'pass')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should show loading state during login', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { access_token: 'token', user: { id: 1, email: 'test@example.com' } }
        }), 100))
      )

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')

      const submitButton = screen.getByRole('button', { name: 'Sign in' })
      await user.click(submitButton)

      expect(screen.getByRole('button', { name: 'Signing in…' })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Failed login', () => {
    it('should display error message on login failure with detail', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'wrong@example.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpass')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should display generic error message when detail is not provided', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: {} },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should display generic error when network error occurs', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue(new Error('Network Error'))

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should not navigate on failed login', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should clear previous error on new submission', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'First error' } },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      api.post.mockResolvedValue({
        data: {
          access_token: 'token',
          user: { id: 1, email: 'test@example.com', role: 'viewer' },
        },
      })

      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('should re-enable button after failed login', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } },
      })

      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')

      const submitButton = screen.getByRole('button', { name: 'Sign in' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      expect(submitButton).not.toBeDisabled()
      expect(submitButton).toHaveTextContent('Sign in')
    })
  })

  describe('Form validation', () => {
    it('should not submit form with empty email', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      expect(api.post).not.toHaveBeenCalled()
    })

    it('should not submit form with empty password', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      expect(api.post).not.toHaveBeenCalled()
    })
  })

  describe('Boundary cases', () => {
    it('should handle very long email addresses', async () => {
      const user = userEvent.setup()
      const longEmail = 'a'.repeat(100) + '@example.com'
      renderLoginPage()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, longEmail)

      expect(emailInput).toHaveValue(longEmail)
    })

    it('should handle special characters in password', async () => {
      const user = userEvent.setup()
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      renderLoginPage()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, specialPassword)

      expect(passwordInput).toHaveValue(specialPassword)
    })
  })
})
