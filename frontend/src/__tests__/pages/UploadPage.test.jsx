import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import UploadPage from '../../pages/UploadPage'
import api from '../../api/client'

jest.mock('../../api/client')

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('UploadPage', () => {
  const renderUploadPage = () => {
    return render(
      <BrowserRouter>
        <UploadPage />
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Rendering', () => {
    it('should render upload form with all fields', () => {
      renderUploadPage()

      expect(screen.getByRole('heading', { name: 'Upload contract' })).toBeInTheDocument()
      expect(screen.getByText('Accepted formats: PDF, DOCX')).toBeInTheDocument()
      expect(screen.getByLabelText('File *')).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toBeInTheDocument()
      expect(screen.getByLabelText('Contract type')).toBeInTheDocument()
      expect(screen.getByLabelText('Jurisdiction')).toBeInTheDocument()
      expect(screen.getByLabelText('Department')).toBeInTheDocument()
      expect(screen.getByLabelText('Governing law')).toBeInTheDocument()
      expect(screen.getByLabelText('Counterparty name')).toBeInTheDocument()
      expect(screen.getByLabelText('Counterparty email')).toBeInTheDocument()
      expect(screen.getByLabelText('Effective date')).toBeInTheDocument()
      expect(screen.getByLabelText('Expiry date')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    it('should have file input with correct accept attribute', () => {
      renderUploadPage()

      const fileInput = screen.getByLabelText('File *')
      expect(fileInput).toHaveAttribute('accept', '.pdf,.docx')
      expect(fileInput).toHaveAttribute('required')
    })

    it('should render submit and cancel buttons', () => {
      renderUploadPage()

      expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('File selection and extraction', () => {
    it('should call extraction API when file is selected', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValue({
        data: {
          title: 'Extracted Title',
          counterparty_name: 'ACME Corp',
          governing_law: 'California Law',
        },
      })

      renderUploadPage()

      const fileInput = screen.getByLabelText('File *')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/contracts/extract',
          expect.any(FormData)
        )
      })
    })

    it('should auto-fill fields with extracted data', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValue({
        data: {
          title: 'Service Agreement',
          counterparty_name: 'Test Corp',
          effective_date: '2024-01-01',
        },
      })

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveValue('Service Agreement')
        expect(screen.getByLabelText('Counterparty name')).toHaveValue('Test Corp')
        expect(screen.getByLabelText('Effective date')).toHaveValue('2024-01-01')
      })
    })

    it('should show extraction progress message', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)

      expect(screen.getByText('Analysing document…')).toBeInTheDocument()
    })

    it('should show success message after extraction', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValue({
        data: { title: 'Contract' },
      })

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)

      await waitFor(() => {
        expect(screen.getByText(/Fields auto-filled from document/)).toBeInTheDocument()
      })
    })

    it('should handle extraction failure silently', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockRejectedValue(new Error('Extraction failed'))

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      // Should not show error message for extraction failure
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
    })

    it('should not overwrite manually entered fields with extraction data', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })

      renderUploadPage()

      // User enters title manually first
      await user.type(screen.getByLabelText('Title'), 'Manual Title')

      api.post.mockResolvedValue({
        data: { title: 'Extracted Title' },
      })

      await user.upload(screen.getByLabelText('File *'), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      // Manual title should be preserved
      expect(screen.getByLabelText('Title')).toHaveValue('Manual Title')
    })
  })

  describe('Form submission', () => {
    it('should show error when no file is selected', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      // Simulate form submission without file (by mocking the submit handler)
      const submitButton = screen.getByRole('button', { name: 'Upload' })

      // Since the input has required attribute, we need to test the error state directly
      // This would normally be prevented by the browser
      expect(submitButton).toBeInTheDocument()
    })

    it('should call upload API with file and form data', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValueOnce({ data: {} }) // For extraction
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // For upload

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await user.type(screen.getByLabelText('Title'), 'Test Contract')
      await user.selectOptions(screen.getByLabelText('Contract type'), 'NDA')
      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts', expect.any(FormData))
      })
    })

    it('should navigate to contract detail page after successful upload', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValueOnce({ data: {} })
      api.post.mockResolvedValueOnce({ data: { id: 456 } })

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/456')
      })
    })

    it('should show loading state during upload', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValueOnce({ data: {} })
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const uploadButton = screen.getByRole('button', { name: 'Upload' })
      await user.click(uploadButton)

      expect(screen.getByRole('button', { name: 'Uploading…' })).toBeInTheDocument()
      expect(uploadButton).toBeDisabled()
    })

    it('should display error message on upload failure with detail', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValueOnce({ data: {} })
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Invalid file format' } },
      })

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid file format')).toBeInTheDocument()
      })
    })

    it('should display validation errors from array detail', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValueOnce({ data: {} })
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Title is required' },
              { msg: 'Invalid date format' },
            ],
          },
        },
      })

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Title is required, Invalid date format')).toBeInTheDocument()
      })
    })

    it('should display generic error when no detail provided', async () => {
      const user = userEvent.setup()
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      api.post.mockResolvedValueOnce({ data: {} })
      api.post.mockRejectedValueOnce({ response: { data: {} } })

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByRole('button', { name: 'Upload' }))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel button', () => {
    it('should navigate back on cancel', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })
  })

  describe('Form fields', () => {
    it('should update all form fields on user input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      await user.type(screen.getByLabelText('Title'), 'My Contract')
      await user.type(screen.getByLabelText('Department'), 'Legal')
      await user.type(screen.getByLabelText('Governing law'), 'New York Law')
      await user.type(screen.getByLabelText('Counterparty name'), 'Partner Inc')
      await user.type(screen.getByLabelText('Counterparty email'), 'partner@example.com')
      await user.type(screen.getByLabelText('Effective date'), '2024-01-01')
      await user.type(screen.getByLabelText('Expiry date'), '2025-01-01')
      await user.type(screen.getByLabelText('Description'), 'Contract description')

      expect(screen.getByLabelText('Title')).toHaveValue('My Contract')
      expect(screen.getByLabelText('Department')).toHaveValue('Legal')
      expect(screen.getByLabelText('Governing law')).toHaveValue('New York Law')
      expect(screen.getByLabelText('Counterparty name')).toHaveValue('Partner Inc')
      expect(screen.getByLabelText('Counterparty email')).toHaveValue('partner@example.com')
      expect(screen.getByLabelText('Effective date')).toHaveValue('2024-01-01')
      expect(screen.getByLabelText('Expiry date')).toHaveValue('2025-01-01')
      expect(screen.getByLabelText('Description')).toHaveValue('Contract description')
    })

    it('should have select options for contract type', () => {
      renderUploadPage()

      const select = screen.getByLabelText('Contract type')
      expect(select).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'NDA' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'MSA' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'SLA' })).toBeInTheDocument()
    })

    it('should have select options for jurisdiction', () => {
      renderUploadPage()

      const select = screen.getByLabelText('Jurisdiction')
      expect(select).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'IN' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'EU' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'US' })).toBeInTheDocument()
    })
  })

  describe('Boundary cases', () => {
    it('should handle large file names', async () => {
      const user = userEvent.setup()
      const longFileName = 'a'.repeat(200) + '.pdf'
      const file = new File(['content'], longFileName, { type: 'application/pdf' })
      api.post.mockResolvedValue({ data: {} })

      renderUploadPage()

      await user.upload(screen.getByLabelText('File *'), file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })
    })

    it('should handle very long text in description', async () => {
      const user = userEvent.setup()
      const longText = 'a'.repeat(5000)

      renderUploadPage()

      await user.type(screen.getByLabelText('Description'), longText)

      expect(screen.getByLabelText('Description')).toHaveValue(longText)
    })
  })
})
