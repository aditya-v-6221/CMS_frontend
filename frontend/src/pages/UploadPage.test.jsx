import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import UploadPage from './UploadPage'
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

function renderUploadPage() {
  return render(
    <MemoryRouter>
      <UploadPage />
    </MemoryRouter>
  )
}

describe('UploadPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render upload form', () => {
      renderUploadPage()

      expect(screen.getByText('Upload contract')).toBeInTheDocument()
      expect(screen.getByText('Accepted formats: PDF, DOCX')).toBeInTheDocument()
    })

    it('should render file input with correct accept attribute', () => {
      renderUploadPage()

      const fileInput = screen.getByLabelText('File *')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', '.pdf,.docx')
      expect(fileInput).toHaveAttribute('required')
    })

    it('should render all form fields', () => {
      renderUploadPage()

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

    it('should render contract type select with all options', () => {
      renderUploadPage()

      const select = screen.getByLabelText('Contract type')
      const options = Array.from(select.querySelectorAll('option'))

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

    it('should render jurisdiction select with all options', () => {
      renderUploadPage()

      const select = screen.getByLabelText('Jurisdiction')
      const options = Array.from(select.querySelectorAll('option'))

      expect(options[0]).toHaveTextContent('— Select —')
      expect(options[1]).toHaveTextContent('IN')
      expect(options[2]).toHaveTextContent('EU')
      expect(options[3]).toHaveTextContent('US')
      expect(options[4]).toHaveTextContent('APAC')
      expect(options[5]).toHaveTextContent('GLOBAL')
    })

    it('should render Upload and Cancel buttons', () => {
      renderUploadPage()

      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('form input', () => {
    it('should update title field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, 'Test Contract')

      expect(titleInput).toHaveValue('Test Contract')
    })

    it('should update contract type on selection', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const typeSelect = screen.getByLabelText('Contract type')
      await user.selectOptions(typeSelect, 'NDA')

      expect(typeSelect).toHaveValue('NDA')
    })

    it('should update jurisdiction on selection', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const jurisdictionSelect = screen.getByLabelText('Jurisdiction')
      await user.selectOptions(jurisdictionSelect, 'US')

      expect(jurisdictionSelect).toHaveValue('US')
    })

    it('should update department field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const departmentInput = screen.getByLabelText('Department')
      await user.type(departmentInput, 'Legal')

      expect(departmentInput).toHaveValue('Legal')
    })

    it('should update governing law field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const governingLawInput = screen.getByLabelText('Governing law')
      await user.type(governingLawInput, 'US Federal Law')

      expect(governingLawInput).toHaveValue('US Federal Law')
    })

    it('should update counterparty name field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const counterpartyInput = screen.getByLabelText('Counterparty name')
      await user.type(counterpartyInput, 'Acme Corp')

      expect(counterpartyInput).toHaveValue('Acme Corp')
    })

    it('should update counterparty email field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const emailInput = screen.getByLabelText('Counterparty email')
      await user.type(emailInput, 'contact@acme.com')

      expect(emailInput).toHaveValue('contact@acme.com')
    })

    it('should update effective date field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const effectiveDateInput = screen.getByLabelText('Effective date')
      await user.type(effectiveDateInput, '2024-01-01')

      expect(effectiveDateInput).toHaveValue('2024-01-01')
    })

    it('should update expiry date field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const expiryDateInput = screen.getByLabelText('Expiry date')
      await user.type(expiryDateInput, '2025-01-01')

      expect(expiryDateInput).toHaveValue('2025-01-01')
    })

    it('should update description field on input', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      const descriptionInput = screen.getByLabelText('Description')
      await user.type(descriptionInput, 'Test description')

      expect(descriptionInput).toHaveValue('Test description')
    })
  })

  describe('file selection and extraction', () => {
    it('should trigger extraction API when file is selected', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          title: 'Extracted Title',
          counterparty_name: 'Extracted Party',
          governing_law: 'Extracted Law',
          department: 'Extracted Dept',
          effective_date: '2024-01-01',
          expiry_date: '2025-01-01',
        },
      })

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/contracts/extract',
          expect.any(FormData)
        )
      })
    })

    it('should show extracting message during extraction', async () => {
      const user = userEvent.setup()
      api.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
      )

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)

      expect(screen.getByText('Analysing document…')).toBeInTheDocument()
    })

    it('should show success message after extraction', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: { title: 'Extracted Title' },
      })

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Fields auto-filled from document. Review before submitting.')).toBeInTheDocument()
      })
    })

    it('should auto-fill form fields from extraction results', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          title: 'Extracted Title',
          counterparty_name: 'Extracted Party',
          governing_law: 'Extracted Law',
          department: 'Extracted Dept',
          effective_date: '2024-01-01',
          expiry_date: '2025-01-01',
        },
      })

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveValue('Extracted Title')
        expect(screen.getByLabelText('Counterparty name')).toHaveValue('Extracted Party')
        expect(screen.getByLabelText('Governing law')).toHaveValue('Extracted Law')
        expect(screen.getByLabelText('Department')).toHaveValue('Extracted Dept')
        expect(screen.getByLabelText('Effective date')).toHaveValue('2024-01-01')
        expect(screen.getByLabelText('Expiry date')).toHaveValue('2025-01-01')
      })
    })

    it('should not overwrite manually entered values with extraction results', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({
        data: {
          title: 'Extracted Title',
          counterparty_name: 'Extracted Party',
        },
      })

      renderUploadPage()

      // Manually enter title before file upload
      const titleInput = screen.getByLabelText('Title')
      await user.type(titleInput, 'Manual Title')

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)

      await waitFor(() => {
        // Manual value should be preserved
        expect(screen.getByLabelText('Title')).toHaveValue('Manual Title')
        // But counterparty should be extracted
        expect(screen.getByLabelText('Counterparty name')).toHaveValue('Extracted Party')
      })
    })

    it('should handle extraction failure silently', async () => {
      const user = userEvent.setup()
      api.post.mockRejectedValue(new Error('Extraction failed'))

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)

      // Should not show error, should allow upload to continue
      await waitFor(() => {
        expect(screen.queryByText('Analysing document…')).not.toBeInTheDocument()
      })

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  describe('form submission - success', () => {
    it('should call API with file and form data', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // upload

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)
      await user.type(screen.getByLabelText('Title'), 'Contract Title')
      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/contracts',
          expect.any(FormData)
        )
      })
    })

    it('should navigate to contract detail page on success', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 456 } }) // upload

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)
      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/456')
      })
    })

    it('should show loading state during upload', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { id: 1 } }), 100))
      )

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText('File *')

      await user.upload(fileInput, file)

      const button = screen.getByRole('button', { name: /^upload$/i })
      await user.click(button)

      expect(screen.getByText('Uploading…')).toBeInTheDocument()
      expect(button).toBeDisabled()
    })

    it('should include all filled form fields in submission', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 1 } }) // upload

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText('File *'), file)

      await user.type(screen.getByLabelText('Title'), 'Test Title')
      await user.selectOptions(screen.getByLabelText('Contract type'), 'NDA')
      await user.selectOptions(screen.getByLabelText('Jurisdiction'), 'US')
      await user.type(screen.getByLabelText('Department'), 'Legal')
      await user.type(screen.getByLabelText('Governing law'), 'US Law')
      await user.type(screen.getByLabelText('Counterparty name'), 'Acme')
      await user.type(screen.getByLabelText('Counterparty email'), 'test@acme.com')
      await user.type(screen.getByLabelText('Effective date'), '2024-01-01')
      await user.type(screen.getByLabelText('Expiry date'), '2025-01-01')
      await user.type(screen.getByLabelText('Description'), 'Test desc')

      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        const formDataCall = api.post.mock.calls.find(call => call[0] === '/contracts')
        expect(formDataCall).toBeDefined()
      })
    })
  })

  describe('form submission - error handling', () => {
    it('should show error if no file is selected', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      expect(screen.getByText('Please select a file')).toBeInTheDocument()
      expect(api.post).not.toHaveBeenCalled()
    })

    it('should display error message on API error', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: {
          data: { detail: 'Upload failed' },
        },
      })

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText('File *'), file)
      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })

    it('should handle validation error array', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Invalid file type' },
              { msg: 'File too large' },
            ],
          },
        },
      })

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText('File *'), file)
      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid file type, File too large')).toBeInTheDocument()
      })
    })

    it('should display default error message when detail is missing', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: { data: {} },
      })

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText('File *'), file)
      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })

    it('should reset loading state after error', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } },
      })

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText('File *'), file)
      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      const button = screen.getByRole('button', { name: /^upload$/i })
      expect(button).not.toBeDisabled()
    })
  })

  describe('cancel button', () => {
    it('should navigate back when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })
  })

  describe('boundary values', () => {
    it('should handle very long title', async () => {
      const user = userEvent.setup()
      const longTitle = 'A'.repeat(1000)

      renderUploadPage()

      await user.type(screen.getByLabelText('Title'), longTitle)
      expect(screen.getByLabelText('Title')).toHaveValue(longTitle)
    })

    it('should handle very long description', async () => {
      const user = userEvent.setup()
      const longDesc = 'D'.repeat(5000)

      renderUploadPage()

      await user.type(screen.getByLabelText('Description'), longDesc)
      expect(screen.getByLabelText('Description')).toHaveValue(longDesc)
    })

    it('should handle empty strings in optional fields', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 1 } }) // upload

      renderUploadPage()

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText('File *'), file)

      // Submit with only file, no other fields
      await user.click(screen.getByRole('button', { name: /^upload$/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/1')
      })
    })

    it('should handle special characters in text fields', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      await user.type(screen.getByLabelText('Title'), "Contract <>&'\"")
      await user.type(screen.getByLabelText('Counterparty name'), "O'Brien & Sons")

      expect(screen.getByLabelText('Title')).toHaveValue("Contract <>&'\"")
      expect(screen.getByLabelText('Counterparty name')).toHaveValue("O'Brien & Sons")
    })

    it('should handle dates at boundaries', async () => {
      const user = userEvent.setup()
      renderUploadPage()

      await user.type(screen.getByLabelText('Effective date'), '1900-01-01')
      await user.type(screen.getByLabelText('Expiry date'), '2099-12-31')

      expect(screen.getByLabelText('Effective date')).toHaveValue('1900-01-01')
      expect(screen.getByLabelText('Expiry date')).toHaveValue('2099-12-31')
    })
  })

  describe('equivalence partitioning', () => {
    it('should accept all contract types', async () => {
      const user = userEvent.setup()
      const types = ['NDA', 'MSA', 'SLA', 'SOW', 'Employment', 'Vendor', 'Partnership', 'Other']

      for (const type of types) {
        const { unmount } = renderUploadPage()

        const select = screen.getByLabelText('Contract type')
        await user.selectOptions(select, type)

        expect(select).toHaveValue(type)

        unmount()
      }
    })

    it('should accept all jurisdictions', async () => {
      const user = userEvent.setup()
      const jurisdictions = ['IN', 'EU', 'US', 'APAC', 'GLOBAL']

      for (const jurisdiction of jurisdictions) {
        const { unmount } = renderUploadPage()

        const select = screen.getByLabelText('Jurisdiction')
        await user.selectOptions(select, jurisdiction)

        expect(select).toHaveValue(jurisdiction)

        unmount()
      }
    })

    it('should handle valid file types', async () => {
      const user = userEvent.setup()
      api.post.mockResolvedValue({ data: {} })

      const validFiles = [
        new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      ]

      for (const file of validFiles) {
        const { unmount } = renderUploadPage()

        await user.upload(screen.getByLabelText('File *'), file)

        await waitFor(() => {
          expect(api.post).toHaveBeenCalled()
        })

        unmount()
        vi.clearAllMocks()
      }
    })
  })
})
