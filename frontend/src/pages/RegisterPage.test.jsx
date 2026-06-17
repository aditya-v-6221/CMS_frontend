import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'
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

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render registration form', () => {
      renderRegisterPage()

      expect(screen.getByText('Create account')).toBeInTheDocument()
      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
    })

    it('should render email input field', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText('Email *')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('should render password input field', () => {
      renderRegisterPage()

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should render full name input field', () => {
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText('Full name')
      expect(fullNameInput).toBeInTheDocument()
      expect(fullNameInput).toHaveAttribute('type', 'text')
      expect(fullNameInput).not.toHaveAttribute('required')
    })

    it('should render department input field', () => {
      renderRegisterPage()

      const departmentInput = screen.getByLabelText('Department')
      expect(departmentInput).toBeInTheDocument()
      expect(departmentInput).toHaveAttribute('type', 'text')
      expect(departmentInput).not.toHaveAttribute('required')
    })

    it('should render submit button', () => {
      renderRegisterPage()

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should render link to login page', () => {
      renderRegisterPage()

      const signInLink = screen.getByText('Sign in')
      expect(signInLink).toBeInTheDocument()
      expect(signInLink.closest('a')).toHaveAttribute('href', '/login')
    })
  })

  describe('form input', () => {
    it('should update email field on input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password field on input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should update full name field on input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText('Full name')
      await user.type(fullNameInput, 'John Doe')

      expect(fullNameInput).toHaveValue('John Doe')
    })

    it('should update department field on input', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const departmentInput = screen.getByLabelText('Department')
      await user.type(departmentInput, 'Engineering')

      expect(departmentInput).toHaveValue('Engineering')
    })

    it('should handle empty input', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText('Email *')
      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      const fullNameInput = screen.getByLabelText('Full name')
      const departmentInput = screen.getByLabelText('Department')

      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
      expect(fullNameInput).toHaveValue('')
      expect(departmentInput).toHaveValue('')
    })

    it('should handle special characters in email', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const emailInput = screen.getByLabelText('Email *')
      await user.type(emailInput, 'test+special@example.com')

      expect(emailInput).toHaveValue('test+special@example.com')
    })

    it('should handle special characters in password', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const passwordInput = screen.getByLabelText('Password (min 8 chars) *')
      await user.type(passwordInput, 'p@ssw0rd!#$%')

      expect(passwordInput).toHaveValue('p@ssw0rd!#$%')
    })

    it('should handle special characters in full name', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText('Full name')
      await user.type(fullNameInput, "O'Brien-Smith")

      expect(fullNameInput).toHaveValue("O'Brien-Smith")
    })
  })

  describe('form submission - success', () => {
    it('should call API with correct data', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.type(screen.getByLabelText('Full name'), 'John Doe')
      await user.type(screen.getByLabelText('Department'), 'Engineering')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          department: 'Engineering',
        })
      })
    })

    it('should navigate to login page on success', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    it('should submit with only required fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: '',
          department: '',
        })
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
      )

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')

      const button = screen.getByRole('button', { name: /create account/i })
      await user.click(button)

      expect(screen.getByText('Creating…')).toBeInTheDocument()
      expect(button).toBeDisabled()
    })

    it('should handle all fields filled', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'full@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'fullpassword')
      await user.type(screen.getByLabelText('Full name'), 'Full Name')
      await user.type(screen.getByLabelText('Department'), 'Full Department')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'full@example.com',
          password: 'fullpassword',
          full_name: 'Full Name',
          department: 'Full Department',
        })
      })
    })
  })

  describe('form submission - error handling', () => {
    it('should display error message on API error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: {
          data: { detail: 'Email already registered' },
        },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'existing@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument()
      })
    })

    it('should handle validation error array', async () => {
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

      await user.type(screen.getByLabelText('Email *'), 'invalid')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), '123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText('Email is invalid, Password too short')).toBeInTheDocument()
      })
    })

    it('should display default error message when detail is missing', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: {} },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should handle network error without response', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue(new Error('Network error'))

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should clear error message on retry', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Email already registered' } },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument()
      })

      api.post.mockResolvedValueOnce({ data: {} })

      await user.clear(screen.getByLabelText('Email *'))
      await user.type(screen.getByLabelText('Email *'), 'new@example.com')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.queryByText('Email already registered')).not.toBeInTheDocument()
      })
    })

    it('should reset loading state after error', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue({
        response: { data: { detail: 'Error' } },
      })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      const button = screen.getByRole('button', { name: /create account/i })
      expect(button).not.toBeDisabled()
    })
  })

  describe('boundary values', () => {
    it('should handle very long email', async () => {
      const user = userEvent.setup()
      const longEmail = 'a'.repeat(200) + '@example.com'

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), longEmail)
      expect(screen.getByLabelText('Email *')).toHaveValue(longEmail)
    })

    it('should handle very long password', async () => {
      const user = userEvent.setup()
      const longPassword = 'p'.repeat(1000)

      renderRegisterPage()

      await user.type(screen.getByLabelText('Password (min 8 chars) *'), longPassword)
      expect(screen.getByLabelText('Password (min 8 chars) *')).toHaveValue(longPassword)
    })

    it('should handle very long full name', async () => {
      const user = userEvent.setup()
      const longName = 'A'.repeat(500)

      renderRegisterPage()

      await user.type(screen.getByLabelText('Full name'), longName)
      expect(screen.getByLabelText('Full name')).toHaveValue(longName)
    })

    it('should handle very long department', async () => {
      const user = userEvent.setup()
      const longDept = 'D'.repeat(500)

      renderRegisterPage()

      await user.type(screen.getByLabelText('Department'), longDept)
      expect(screen.getByLabelText('Department')).toHaveValue(longDept)
    })

    it('should handle empty form submission', async () => {
      const user = userEvent.setup()
      renderRegisterPage()

      const button = screen.getByRole('button', { name: /create account/i })
      await user.click(button)

      // HTML5 validation should prevent submission
      expect(api.post).not.toHaveBeenCalled()
    })

    it('should handle minimum length password (8 chars)', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), '12345678')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })

    it('should handle single character inputs for optional fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'a@b.c')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), '12345678')
      await user.type(screen.getByLabelText('Full name'), 'A')
      await user.type(screen.getByLabelText('Department'), 'D')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'a@b.c',
          password: '12345678',
          full_name: 'A',
          department: 'D',
        })
      })
    })
  })

  describe('equivalence partitioning', () => {
    it('should accept valid email format', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test_123@test-domain.com',
      ]

      for (const email of validEmails) {
        const { unmount } = renderRegisterPage()

        await user.type(screen.getByLabelText('Email *'), email)
        await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')
        await user.click(screen.getByRole('button', { name: /create account/i }))

        await waitFor(() => {
          expect(api.post).toHaveBeenCalled()
        })

        unmount()
        vi.clearAllMocks()
      }
    })

    it('should accept various password formats', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      const validPasswords = [
        '12345678',
        'password',
        'P@ssw0rd!',
        'very-long-password-with-many-characters',
      ]

      for (const password of validPasswords) {
        const { unmount } = renderRegisterPage()

        await user.type(screen.getByLabelText('Email *'), 'test@example.com')
        await user.type(screen.getByLabelText('Password (min 8 chars) *'), password)
        await user.click(screen.getByRole('button', { name: /create account/i }))

        await waitFor(() => {
          expect(api.post).toHaveBeenCalled()
        })

        unmount()
        vi.clearAllMocks()
      }
    })
  })

  describe('form prevention', () => {
    it('should prevent default form submission', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      renderRegisterPage()

      await user.type(screen.getByLabelText('Email *'), 'test@example.com')
      await user.type(screen.getByLabelText('Password (min 8 chars) *'), 'password123')

      const form = screen.getByRole('button', { name: /create account/i }).closest('form')
      const submitHandler = vi.fn(e => e.preventDefault())
      form.addEventListener('submit', submitHandler)

      await user.click(screen.getByRole('button', { name: /create account/i }))

      // API should be called (form handler works)
      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })
  })

  describe('UI structure', () => {
    it('should have correct required field markers', () => {
      renderRegisterPage()

      expect(screen.getByText('Email *')).toBeInTheDocument()
      expect(screen.getByText('Password (min 8 chars) *')).toBeInTheDocument()
      expect(screen.getByLabelText('Full name')).toBeInTheDocument()
      expect(screen.getByLabelText('Department')).toBeInTheDocument()
    })

    it('should have correct form layout', () => {
      const { container } = renderRegisterPage()

      expect(container.querySelector('form')).toBeInTheDocument()
    })
  })
})
