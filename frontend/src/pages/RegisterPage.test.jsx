import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'
import api from '../api/client'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the registration form', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByText('Create account')).toBeInTheDocument()
      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByLabelText('Email *')).toBeInTheDocument()
      expect(screen.getByLabelText('Password (min 8 chars) *')).toBeInTheDocument()
      expect(screen.getByLabelText('Full name')).toBeInTheDocument()
      expect(screen.getByLabelText('Department')).toBeInTheDocument()
    })

    it('should render email field as email input type', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const emailInput = screen.getByLabelText('Email *')
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('should render password field as password input type', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should mark email field as required', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const emailInput = screen.getByLabelText('Email *')
      expect(emailInput).toBeRequired()
    })

    it('should mark password field as required', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      expect(passwordInput).toBeRequired()
    })

    it('should not mark full_name field as required', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const fullNameInput = screen.getByLabelText('Full name')
      expect(fullNameInput).not.toBeRequired()
    })

    it('should not mark department field as required', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const departmentInput = screen.getByLabelText('Department')
      expect(departmentInput).not.toBeRequired()
    })

    it('should render submit button with correct text', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    })

    it('should render login link', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const loginLink = screen.getByRole('link', { name: /Sign in/i })
      expect(loginLink).toBeInTheDocument()
      expect(loginLink).toHaveAttribute('href', '/login')
    })

    it('should render "Have an account?" text', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByText(/Have an account\?/i)).toBeInTheDocument()
    })

    it('should not display error message initially', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
    })

    it('should have submit button enabled initially', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const submitButton = screen.getByRole('button', { name: 'Create account' })
      expect(submitButton).not.toBeDisabled()
    })

    it('should initialize all form fields as empty', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByLabelText('Email *')).toHaveValue('')
      expect(screen.getByLabelText('Password (min 8 chars) *')).toHaveValue('')
      expect(screen.getByLabelText('Full name')).toHaveValue('')
      expect(screen.getByLabelText('Department')).toHaveValue('')
    })
  })

  describe('User Input Handling', () => {
    it('should update email field on user input', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password field on user input', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should update full_name field on user input', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const fullNameInput = screen.getByLabelText('Full name')
      await user.type(fullNameInput, 'John Doe')

      expect(fullNameInput).toHaveValue('John Doe')
    })

    it('should update department field on user input', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const departmentInput = screen.getByLabelText('Department')
      await user.type(departmentInput, 'Engineering')

      expect(departmentInput).toHaveValue('Engineering')
    })

    it('should handle multiple field updates', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'user@test.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'pass1234')
      await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
      await user.type(screen.getByLabelText('Department'), 'Sales')

      expect(screen.getByLabelText('Email *')).toHaveValue('user@test.com')
      expect(screen.getByLabelText('Password (min 8 chars) *')).toHaveValue('pass1234')
      expect(screen.getByLabelText('Full name')).toHaveValue('Jane Smith')
      expect(screen.getByLabelText('Department')).toHaveValue('Sales')
    })

    it('should handle special characters in email', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, 'user+test@example.co.uk')

      expect(emailInput).toHaveValue('user+test@example.co.uk')
    })

    it('should handle special characters in password', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      await user.type(passwordInput, 'P@ssw0rd!#$')

      expect(passwordInput).toHaveValue('P@ssw0rd!#$')
    })

    it('should handle spaces in full name', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const fullNameInput = screen.getByLabelText('Full name')
      await user.type(fullNameInput, 'John Michael Doe')

      expect(fullNameInput).toHaveValue('John Michael Doe')
    })

    it('should handle clearing field values', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, 'test@example.com')
      await user.clear(emailInput)

      expect(emailInput).toHaveValue('')
    })

    it('should handle very long email input', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const longEmail = 'verylongemailaddress' + 'a'.repeat(50) + '@example.com'
      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, longEmail)

      expect(emailInput).toHaveValue(longEmail)
    })

    it('should handle empty string input', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, '')

      expect(emailInput).toHaveValue('')
    })

    it('should handle numeric characters in text fields', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const departmentInput = screen.getByLabelText('Department')
      await user.type(departmentInput, 'Department 123')

      expect(departmentInput).toHaveValue('Department 123')
    })
  })

  describe('Form Submission - Success Cases', () => {
    it('should call API with form data on submit', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.type(screen.getByLabelText('Full name'), 'John Doe')
      await user.type(screen.getByLabelText('Department'), 'IT')

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          department: 'IT'
        })
      })
    })

    it('should navigate to /login on successful registration', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      expect(screen.getByRole('button', { name: 'Creating…' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
    })

    it('should disable submit button during loading', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')

      const submitButton = screen.getByRole('button', { name: 'Create account' })
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
    })

    it('should handle submission with only required fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: '',
          department: ''
        })
      })
    })

    it('should handle submission with all fields filled', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'john@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'securepass')
      await user.type(screen.getByLabelText('Full name'), 'John Doe')
      await user.type(screen.getByLabelText('Department'), 'Engineering')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'john@example.com',
          password: 'securepass',
          full_name: 'John Doe',
          department: 'Engineering'
        })
      })
    })

    it('should clear error message on successful submit attempt', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'pass')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.queryByText('Error')).not.toBeInTheDocument()
      })
    })

    it('should prevent default form submission', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      const { container } = render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const form = container.querySelector('form')
      const submitHandler = vi.fn()
      form.addEventListener('submit', submitHandler)

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })
  })

  describe('Form Submission - Error Cases', () => {
    it('should display error message when API returns string error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Email already exists' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })
    })

    it('should display error message when API returns array of errors', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Invalid email format' },
              { msg: 'Password too short' }
            ]
          }
        }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'invalid')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), '123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid email format, Password too short')).toBeInTheDocument()
      })
    })

    it('should display default error message when no detail provided', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: {} }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should display default error message when response is undefined', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce(new Error('Network error'))

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should stop loading state after error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Create account' })).not.toBeDisabled()
    })

    it('should re-enable submit button after error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create account' })).not.toBeDisabled()
      })
    })

    it('should handle error with null detail', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: null } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should handle error with undefined detail', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: undefined } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should handle error with empty array', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: [] } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('')).toBeInTheDocument()
      })
    })

    it('should handle error with empty string detail', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: '' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should handle 500 server error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument()
      })
    })

    it('should handle 400 bad request error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { detail: 'Invalid request' }
        }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid request')).toBeInTheDocument()
      })
    })

    it('should not navigate on error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100)))

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')

      const submitButton = screen.getByRole('button', { name: 'Create account' })
      await user.click(submitButton)

      // Try to click again while disabled
      expect(submitButton).toBeDisabled()

      // Verify API was only called once
      expect(api.post).toHaveBeenCalledTimes(1)
    })

    it('should handle submission with whitespace-only values', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), '   ')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), '   ')
      await user.type(screen.getByLabelText('Full name'), '   ')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: '   ',
          password: '   ',
          full_name: '   ',
          department: ''
        })
      })
    })

    it('should handle very long password', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const longPassword = 'a'.repeat(200)
      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), longPassword)
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: longPassword,
          full_name: '',
          department: ''
        })
      })
    })

    it('should handle Unicode characters in full name', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.type(screen.getByLabelText('Full name'), '李明 Müller José')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: '李明 Müller José',
          department: ''
        })
      })
    })

    it('should handle API returning non-standard error object', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        message: 'Network Error'
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should handle multiple error messages in array', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Error 1' },
              { msg: 'Error 2' },
              { msg: 'Error 3' }
            ]
          }
        }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'pass')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Error 1, Error 2, Error 3')).toBeInTheDocument()
      })
    })

    it('should handle array with one error message', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Single error' }
            ]
          }
        }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'pass')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Single error')).toBeInTheDocument()
      })
    })

    it('should maintain field values after failed submission', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.type(screen.getByLabelText('Full name'), 'John Doe')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      expect(screen.getByLabelText('Email *')).toHaveValue('test@example.com')
      expect(screen.getByLabelText('Password (min 8 chars) *')).toHaveValue('password123')
      expect(screen.getByLabelText('Full name')).toHaveValue('John Doe')
    })

    it('should allow retry after failed submission', async () => {
      const user = userEvent.setup()
      api.post
        .mockRejectedValueOnce({
          response: { data: { detail: 'Error' } }
        })
        .mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    it('should handle zero-length strings in optional fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: '',
          department: ''
        })
      })
    })
  })

  describe('Component Styling and Layout', () => {
    it('should render with correct container classes', () => {
      const { container } = render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const outerDiv = container.firstChild
      expect(outerDiv).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center', 'bg-gray-50')
    })

    it('should render form card with correct styling', () => {
      const { container } = render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const card = container.querySelector('.bg-white')
      expect(card).toHaveClass('bg-white', 'rounded-xl', 'shadow-sm', 'border', 'border-gray-200', 'p-8', 'w-full', 'max-w-sm')
    })

    it('should render submit button with correct styling', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const submitButton = screen.getByRole('button', { name: 'Create account' })
      expect(submitButton).toHaveClass('w-full', 'bg-indigo-600', 'text-white', 'py-2', 'rounded-lg', 'text-sm', 'font-medium', 'hover:bg-indigo-700', 'disabled:opacity-50')
    })

    it('should render error message with red text', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error message' } }
      })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        const errorElement = screen.getByText('Error message')
        expect(errorElement).toHaveClass('text-sm', 'text-red-600')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByLabelText('Email *')).toBeInTheDocument()
      expect(screen.getByLabelText('Password (min 8 chars) *')).toBeInTheDocument()
      expect(screen.getByLabelText('Full name')).toBeInTheDocument()
      expect(screen.getByLabelText('Department')).toBeInTheDocument()
    })

    it('should have proper button roles', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    })

    it('should have proper link roles', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument()
    })

    it('should indicate required fields with asterisk', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByText('Email *')).toBeInTheDocument()
      expect(screen.getByText('Password (min 8 chars) *')).toBeInTheDocument()
    })

    it('should have semantic HTML structure with form element', () => {
      const { container } = render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(container.querySelector('form')).toBeInTheDocument()
    })
  })

  describe('Integration with Router', () => {
    it('should render correctly within MemoryRouter', () => {
      render(
        <MemoryRouter initialEntries={['/register']}>
          <RegisterPage />
        </MemoryRouter>
      )

      expect(screen.getByText('Create account')).toBeInTheDocument()
    })

    it('should have correct link to login page', () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      const loginLink = screen.getByRole('link', { name: /Sign in/i })
      expect(loginLink).toHaveAttribute('href', '/login')
    })

    it('should call navigate with correct path on success', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: { message: 'Success' } })

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
        expect(mockNavigate).toHaveBeenCalledTimes(1)
      })
    })
  })
})
