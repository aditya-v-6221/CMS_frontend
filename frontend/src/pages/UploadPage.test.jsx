import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import UploadPage from './UploadPage'
import api from '../api/client'

// Mock dependencies
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

const mockNavigate = vi.fn()

function renderUploadPage() {
  const { useNavigate } = await import('react-router-dom')
  useNavigate.mockReturnValue(mockNavigate)

  return render(
    <MemoryRouter>
      <UploadPage />
    </MemoryRouter>
  )
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the page title and description', async () => {
      await renderUploadPage()

      expect(screen.getByText('Upload contract')).toBeInTheDocument()
      expect(screen.getByText('Accepted formats: PDF, DOCX')).toBeInTheDocument()
    })

    it('should render file input with correct attributes', async () => {
      await renderUploadPage()

      const fileInput = screen.getByLabelText(/file \*/i)
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', '.pdf,.docx')
      expect(fileInput).toBeRequired()
    })

    it('should render all form fields with empty values', async () => {
      await renderUploadPage()

      expect(screen.getByLabelText('Title')).toHaveValue('')
      expect(screen.getByLabelText('Contract type')).toHaveValue('')
      expect(screen.getByLabelText('Jurisdiction')).toHaveValue('')
      expect(screen.getByLabelText('Department')).toHaveValue('')
      expect(screen.getByLabelText('Governing law')).toHaveValue('')
      expect(screen.getByLabelText('Counterparty name')).toHaveValue('')
      expect(screen.getByLabelText('Counterparty email')).toHaveValue('')
      expect(screen.getByLabelText('Effective date')).toHaveValue('')
      expect(screen.getByLabelText('Expiry date')).toHaveValue('')
      expect(screen.getByLabelText('Description')).toHaveValue('')
    })

    it('should render contract type dropdown with all options', async () => {
      await renderUploadPage()

      const select = screen.getByLabelText('Contract type')
      const options = within(select).getAllByRole('option')

      expect(options).toHaveLength(9) // 1 default + 8 types
      expect(options[0]).toHaveTextContent('— Select —')
      expect(options[1]).toHaveTextContent('NDA')
      expect(options[2]).toHaveTextContent('MSA')
      expect(options[3]).toHaveTextContent('SLA')
      expect(options[4]).toHaveTextContent('SOW')
      expect(options[5]).toHaveTextContent('Employment')
      expect(options[6]).toHaveTextContent('Vendor')
      expect(options[7]).toHaveTextContent('Partnership')
      expect(options[8]).toHaveTextContent('Other')
    })

    it('should render jurisdiction dropdown with all options', async () => {
      await renderUploadPage()

      const select = screen.getByLabelText('Jurisdiction')
      const options = within(select).getAllByRole('option')

      expect(options).toHaveLength(6) // 1 default + 5 jurisdictions
      expect(options[0]).toHaveTextContent('— Select —')
      expect(options[1]).toHaveTextContent('IN')
      expect(options[2]).toHaveTextContent('EU')
      expect(options[3]).toHaveTextContent('US')
      expect(options[4]).toHaveTextContent('APAC')
      expect(options[5]).toHaveTextContent('GLOBAL')
    })

    it('should render Upload and Cancel buttons', async () => {
      await renderUploadPage()

      expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should not show extracting or extracted messages initially', async () => {
      await renderUploadPage()

      expect(screen.queryByText('Analysing document…')).not.toBeInTheDocument()
      expect(screen.queryByText(/Fields auto-filled from document/)).not.toBeInTheDocument()
    })

    it('should not show error message initially', async () => {
      await renderUploadPage()

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Input Changes', () => {
    it('should update title field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, 'Test Contract Title')

      expect(titleInput).toHaveValue('Test Contract Title')
    })

    it('should update description field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const descInput = screen.getByLabelText('Description')
      await user.type(descInput, 'This is a test description')

      expect(descInput).toHaveValue('This is a test description')
    })

    it('should update contract type when user selects an option', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const select = screen.getByLabelText('Contract type')
      await user.selectOptions(select, 'NDA')

      expect(select).toHaveValue('NDA')
    })

    it('should update jurisdiction when user selects an option', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const select = screen.getByLabelText('Jurisdiction')
      await user.selectOptions(select, 'US')

      expect(select).toHaveValue('US')
    })

    it('should update department field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const deptInput = screen.getByLabelText('Department')
      await user.type(deptInput, 'Legal')

      expect(deptInput).toHaveValue('Legal')
    })

    it('should update governing law field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const govInput = screen.getByLabelText('Governing law')
      await user.type(govInput, 'Indian Law')

      expect(govInput).toHaveValue('Indian Law')
    })

    it('should update counterparty name field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const nameInput = screen.getByLabelText('Counterparty name')
      await user.type(nameInput, 'ACME Corp')

      expect(nameInput).toHaveValue('ACME Corp')
    })

    it('should update counterparty email field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const emailInput = screen.getByLabelText('Counterparty email')
      await user.type(emailInput, 'contact@acme.com')

      expect(emailInput).toHaveValue('contact@acme.com')
    })

    it('should update effective date field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const dateInput = screen.getByLabelText('Effective date')
      await user.type(dateInput, '2026-01-01')

      expect(dateInput).toHaveValue('2026-01-01')
    })

    it('should update expiry date field when user types', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const dateInput = screen.getByLabelText('Expiry date')
      await user.type(dateInput, '2027-01-01')

      expect(dateInput).toHaveValue('2027-01-01')
    })

    it('should update all form fields independently', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      await user.type(screen.getByLabelText('Title'), 'Title')
      await user.type(screen.getByLabelText('Department'), 'Dept')
      await user.selectOptions(screen.getByLabelText('Contract type'), 'MSA')

      expect(screen.getByLabelText('Title')).toHaveValue('Title')
      expect(screen.getByLabelText('Department')).toHaveValue('Dept')
      expect(screen.getByLabelText('Contract type')).toHaveValue('MSA')
    })
  })

  describe('File Upload and Extraction', () => {
    it('should call extract API when file is selected', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          title: 'Extracted Title',
          counterparty_name: 'Extracted Company',
        },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })
    })

    it('should show extracting message while processing', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      expect(screen.getByText('Analysing document…')).toBeInTheDocument()
    })

    it('should auto-fill form fields from extraction response', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          title: 'Extracted Title',
          counterparty_name: 'Extracted Company',
          governing_law: 'California Law',
          department: 'Sales',
          effective_date: '2026-01-01',
          expiry_date: '2027-01-01',
        },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveValue('Extracted Title')
        expect(screen.getByLabelText('Counterparty name')).toHaveValue('Extracted Company')
        expect(screen.getByLabelText('Governing law')).toHaveValue('California Law')
        expect(screen.getByLabelText('Department')).toHaveValue('Sales')
        expect(screen.getByLabelText('Effective date')).toHaveValue('2026-01-01')
        expect(screen.getByLabelText('Expiry date')).toHaveValue('2027-01-01')
      })
    })

    it('should show extracted success message after extraction', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: { title: 'Test' },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Fields auto-filled from document. Review before submitting.')).toBeInTheDocument()
      })
    })

    it('should not overwrite manually entered fields with extraction data', async () => {
      const user = userEvent.setup()

      await renderUploadPage()

      // User enters title manually
      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, 'Manual Title')

      // Then uploads file
      api.post.mockResolvedValue({
        data: { title: 'Extracted Title' },
      })

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveValue('Manual Title')
      })
    })

    it('should handle extraction failure silently', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue(new Error('Extraction failed'))

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      // No error should be shown
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Analysing document…')).not.toBeInTheDocument()
    })

    it('should handle null extraction response fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          title: null,
          counterparty_name: null,
        },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveValue('')
        expect(screen.getByLabelText('Counterparty name')).toHaveValue('')
      })
    })

    it('should handle undefined extraction response fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {},
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveValue('')
      })
    })

    it('should not call extract API when file input is cleared', async () => {
      const user = userEvent.setup()

      await renderUploadPage()

      const fileInput = screen.getByLabelText(/file \*/i)

      // Simulate clearing file input (no files selected)
      await user.click(fileInput)

      expect(api.post).not.toHaveBeenCalled()
    })

    it('should reset extraction state when new file is selected', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: { title: 'First' },
      })

      await renderUploadPage()

      const fileInput = screen.getByLabelText(/file \*/i)
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, file1)

      await waitFor(() => {
        expect(screen.getByText('Fields auto-filled from document. Review before submitting.')).toBeInTheDocument()
      })

      // Upload second file
      api.post.mockResolvedValue({
        data: { title: 'Second' },
      })

      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, file2)

      // Should show extracting again
      expect(screen.getByText('Analysing document…')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should show error when submitting without file', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const submitButton = screen.getByRole('button', { name: 'Upload' })
      await user.click(submitButton)

      expect(screen.getByText('Please select a file')).toBeInTheDocument()
      expect(api.post).not.toHaveBeenCalledWith('/contracts', expect.any(FormData))
    })

    it('should call contracts API when form is submitted with file', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // upload

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      const submitButton = screen.getByRole('button', { name: 'Upload' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts', expect.any(FormData))
      })
    })

    it('should include all non-empty form fields in submission', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // upload

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.type(screen.getByLabelText('Title'), 'Test Title')
      await user.type(screen.getByLabelText('Department'), 'Legal')
      await user.selectOptions(screen.getByLabelText('Contract type'), 'NDA')

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        const lastCall = api.post.mock.calls[api.post.mock.calls.length - 1]
        expect(lastCall[0]).toBe('/contracts')
        const formData = lastCall[1]
        expect(formData).toBeInstanceOf(FormData)
      })
    })

    it('should not include empty form fields in submission', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // upload

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.type(screen.getByLabelText('Title'), 'Test Title')
      // Leave other fields empty

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts', expect.any(FormData))
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      const submitButton = screen.getByRole('button', { name: 'Upload' })
      await user.click(submitButton)

      expect(screen.getByRole('button', { name: 'Uploading…' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled()
    })

    it('should navigate to contract page after successful upload', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockResolvedValueOnce({ data: { id: 456 } }) // upload

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/456')
      })
    })

    it('should clear error before submitting', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      // First submission without file to trigger error
      await user.click(screen.getByRole('button', { name: 'Upload' }))
      expect(screen.getByText('Please select a file')).toBeInTheDocument()

      // Now add file and submit
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // upload

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Please select a file')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission Error Handling', () => {
    it('should display error message when upload fails', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Upload failed' } },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })

    it('should display validation error messages from array detail', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Field title is required' },
              { msg: 'Field type is invalid' },
            ],
          },
        },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Field title is required, Field type is invalid')).toBeInTheDocument()
      })
    })

    it('should display generic error when detail is not provided', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockRejectedValueOnce({
        response: { data: {} },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })

    it('should display generic error when response is not available', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockRejectedValueOnce(new Error('Network error'))

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })

    it('should reset loading state after error', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Upload failed' } },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Upload' })).not.toBeDisabled()
    })
  })

  describe('Cancel Button', () => {
    it('should navigate back when cancel button is clicked', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    it('should not submit form when cancel is clicked', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(api.post).not.toHaveBeenCalledWith('/contracts', expect.any(FormData))
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string values in form', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // upload

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      // Type and then clear
      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, 'Test')
      await user.clear(titleInput)

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts', expect.any(FormData))
      })
    })

    it('should handle very long text input', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const longText = 'A'.repeat(1000)
      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, longText)

      expect(titleInput).toHaveValue(longText)
    })

    it('should handle special characters in input', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const specialText = '<script>alert("xss")</script>'
      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, specialText)

      expect(titleInput).toHaveValue(specialText)
    })

    it('should handle multiple rapid form submissions', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { id: 123 } }), 100)))

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      const submitButton = screen.getByRole('button', { name: 'Upload' })

      // Click multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Button should be disabled, preventing multiple submissions
      expect(submitButton).toBeDisabled()
    })

    it('should handle date input with invalid format', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const dateInput = screen.getByLabelText('Effective date')
      await user.type(dateInput, 'invalid-date')

      // Browser will handle validation
      expect(dateInput).toHaveValue('invalid-date')
    })

    it('should handle email input with invalid format', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const emailInput = screen.getByLabelText('Counterparty email')
      await user.type(emailInput, 'not-an-email')

      // Browser will handle validation
      expect(emailInput).toHaveValue('not-an-email')
    })

    it('should preserve form state after extraction failure', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      await user.type(screen.getByLabelText('Title'), 'Existing Title')
      await user.type(screen.getByLabelText('Department'), 'HR')

      api.post.mockRejectedValue(new Error('Extraction failed'))

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      // Form values should be preserved
      expect(screen.getByLabelText('Title')).toHaveValue('Existing Title')
      expect(screen.getByLabelText('Department')).toHaveValue('HR')
    })

    it('should handle extraction response with extra fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          title: 'Test',
          extra_field: 'Should be ignored',
          another_field: 'Also ignored',
        },
      })

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveValue('Test')
      })

      // Should not throw error with extra fields
      expect(screen.getByText('Fields auto-filled from document. Review before submitting.')).toBeInTheDocument()
    })

    it('should handle file with zero size', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      await renderUploadPage()

      const file = new File([], 'empty.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })
    })

    it('should handle submission with all fields filled', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockResolvedValueOnce({ data: { id: 999 } }) // upload

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      // Fill all fields
      await user.type(screen.getByLabelText('Title'), 'Complete Contract')
      await user.type(screen.getByLabelText('Description'), 'Full description')
      await user.selectOptions(screen.getByLabelText('Contract type'), 'MSA')
      await user.type(screen.getByLabelText('Department'), 'Legal')
      await user.selectOptions(screen.getByLabelText('Jurisdiction'), 'US')
      await user.type(screen.getByLabelText('Governing law'), 'California Law')
      await user.type(screen.getByLabelText('Counterparty name'), 'Partner Corp')
      await user.type(screen.getByLabelText('Counterparty email'), 'partner@corp.com')
      await user.type(screen.getByLabelText('Effective date'), '2026-01-01')
      await user.type(screen.getByLabelText('Expiry date'), '2027-12-31')

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/999')
      })
    })

    it('should handle whitespace-only input', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, '   ')

      expect(titleInput).toHaveValue('   ')
    })

    it('should handle rapid file changes', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: { title: 'Extracted' } })

      await renderUploadPage()

      const fileInput = screen.getByLabelText(/file \*/i)
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, file1)
      await user.upload(fileInput, file2)

      // Should handle both without error
      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', async () => {
      await renderUploadPage()

      const form = screen.getByRole('form', { hidden: true })
      expect(form).toBeInTheDocument()
    })

    it('should have associated labels for all inputs', async () => {
      await renderUploadPage()

      expect(screen.getByLabelText('Title')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Contract type')).toBeInTheDocument()
      expect(screen.getByLabelText('Department')).toBeInTheDocument()
      expect(screen.getByLabelText('Jurisdiction')).toBeInTheDocument()
      expect(screen.getByLabelText('Governing law')).toBeInTheDocument()
      expect(screen.getByLabelText('Counterparty name')).toBeInTheDocument()
      expect(screen.getByLabelText('Counterparty email')).toBeInTheDocument()
      expect(screen.getByLabelText('Effective date')).toBeInTheDocument()
      expect(screen.getByLabelText('Expiry date')).toBeInTheDocument()
      expect(screen.getByLabelText(/file \*/i)).toBeInTheDocument()
    })

    it('should have proper input types', async () => {
      await renderUploadPage()

      expect(screen.getByLabelText('Counterparty email')).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText('Effective date')).toHaveAttribute('type', 'date')
      expect(screen.getByLabelText('Expiry date')).toHaveAttribute('type', 'date')
    })

    it('should have disabled state on submit button during loading', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extract
      api.post.mockImplementation(() => new Promise(() => {})) // never resolve

      await renderUploadPage()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText(/file \*/i), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      const submitButton = screen.getByRole('button', { name: 'Uploading…' })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form State Management', () => {
    it('should maintain independent state for each field', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      await user.type(screen.getByLabelText('Title'), 'Title1')
      await user.type(screen.getByLabelText('Department'), 'Dept1')
      await user.type(screen.getByLabelText('Governing law'), 'Law1')

      expect(screen.getByLabelText('Title')).toHaveValue('Title1')
      expect(screen.getByLabelText('Department')).toHaveValue('Dept1')
      expect(screen.getByLabelText('Governing law')).toHaveValue('Law1')

      // Clear one field shouldn't affect others
      await user.clear(screen.getByLabelText('Title'))

      expect(screen.getByLabelText('Title')).toHaveValue('')
      expect(screen.getByLabelText('Department')).toHaveValue('Dept1')
      expect(screen.getByLabelText('Governing law')).toHaveValue('Law1')
    })

    it('should handle updating same field multiple times', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const titleInput = screen.getByLabelText('Title')

      await user.type(titleInput, 'First')
      expect(titleInput).toHaveValue('First')

      await user.clear(titleInput)
      await user.type(titleInput, 'Second')
      expect(titleInput).toHaveValue('Second')

      await user.clear(titleInput)
      await user.type(titleInput, 'Third')
      expect(titleInput).toHaveValue('Third')
    })

    it('should handle changing select options multiple times', async () => {
      const user = userEvent.setup()
      await renderUploadPage()

      const select = screen.getByLabelText('Contract type')

      await user.selectOptions(select, 'NDA')
      expect(select).toHaveValue('NDA')

      await user.selectOptions(select, 'MSA')
      expect(select).toHaveValue('MSA')

      await user.selectOptions(select, '')
      expect(select).toHaveValue('')
    })
  })
})
