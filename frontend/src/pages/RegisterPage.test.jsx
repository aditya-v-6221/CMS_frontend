import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'
import api from '../api/client'

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn()
  }
}))

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderRegisterPage = () => {
    return render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    )
  }

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      renderRegisterPage()

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
    })

    it('should render the heading and description', () => {
      renderRegisterPage()

      expect(screen.getByText('Create account')).toBeInTheDocument()
      expect(screen.getByText('Contract Management System')).toBeInTheDocument()
    })

    it('should render submit button with correct text', () => {
      renderRegisterPage()

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should render link to login page', () => {
      renderRegisterPage()

      const loginLink = screen.getByRole('link', { name: /sign in/i })
      expect(loginLink).toBeInTheDocument()
      expect(loginLink).toHaveAttribute('href', '/login')
    })

    it('should mark email and password as required fields', () => {
      renderRegisterPage()

      expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password.*\*/i)).toBeInTheDocument()
    })

    it('should have required attribute on email and password inputs', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })

    it('should not mark optional fields as required', () => {
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText(/full name/i)
      const departmentInput = screen.getByLabelText(/department/i)

      expect(fullNameInput).not.toBeRequired()
      expect(departmentInput).not.toBeRequired()
    })

    it('should render email input with email type', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('should render password input with password type', () => {
      renderRegisterPage()

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should not display error message initially', () => {
      renderRegisterPage()

      expect(screen.queryByText(/registration failed/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Input Changes', () => {
    it('should update email field on input change', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password field on input change', () => {
      renderRegisterPage()

      const passwordInput = screen.getByLabelText(/password/i)
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(passwordInput).toHaveValue('password123')
    })

    it('should update full_name field on input change', () => {
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText(/full name/i)
      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } })

      expect(fullNameInput).toHaveValue('John Doe')
    })

    it('should update department field on input change', () => {
      renderRegisterPage()

      const departmentInput = screen.getByLabelText(/department/i)
      fireEvent.change(departmentInput, { target: { value: 'Engineering' } })

      expect(departmentInput).toHaveValue('Engineering')
    })

    it('should handle multiple field changes', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const fullNameInput = screen.getByLabelText(/full name/i)
      const departmentInput = screen.getByLabelText(/department/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } })
      fireEvent.change(departmentInput, { target: { value: 'Engineering' } })

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
      expect(fullNameInput).toHaveValue('John Doe')
      expect(departmentInput).toHaveValue('Engineering')
    })

    it('should handle empty values', () => {
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(emailInput, { target: { value: '' } })

      expect(emailInput).toHaveValue('')
    })

    it('should handle long strings', () => {
      renderRegisterPage()

      const longString = 'a'.repeat(500)
      const fullNameInput = screen.getByLabelText(/full name/i)
      fireEvent.change(fullNameInput, { target: { value: longString } })

      expect(fullNameInput).toHaveValue(longString)
    })

    it('should handle special characters in input', () => {
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText(/full name/i)
      fireEvent.change(fullNameInput, { target: { value: "O'Brien-Smith Jr." } })

      expect(fullNameInput).toHaveValue("O'Brien-Smith Jr.")
    })
  })

  describe('Successful Registration', () => {
    it('should call API with form data on submit', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const fullNameInput = screen.getByLabelText(/full name/i)
      const departmentInput = screen.getByLabelText(/department/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } })
      fireEvent.change(departmentInput, { target: { value: 'Engineering' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          department: 'Engineering'
        })
      })
    })

    it('should navigate to login page on successful registration', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    it('should submit with only required fields filled', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: '',
          department: ''
        })
      })
    })

    it('should clear previous errors on successful submit', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'First error' } }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'short' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Now submit successfully
      api.post.mockResolvedValueOnce({ data: { success: true } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Registration API Errors', () => {
    it('should display error message when API returns string error', async () => {
      const errorMessage = 'Email already exists'
      api.post.mockRejectedValueOnce({
        response: { data: { detail: errorMessage } }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should display error message when API returns array of errors', async () => {
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Password too short' },
              { msg: 'Invalid email format' }
            ]
          }
        }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.change(passwordInput, { target: { value: 'short' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password too short, Invalid email format')).toBeInTheDocument()
      })
    })

    it('should display generic error message when no detail provided', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: {} }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should display generic error message when no response data', async () => {
      api.post.mockRejectedValueOnce({})
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Network Error'))
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument()
      })
    })

    it('should handle array error with single item', async () => {
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [{ msg: 'Single error message' }]
          }
        }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Single error message')).toBeInTheDocument()
      })
    })

    it('should handle empty array error', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { detail: [] } }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading text when form is submitting', async () => {
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Creating…')).toBeInTheDocument()
      })
    })

    it('should disable submit button when loading', async () => {
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should re-enable submit button after successful submission', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })

      // Button should be re-enabled after submission completes
      expect(submitButton).not.toBeDisabled()
    })

    it('should re-enable submit button after failed submission', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      // Button should be re-enabled after error
      expect(submitButton).not.toBeDisabled()
    })

    it('should show original button text after submission completes', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })
  })

  describe('Error Message Display', () => {
    it('should display error message in red text', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Test error' } }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        const errorElement = screen.getByText('Test error')
        expect(errorElement).toHaveClass('text-red-600')
      })
    })

    it('should clear error on new submission attempt', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'First error' } }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Trigger another submission
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Second error' } }
      })

      fireEvent.click(submitButton)

      // First error should be cleared before second error appears
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('Second error')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle form submission with empty optional fields', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.submit(screen.getByRole('button').closest('form'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          full_name: '',
          department: ''
        })
      })
    })

    it('should handle very long email addresses', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com'
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: longEmail } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(emailInput).toHaveValue(longEmail)
    })

    it('should handle very long passwords', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const longPassword = 'a'.repeat(1000)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: longPassword } })

      expect(passwordInput).toHaveValue(longPassword)
    })

    it('should handle whitespace in input fields', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const fullNameInput = screen.getByLabelText(/full name/i)

      fireEvent.change(emailInput, { target: { value: '  test@example.com  ' } })
      fireEvent.change(fullNameInput, { target: { value: '  John Doe  ' } })

      expect(emailInput).toHaveValue('  test@example.com  ')
      expect(fullNameInput).toHaveValue('  John Doe  ')
    })

    it('should handle special characters in all fields', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const fullNameInput = screen.getByLabelText(/full name/i)
      const departmentInput = screen.getByLabelText(/department/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test+tag@example.co.uk' } })
      fireEvent.change(passwordInput, { target: { value: 'p@ssw0rd!#$' } })
      fireEvent.change(fullNameInput, { target: { value: "O'Brien-Smith" } })
      fireEvent.change(departmentInput, { target: { value: 'R&D/Engineering' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test+tag@example.co.uk',
          password: 'p@ssw0rd!#$',
          full_name: "O'Brien-Smith",
          department: 'R&D/Engineering'
        })
      })
    })

    it('should handle rapid form submissions', async () => {
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Click multiple times rapidly
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Should only call API once
      expect(api.post).toHaveBeenCalledTimes(1)
    })

    it('should handle numeric values in text fields', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const fullNameInput = screen.getByLabelText(/full name/i)
      const departmentInput = screen.getByLabelText(/department/i)

      fireEvent.change(fullNameInput, { target: { value: '12345' } })
      fireEvent.change(departmentInput, { target: { value: '999' } })

      expect(fullNameInput).toHaveValue('12345')
      expect(departmentInput).toHaveValue('999')
    })

    it('should preserve form values after failed submission', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } }
      })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const fullNameInput = screen.getByLabelText(/full name/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      // Values should still be in the form
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
      expect(fullNameInput).toHaveValue('John Doe')
    })
  })

  describe('Form Submission', () => {
    it('should prevent default form submission behavior', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const form = screen.getByRole('button').closest('form')

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault')

      fireEvent(form, submitEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should submit form on Enter key in input field', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      renderRegisterPage()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.submit(passwordInput.closest('form'))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })
  })
})
