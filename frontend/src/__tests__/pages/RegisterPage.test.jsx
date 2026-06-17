import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import RegisterPage from '../../pages/RegisterPage'
import api from '../../api/client'

jest.mock('../../api/client')

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('RegisterPage', () => {
  const renderRegisterPage = () => {
    return render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Rendering', () => {
    it('should render registration form with all elements', () => {
      renderRegisterPage()

      expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
      expect(screen.getByLabelText('Email *')).toBeInTheDocument()
      expect(screen.getByLabelText('Password (min 8 chars) *')).toBeInTheDocument()
      expect(screen.getByLabelText('Full name')).toBeInTheDocument()
      expect(screen.getByLabelText('Department')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    })

    it('should render sign in link', () => {
      renderRegisterPage()

      const signInLink = screen.getByRole('link', { name: 'Sign in' })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/login')
    })

    it('should have required fields marked with asterisk', () => {
      renderRegisterPage()

      expect(screen.getByLabelText('Email *')).toBeInTheDocument()
      expect(screen.getByLabelText('Password (min 8 chars) *')).toBeInTheDocument()
    })

    it('should have email input with correct type', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText('Email *')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('should have password input with correct type', () => {
      renderRegisterPage()

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should have optional full_name field', () => {
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText('Full name')
      expect(fullNameInput).not.toHaveAttribute('required')
    })

    it('should have optional department field', () => {
      renderRegisterPage()

      const departmentInput = screen.getByLabelText('Department')
      expect(departmentInput).not.toHaveAttribute('required')
    })
  })

  describe('Form input handling', () => {
    it('should update email field on user input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, 'newuser@example.com')

      expect(emailInput).toHaveValue('newuser@example.com')
    })

    it('should update password field on user input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should update full_name field on user input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText('Full name')
      await user.type(fullNameInput, 'John Doe')

      expect(fullNameInput).toHaveValue('John Doe')
    })

    it('should update department field on user input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const departmentInput = screen.getByLabelText('Department')
      await user.type(departmentInput, 'Engineering')

      expect(departmentInput).toHaveValue('Engineering')
    })

    it('should handle all fields empty initially', () => {
      renderRegisterPage()

      expect(screen.getByLabelText('Email *')).toHaveValue('')
      expect(screen.getByLabelText('Password (min 8 chars) *')).toHaveValue('')
      expect(screen.getByLabelText('Full name')).toHaveValue('')
      expect(screen.getByLabelText('Department')).toHaveValue('')
    })
  })

  describe('Successful registration', () => {
    it('should call API with all fields on form submit', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.type(screen.getByLabelText('Full name'), 'John Doe')
      await user.type(screen.getByLabelText('Department'), 'Engineering')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          department: 'Engineering',
        })
      })
    })

    it('should call API with only required fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'minimal@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'minpass123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'minimal@example.com',
          password: 'minpass123',
          full_name: '',
          department: '',
        })
      })
    })

    it('should navigate to login page on successful registration', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    it('should show loading state during registration', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
      )

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password')

      const submitButton = screen.getByRole('button', { name: 'Create account' })
      await user.click(submitButton)

      expect(screen.getByRole('button', { name: 'Creating…' })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Failed registration', () => {
    it('should display error message when detail is a string', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Email already exists' } },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'exists@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })
    })

    it('should display error message when detail is an array of validation errors', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: {
          data: {
            detail: [
              { msg: 'Email is invalid' },
              { msg: 'Password too short' },
            ],
          },
        },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'invalid-email')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'short')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Email is invalid, Password too short')).toBeInTheDocument()
      })
    })

    it('should display single validation error from array', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: {
          data: {
            detail: [
              { msg: 'Password must be at least 8 characters' },
            ],
          },
        },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'pass')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })

    it('should display generic error message when no detail is provided', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: {} },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should display generic error when network error occurs', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue(new Error('Network Error'))

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should not navigate on failed registration', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Registration failed' } },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should clear previous error on new submission', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'First error' } },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      api.post.mockResolvedValue({ data: {} })

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('should re-enable button after failed registration', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Failed' } },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password')

      const submitButton = screen.getByRole('button', { name: 'Create account' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument()
      })

      expect(submitButton).not.toBeDisabled()
      expect(submitButton).toHaveTextContent('Create account')
    })
  })

  describe('Form validation', () => {
    it('should not submit form with empty email', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      expect(api.post).not.toHaveBeenCalled()
    })

    it('should not submit form with empty password', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      expect(api.post).not.toHaveBeenCalled()
    })
  })

  describe('Boundary cases', () => {
    it('should handle very long inputs', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const longEmail = 'a'.repeat(100) + '@example.com'
      const longName = 'A'.repeat(200)
      const longDept = 'D'.repeat(150)

      await user.type(screen.getByLabelText('Email *'), longEmail)
      await user.type(screen.getByLabelText('Full name'), longName)
      await user.type(screen.getByLabelText('Department'), longDept)

      expect(screen.getByLabelText('Email *')).toHaveValue(longEmail)
      expect(screen.getByLabelText('Full name')).toHaveValue(longName)
      expect(screen.getByLabelText('Department')).toHaveValue(longDept)
    })

    it('should handle special characters in all fields', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test+tag@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), '!@#$%^&*()')
      await user.type(screen.getByLabelText('Full name'), "O'Brien-Smith")
      await user.type(screen.getByLabelText('Department'), 'R&D / Engineering')

      expect(screen.getByLabelText('Email *')).toHaveValue('test+tag@example.com')
      expect(screen.getByLabelText('Password (min 8 chars) *')).toHaveValue('!@#$%^&*()')
      expect(screen.getByLabelText('Full name')).toHaveValue("O'Brien-Smith")
      expect(screen.getByLabelText('Department')).toHaveValue('R&D / Engineering')
    })
  })
})
