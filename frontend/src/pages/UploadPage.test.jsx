import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import UploadPage from './UploadPage'
import api from '../api/client'

// Mock the api client
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

function renderWithRouter(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('component rendering', () => {
    it('should render upload form with title and description', () => {
      renderWithRouter(<UploadPage />)

      expect(screen.getByText('Upload contract')).toBeTruthy()
      expect(screen.getByText('Accepted formats: PDF, DOCX')).toBeTruthy()
    })

    it('should render file input field', () => {
      renderWithRouter(<UploadPage />)

      const fileInput = screen.getByLabelText(/file \*/i)
      expect(fileInput).toBeTruthy()
      expect(fileInput.type).toBe('file')
      expect(fileInput.accept).toBe('.pdf,.docx')
      expect(fileInput.required).toBe(true)
    })

    it('should render all form fields', () => {
      renderWithRouter(<UploadPage />)

      expect(screen.getByLabelText(/title/i)).toBeTruthy()
      expect(screen.getByLabelText(/contract type/i)).toBeTruthy()
      expect(screen.getByLabelText(/jurisdiction/i)).toBeTruthy()
      expect(screen.getByLabelText(/department/i)).toBeTruthy()
      expect(screen.getByLabelText(/governing law/i)).toBeTruthy()
      expect(screen.getByLabelText(/counterparty name/i)).toBeTruthy()
      expect(screen.getByLabelText(/counterparty email/i)).toBeTruthy()
      expect(screen.getByLabelText(/effective date/i)).toBeTruthy()
      expect(screen.getByLabelText(/expiry date/i)).toBeTruthy()
      expect(screen.getByLabelText(/description/i)).toBeTruthy()
    })

    it('should render contract type dropdown with all options', () => {
      renderWithRouter(<UploadPage />)

      const select = screen.getByLabelText(/contract type/i)
      const options = Array.from(select.options).map(o => o.value)

      expect(options).toContain('')
      expect(options).toContain('NDA')
      expect(options).toContain('MSA')
      expect(options).toContain('SLA')
      expect(options).toContain('SOW')
      expect(options).toContain('Employment')
      expect(options).toContain('Vendor')
      expect(options).toContain('Partnership')
      expect(options).toContain('Other')
    })

    it('should render jurisdiction dropdown with all options', () => {
      renderWithRouter(<UploadPage />)

      const select = screen.getByLabelText(/jurisdiction/i)
      const options = Array.from(select.options).map(o => o.value)

      expect(options).toContain('')
      expect(options).toContain('IN')
      expect(options).toContain('EU')
      expect(options).toContain('US')
      expect(options).toContain('APAC')
      expect(options).toContain('GLOBAL')
    })

    it('should render submit and cancel buttons', () => {
      renderWithRouter(<UploadPage />)

      expect(screen.getByRole('button', { name: /upload/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
    })
  })

  describe('file selection', () => {
    it('should handle file selection', async () => {
      api.post.mockResolvedValue({ data: {} })
      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      expect(fileInput.files[0]).toBe(file)
      expect(fileInput.files).toHaveLength(1)
    })

    it('should call extraction API when file is selected', async () => {
      api.post.mockResolvedValue({ data: {} })
      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })
    })

    it('should not call extraction API when no file is selected', async () => {
      renderWithRouter(<UploadPage />)

      const fileInput = screen.getByLabelText(/file \*/i)
      fireEvent.change(fileInput, { target: { files: [] } })

      expect(api.post).not.toHaveBeenCalled()
    })
  })

  describe('auto-extraction states', () => {
    it('should show extracting message during extraction', async () => {
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      expect(screen.getByText(/analysing document/i)).toBeTruthy()
    })

    it('should show extracted message after successful extraction', async () => {
      api.post.mockResolvedValue({ data: { title: 'Extracted Title' } })
      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/fields auto-filled from document/i)).toBeTruthy()
      })
    })

    it('should not show extracted message on extraction failure', async () => {
      api.post.mockRejectedValue(new Error('Extraction failed'))
      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      expect(screen.queryByText(/fields auto-filled from document/i)).toBeFalsy()
    })

    it('should clear extracted state when selecting new file', async () => {
      api.post.mockResolvedValue({ data: { title: 'First Title' } })
      renderWithRouter(<UploadPage />)

      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file1)

      await waitFor(() => {
        expect(screen.getByText(/fields auto-filled from document/i)).toBeTruthy()
      })

      api.post.mockResolvedValue({ data: { title: 'Second Title' } })
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' })

      await userEvent.upload(fileInput, file2)

      expect(screen.queryByText(/fields auto-filled from document/i)).toBeFalsy()
      expect(screen.getByText(/analysing document/i)).toBeTruthy()
    })
  })

  describe('form field updates from extraction', () => {
    it('should populate form fields with extracted data', async () => {
      const extractedData = {
        title: 'Extracted Title',
        counterparty_name: 'Extracted Party',
        governing_law: 'Extracted Law',
        department: 'Legal',
        effective_date: '2024-01-01',
        expiry_date: '2025-01-01',
      }
      api.post.mockResolvedValue({ data: extractedData })
      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i).value).toBe('Extracted Title')
        expect(screen.getByLabelText(/counterparty name/i).value).toBe('Extracted Party')
        expect(screen.getByLabelText(/governing law/i).value).toBe('Extracted Law')
        expect(screen.getByLabelText(/department/i).value).toBe('Legal')
        expect(screen.getByLabelText(/effective date/i).value).toBe('2024-01-01')
        expect(screen.getByLabelText(/expiry date/i).value).toBe('2025-01-01')
      })
    })

    it('should not overwrite manually entered fields', async () => {
      api.post.mockResolvedValue({ data: { title: 'Extracted Title' } })
      renderWithRouter(<UploadPage />)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Manual Title')

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      expect(titleInput.value).toBe('Manual Title')
    })

    it('should use empty string for missing extracted fields', async () => {
      api.post.mockResolvedValue({ data: { title: 'Only Title' } })
      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)

      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i).value).toBe('Only Title')
        expect(screen.getByLabelText(/counterparty name/i).value).toBe('')
        expect(screen.getByLabelText(/governing law/i).value).toBe('')
      })
    })
  })

  describe('form field manual updates', () => {
    it('should update title field', async () => {
      renderWithRouter(<UploadPage />)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'My Contract')

      expect(titleInput.value).toBe('My Contract')
    })

    it('should update contract type field', async () => {
      renderWithRouter(<UploadPage />)

      const select = screen.getByLabelText(/contract type/i)
      await userEvent.selectOptions(select, 'NDA')

      expect(select.value).toBe('NDA')
    })

    it('should update jurisdiction field', async () => {
      renderWithRouter(<UploadPage />)

      const select = screen.getByLabelText(/jurisdiction/i)
      await userEvent.selectOptions(select, 'US')

      expect(select.value).toBe('US')
    })

    it('should update department field', async () => {
      renderWithRouter(<UploadPage />)

      const input = screen.getByLabelText(/department/i)
      await userEvent.type(input, 'Engineering')

      expect(input.value).toBe('Engineering')
    })

    it('should update counterparty email field', async () => {
      renderWithRouter(<UploadPage />)

      const input = screen.getByLabelText(/counterparty email/i)
      await userEvent.type(input, 'test@example.com')

      expect(input.value).toBe('test@example.com')
    })

    it('should update description field', async () => {
      renderWithRouter(<UploadPage />)

      const textarea = screen.getByLabelText(/description/i)
      await userEvent.type(textarea, 'This is a description')

      expect(textarea.value).toBe('This is a description')
    })

    it('should update effective date field', async () => {
      renderWithRouter(<UploadPage />)

      const input = screen.getByLabelText(/effective date/i)
      await userEvent.type(input, '2024-01-01')

      expect(input.value).toBe('2024-01-01')
    })

    it('should update expiry date field', async () => {
      renderWithRouter(<UploadPage />)

      const input = screen.getByLabelText(/expiry date/i)
      await userEvent.type(input, '2025-12-31')

      expect(input.value).toBe('2025-12-31')
    })
  })

  describe('successful upload', () => {
    it('should submit form with file and navigate on success', async () => {
      api.post.mockResolvedValue({ data: {} })
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 123 } }) // upload

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts', expect.any(FormData))
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/123')
      })
    })

    it('should include all filled form fields in FormData', async () => {
      api.post.mockResolvedValue({ data: {} })
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 456 } }) // upload

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await userEvent.type(screen.getByLabelText(/title/i), 'Test Title')
      await userEvent.selectOptions(screen.getByLabelText(/contract type/i), 'NDA')
      await userEvent.type(screen.getByLabelText(/department/i), 'Legal')

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        const uploadCall = api.post.mock.calls.find(call => call[0] === '/contracts')
        expect(uploadCall).toBeTruthy()

        const formData = uploadCall[1]
        expect(formData).toBeInstanceOf(FormData)
      })
    })

    it('should only include non-empty fields in FormData', async () => {
      api.post.mockResolvedValue({ data: {} })
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 789 } }) // upload

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await userEvent.type(screen.getByLabelText(/title/i), 'Only Title')

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/789')
      })
    })
  })

  describe('upload without file', () => {
    it('should show error when submitting without file', async () => {
      renderWithRouter(<UploadPage />)

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      expect(screen.getByText('Please select a file')).toBeTruthy()
      expect(api.post).not.toHaveBeenCalledWith('/contracts', expect.any(FormData))
    })

    it('should not navigate when submitting without file', async () => {
      renderWithRouter(<UploadPage />)

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should clear error message when file is selected after error', async () => {
      api.post.mockResolvedValue({ data: {} })
      renderWithRouter(<UploadPage />)

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      expect(screen.getByText('Please select a file')).toBeTruthy()

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
      })

      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('Please select a file')).toBeFalsy()
      })
    })
  })

  describe('API error handling', () => {
    it('should display error message when upload fails', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Upload failed due to server error'
          }
        }
      })

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Upload failed due to server error')).toBeTruthy()
      })
    })

    it('should display validation error messages', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              { msg: 'Title is required' },
              { msg: 'Invalid file format' }
            ]
          }
        }
      })

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Title is required, Invalid file format')).toBeTruthy()
      })
    })

    it('should display default error message when detail is not provided', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: {
          data: {}
        }
      })

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeTruthy()
      })
    })

    it('should display default error when response is not available', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce(new Error('Network error'))

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeTruthy()
      })
    })

    it('should not navigate on upload failure', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Upload failed'
          }
        }
      })

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeTruthy()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('cancel button', () => {
    it('should navigate back when cancel is clicked', async () => {
      renderWithRouter(<UploadPage />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    it('should not submit form when cancel is clicked', async () => {
      renderWithRouter(<UploadPage />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(api.post).not.toHaveBeenCalledWith('/contracts', expect.any(FormData))
    })
  })

  describe('loading states', () => {
    it('should disable submit button during upload', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { id: 1 } }), 100)))

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      expect(submitButton.disabled).toBe(true)
    })

    it('should show uploading text during upload', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { id: 1 } }), 100)))

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      expect(screen.getByText('Uploading…')).toBeTruthy()
    })

    it('should re-enable submit button after successful upload', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 1 } }) // upload

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/1')
      })
    })

    it('should re-enable submit button after upload failure', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce(new Error('Upload failed'))

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeTruthy()
      })

      expect(submitButton.disabled).toBe(false)
    })
  })

  describe('FormData construction', () => {
    it('should include file in FormData', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 1 } }) // upload

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        const uploadCall = api.post.mock.calls.find(call => call[0] === '/contracts')
        expect(uploadCall).toBeTruthy()
        expect(uploadCall[1]).toBeInstanceOf(FormData)
      })
    })

    it('should only include fields with values in FormData', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction

      let capturedFormData = null
      api.post.mockImplementationOnce((url, data) => {
        if (url === '/contracts') {
          capturedFormData = data
          return Promise.resolve({ data: { id: 1 } })
        }
        return Promise.resolve({ data: {} })
      })

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await userEvent.type(screen.getByLabelText(/title/i), 'Test')
      await userEvent.type(screen.getByLabelText(/department/i), 'Legal')

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })

      expect(capturedFormData).toBeInstanceOf(FormData)
    })

    it('should not include empty string fields in FormData', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 1 } }) // upload

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/1')
      })
    })
  })

  describe('edge cases', () => {
    it('should handle rapid file selection changes', async () => {
      api.post.mockResolvedValue({ data: {} })
      renderWithRouter(<UploadPage />)

      const fileInput = screen.getByLabelText(/file \*/i)
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' })

      await userEvent.upload(fileInput, file1)
      await userEvent.upload(fileInput, file2)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })
    })

    it('should handle form submission with all fields populated', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockResolvedValueOnce({ data: { id: 999 } }) // upload

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      await userEvent.type(screen.getByLabelText(/title/i), 'Full Contract')
      await userEvent.selectOptions(screen.getByLabelText(/contract type/i), 'MSA')
      await userEvent.selectOptions(screen.getByLabelText(/jurisdiction/i), 'EU')
      await userEvent.type(screen.getByLabelText(/department/i), 'Sales')
      await userEvent.type(screen.getByLabelText(/governing law/i), 'EU Law')
      await userEvent.type(screen.getByLabelText(/counterparty name/i), 'ACME Corp')
      await userEvent.type(screen.getByLabelText(/counterparty email/i), 'contact@acme.com')
      await userEvent.type(screen.getByLabelText(/effective date/i), '2024-01-01')
      await userEvent.type(screen.getByLabelText(/expiry date/i), '2025-12-31')
      await userEvent.type(screen.getByLabelText(/description/i), 'Full description')

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/999')
      })
    })

    it('should clear error message on successful submission', async () => {
      api.post.mockResolvedValueOnce({ data: {} }) // extraction
      api.post.mockRejectedValueOnce(new Error('First attempt failed'))
      api.post.mockResolvedValueOnce({ data: { id: 1 } }) // second upload succeeds

      renderWithRouter(<UploadPage />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/file \*/i)
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1)
      })

      const submitButton = screen.getByRole('button', { name: /upload/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeTruthy()
      })

      api.post.mockResolvedValueOnce({ data: {} }) // extraction for new file
      api.post.mockResolvedValueOnce({ data: { id: 2 } }) // upload succeeds

      const newFile = new File(['new content'], 'test2.pdf', { type: 'application/pdf' })
      await userEvent.upload(fileInput, newFile)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/contracts/extract', expect.any(FormData))
      })

      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/2')
      })
    })
  })
})
