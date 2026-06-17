import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import TextPreviewPane from './TextPreviewPane'
import api from '../../api/client'

vi.mock('../../api/client')

describe('TextPreviewPane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      render(<TextPreviewPane contractId={1} />)

      expect(screen.getByText('Extracting text…')).toBeInTheDocument()
    })

    it('should apply correct styling to loading state', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      const { container } = render(<TextPreviewPane contractId={1} />)

      const loadingDiv = screen.getByText('Extracting text…')
      expect(loadingDiv.parentElement).toHaveClass('h-[600px]')
    })

    it('should fetch text preview on mount', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/preview')
      })
    })

    it('should refetch when contractId changes', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { rerender } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/preview')
      })

      rerender(<TextPreviewPane contractId={2} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/2/preview')
      })
    })
  })

  describe('error state', () => {
    it('should show file not found error with specific message', async () => {
      api.get.mockRejectedValue({
        response: {
          status: 404,
          data: { detail: 'File not found on server' },
        },
      })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Document file is missing from the server/)
        ).toBeInTheDocument()
      })
    })

    it('should show text extraction failure for 500 errors', async () => {
      api.get.mockRejectedValue({
        response: { status: 500 },
      })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Text extraction failed — the file may be corrupt/)
        ).toBeInTheDocument()
      })
    })

    it('should show generic error for other failures', async () => {
      api.get.mockRejectedValue(new Error('Network error'))
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Could not load preview/)
        ).toBeInTheDocument()
      })
    })

    it('should apply error styling', async () => {
      api.get.mockRejectedValue(new Error('Failed'))
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const errorDiv = container.querySelector('.text-red-500')
        expect(errorDiv).toBeInTheDocument()
      })
    })

    it('should handle 404 with different detail message', async () => {
      api.get.mockRejectedValue({
        response: {
          status: 404,
          data: { detail: 'Contract not found' },
        },
      })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Could not load preview/)
        ).toBeInTheDocument()
      })
    })

    it('should handle errors without response object', async () => {
      api.get.mockRejectedValue(new Error('Unknown error'))
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(/Could not load preview/)).toBeInTheDocument()
      })
    })
  })

  describe('success state', () => {
    it('should render text content when loaded successfully', async () => {
      api.get.mockResolvedValue({ data: { text: 'This is the contract text' } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('This is the contract text')).toBeInTheDocument()
      })
    })

    it('should render text in pre element', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toBeInTheDocument()
        expect(pre.textContent).toBe('Sample text')
      })
    })

    it('should apply correct styling to pre element', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toHaveClass('w-full', 'h-[600px]', 'overflow-auto', 'bg-gray-50')
      })
    })

    it('should preserve whitespace in text', async () => {
      const textWithWhitespace = 'Line 1\n\nLine 2\n   Indented line'
      api.get.mockResolvedValue({ data: { text: textWithWhitespace } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toHaveClass('whitespace-pre-wrap')
      })
    })

    it('should use monospace font', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toHaveClass('font-mono')
      })
    })

    it('should show fallback message when text is empty', async () => {
      api.get.mockResolvedValue({ data: { text: '' } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })

    it('should show fallback message when text is null', async () => {
      api.get.mockResolvedValue({ data: { text: null } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })

    it('should show fallback message when text is undefined', async () => {
      api.get.mockResolvedValue({ data: { text: undefined } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })
  })

  describe('text content variations', () => {
    it('should handle multi-line text', async () => {
      const multiLineText = 'Line 1\nLine 2\nLine 3'
      api.get.mockResolvedValue({ data: { text: multiLineText } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(multiLineText)).toBeInTheDocument()
      })
    })

    it('should handle text with special characters', async () => {
      const specialText = 'Text with <>&"\'special chars'
      api.get.mockResolvedValue({ data: { text: specialText } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(specialText)).toBeInTheDocument()
      })
    })

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(100000)
      api.get.mockResolvedValue({ data: { text: longText } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(longText)).toBeInTheDocument()
      })
    })

    it('should handle text with unicode characters', async () => {
      const unicodeText = 'Text with émojis 😀 and spëcial çharacters'
      api.get.mockResolvedValue({ data: { text: unicodeText } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(unicodeText)).toBeInTheDocument()
      })
    })

    it('should handle text with tabs', async () => {
      const tabbedText = 'Column1\tColumn2\tColumn3'
      api.get.mockResolvedValue({ data: { text: tabbedText } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(tabbedText)).toBeInTheDocument()
      })
    })

    it('should handle text with multiple consecutive newlines', async () => {
      const textWithNewlines = 'Paragraph 1\n\n\n\nParagraph 2'
      api.get.mockResolvedValue({ data: { text: textWithNewlines } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(textWithNewlines)).toBeInTheDocument()
      })
    })

    it('should handle text with leading/trailing whitespace', async () => {
      const textWithWhitespace = '   Leading and trailing   '
      api.get.mockResolvedValue({ data: { text: textWithWhitespace } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText(textWithWhitespace)).toBeInTheDocument()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle contractId of 0', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      render(<TextPreviewPane contractId={0} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/0/preview')
      })
    })

    it('should handle very large contractId', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      render(<TextPreviewPane contractId={999999999} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/999999999/preview')
      })
    })

    it('should handle negative contractId', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      render(<TextPreviewPane contractId={-1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/-1/preview')
      })
    })
  })

  describe('state transitions', () => {
    it('should transition from loading to success', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      render(<TextPreviewPane contractId={1} />)

      expect(screen.getByText('Extracting text…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Extracting text…')).not.toBeInTheDocument()
        expect(screen.getByText('Sample text')).toBeInTheDocument()
      })
    })

    it('should transition from loading to error', async () => {
      api.get.mockRejectedValue(new Error('Failed'))
      render(<TextPreviewPane contractId={1} />)

      expect(screen.getByText('Extracting text…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Extracting text…')).not.toBeInTheDocument()
        expect(screen.getByText(/Could not load preview/)).toBeInTheDocument()
      })
    })

    it('should return to loading when contractId changes', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { rerender } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Sample text')).toBeInTheDocument()
      })

      api.get.mockImplementation(() => new Promise(() => {}))
      rerender(<TextPreviewPane contractId={2} />)

      expect(screen.getByText('Extracting text…')).toBeInTheDocument()
    })
  })

  describe('error message specificity', () => {
    it('should show delete and re-upload message for missing files', async () => {
      api.get.mockRejectedValue({
        response: {
          status: 404,
          data: { detail: 'File not found on server' },
        },
      })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Please delete this contract and re-upload the file/)
        ).toBeInTheDocument()
      })
    })

    it('should show corrupt file message for extraction failures', async () => {
      api.get.mockRejectedValue({
        response: { status: 500 },
      })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(
          screen.getByText(/the file may be corrupt or an unsupported format/)
        ).toBeInTheDocument()
      })
    })

    it('should show restart server message for generic errors', async () => {
      api.get.mockRejectedValue({
        response: { status: 400 },
      })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Try restarting the backend server if this persists/)
        ).toBeInTheDocument()
      })
    })
  })

  describe('concurrent requests', () => {
    it('should handle rapid contractId changes', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { rerender } = render(<TextPreviewPane contractId={1} />)

      rerender(<TextPreviewPane contractId={2} />)
      rerender(<TextPreviewPane contractId={3} />)
      rerender(<TextPreviewPane contractId={4} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/4/preview')
      })
    })
  })

  describe('response data structure', () => {
    it('should handle response with only text field', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Sample text')).toBeInTheDocument()
      })
    })

    it('should handle response with extra fields', async () => {
      api.get.mockResolvedValue({
        data: {
          text: 'Sample text',
          metadata: { pages: 5 },
          other_field: 'ignored',
        },
      })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Sample text')).toBeInTheDocument()
      })
    })

    it('should handle empty response data object', async () => {
      api.get.mockResolvedValue({ data: {} })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })

    it('should handle whitespace-only text', async () => {
      api.get.mockResolvedValue({ data: { text: '   \n\n   ' } })
      render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = document.querySelector('pre')
        expect(pre).toBeInTheDocument()
      })
    })
  })

  describe('visual rendering', () => {
    it('should have scrollable container', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toHaveClass('overflow-auto')
      })
    })

    it('should have rounded corners', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toHaveClass('rounded-lg')
      })
    })

    it('should have border', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toHaveClass('border', 'border-gray-200')
      })
    })

    it('should have padding', async () => {
      api.get.mockResolvedValue({ data: { text: 'Sample text' } })
      const { container } = render(<TextPreviewPane contractId={1} />)

      await waitFor(() => {
        const pre = container.querySelector('pre')
        expect(pre).toHaveClass('p-4')
      })
    })
  })
})
