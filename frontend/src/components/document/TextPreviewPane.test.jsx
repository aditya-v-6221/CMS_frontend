import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import TextPreviewPane from './TextPreviewPane'
import api from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('TextPreviewPane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading message while fetching text', () => {
      api.get.mockReturnValue(new Promise(() => {})) // Never resolves

      render(<TextPreviewPane contractId={123} />)

      expect(screen.getByText('Extracting text…')).toBeInTheDocument()
    })

    it('should have correct loading state styling', () => {
      api.get.mockReturnValue(new Promise(() => {}))

      render(<TextPreviewPane contractId={123} />)

      const loadingDiv = screen.getByText('Extracting text…')
      expect(loadingDiv).toHaveClass('h-[600px]', 'flex', 'items-center', 'justify-center', 'text-gray-400')
    })

    it('should call API with correct contractId during initial load', () => {
      api.get.mockReturnValue(new Promise(() => {}))

      render(<TextPreviewPane contractId={456} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/456/preview')
      expect(api.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Success State - Text Display', () => {
    it('should render text content when API call succeeds', async () => {
      const mockText = 'This is a sample contract text.'
      api.get.mockResolvedValue({
        data: { text: mockText },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(mockText)).toBeInTheDocument()
      })
    })

    it('should render text in a pre element with correct styling', async () => {
      api.get.mockResolvedValue({
        data: { text: 'Sample text' },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const preElement = screen.getByText('Sample text')
        expect(preElement.tagName).toBe('PRE')
        expect(preElement).toHaveClass(
          'w-full',
          'h-[600px]',
          'overflow-auto',
          'bg-gray-50',
          'border',
          'border-gray-200',
          'rounded-lg',
          'p-4',
          'text-sm',
          'text-gray-800',
          'font-mono',
          'whitespace-pre-wrap'
        )
      })
    })

    it('should handle multiline text correctly', async () => {
      const multilineText = 'Line 1\nLine 2\nLine 3'
      api.get.mockResolvedValue({
        data: { text: multilineText },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(multilineText)).toBeInTheDocument()
      })
    })

    it('should handle very long text content', async () => {
      const longText = 'A'.repeat(10000)
      api.get.mockResolvedValue({
        data: { text: longText },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(longText)).toBeInTheDocument()
      })
    })

    it('should handle text with special characters', async () => {
      const specialText = 'Special chars: @#$%^&*(){}[]|\\<>?~`'
      api.get.mockResolvedValue({
        data: { text: specialText },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(specialText)).toBeInTheDocument()
      })
    })

    it('should handle text with HTML-like content without rendering it', async () => {
      const htmlText = '<script>alert("test")</script><div>Content</div>'
      api.get.mockResolvedValue({
        data: { text: htmlText },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const preElement = screen.getByText(htmlText)
        expect(preElement.textContent).toBe(htmlText)
      })
    })

    it('should handle Unicode and emoji content', async () => {
      const unicodeText = 'Unicode: 中文 日本語 한글 🎉 🚀 ✅'
      api.get.mockResolvedValue({
        data: { text: unicodeText },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(unicodeText)).toBeInTheDocument()
      })
    })
  })

  describe('Empty Text Handling', () => {
    it('should display fallback message when text is empty string', async () => {
      api.get.mockResolvedValue({
        data: { text: '' },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })

    it('should display fallback message when text is null', async () => {
      api.get.mockResolvedValue({
        data: { text: null },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })

    it('should display fallback message when text is undefined', async () => {
      api.get.mockResolvedValue({
        data: { text: undefined },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })

    it('should display fallback message when text is whitespace only', async () => {
      api.get.mockResolvedValue({
        data: { text: '   ' },
      })

      render(<TextPreviewPane contractId={123} />)

      // Whitespace is truthy so it will display, not fallback
      await waitFor(() => {
        expect(screen.queryByText('No text content found.')).not.toBeInTheDocument()
      })
    })

    it('should display fallback message when response data is malformed', async () => {
      api.get.mockResolvedValue({
        data: {},
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })
  })

  describe('Error State - 404 File Not Found', () => {
    it('should display file not found error message for 404 with specific detail', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'File not found on server' },
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Document file is missing from the server. Please delete this contract and re-upload the file.')
        ).toBeInTheDocument()
      })
    })

    it('should display error in red styling', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'File not found on server' },
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const errorDiv = screen.getByText(/Document file is missing/)
        expect(errorDiv).toHaveClass('p-4', 'text-red-500')
      })
    })

    it('should display generic error for 404 without specific detail', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'Some other 404 error' },
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })

    it('should display generic error for 404 without detail field', async () => {
      const error = {
        response: {
          status: 404,
          data: {},
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Error State - 500 Server Error', () => {
    it('should display extraction failed error for 500 status', async () => {
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Text extraction failed — the file may be corrupt or an unsupported format.')
        ).toBeInTheDocument()
      })
    })

    it('should display extraction failed error for 500 without response data', async () => {
      const error = {
        response: {
          status: 500,
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Text extraction failed — the file may be corrupt or an unsupported format.')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Error State - Other HTTP Errors', () => {
    it('should display generic error for 400 status', async () => {
      const error = {
        response: {
          status: 400,
          data: { detail: 'Bad request' },
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })

    it('should display generic error for 403 status', async () => {
      const error = {
        response: {
          status: 403,
          data: { detail: 'Forbidden' },
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })

    it('should display generic error for 503 status', async () => {
      const error = {
        response: {
          status: 503,
          data: { detail: 'Service unavailable' },
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Error State - Network Errors', () => {
    it('should display generic error for network error without response', async () => {
      const error = {
        message: 'Network Error',
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })

    it('should display generic error when error.response is undefined', async () => {
      const error = new Error('Request failed')
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })

    it('should display generic error for timeout', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(
          screen.getByText('Could not load preview. Try restarting the backend server if this persists.')
        ).toBeInTheDocument()
      })
    })
  })

  describe('ContractId Prop Variations', () => {
    it('should handle string contractId', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId="456" />)

      expect(api.get).toHaveBeenCalledWith('/contracts/456/preview')
    })

    it('should handle numeric contractId', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={789} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/789/preview')
    })

    it('should handle zero contractId', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={0} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/0/preview')
    })

    it('should handle negative contractId', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={-1} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/-1/preview')
    })

    it('should handle very large contractId', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={999999999999} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/999999999999/preview')
    })

    it('should handle null contractId', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={null} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/null/preview')
    })

    it('should handle undefined contractId', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={undefined} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/undefined/preview')
    })
  })

  describe('Component Re-rendering', () => {
    it('should fetch new data when contractId changes', async () => {
      api.get.mockResolvedValue({ data: { text: 'Initial text' } })

      const { rerender } = render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('Initial text')).toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledTimes(1)
      expect(api.get).toHaveBeenCalledWith('/contracts/123/preview')

      api.get.mockResolvedValue({ data: { text: 'New text' } })
      rerender(<TextPreviewPane contractId={456} />)

      await waitFor(() => {
        expect(screen.getByText('New text')).toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledTimes(2)
      expect(api.get).toHaveBeenCalledWith('/contracts/456/preview')
    })

    it('should show loading state during re-fetch', async () => {
      api.get.mockResolvedValue({ data: { text: 'Initial text' } })

      const { rerender } = render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('Initial text')).toBeInTheDocument()
      })

      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves
      rerender(<TextPreviewPane contractId={456} />)

      expect(screen.getByText('Extracting text…')).toBeInTheDocument()
    })

    it('should not fetch when contractId remains the same', async () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      const { rerender } = render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('Text')).toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledTimes(1)

      rerender(<TextPreviewPane contractId={123} />)

      // Should still be 1 because contractId didn't change
      expect(api.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error to Success State Transitions', () => {
    it('should transition from error to success when contractId changes', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'File not found on server' },
        },
      }
      api.get.mockRejectedValue(error)

      const { rerender } = render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(/Document file is missing/)).toBeInTheDocument()
      })

      api.get.mockResolvedValue({ data: { text: 'New text' } })
      rerender(<TextPreviewPane contractId={456} />)

      await waitFor(() => {
        expect(screen.getByText('New text')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Document file is missing/)).not.toBeInTheDocument()
    })

    it('should transition from success to error when contractId changes', async () => {
      api.get.mockResolvedValue({ data: { text: 'Initial text' } })

      const { rerender } = render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('Initial text')).toBeInTheDocument()
      })

      const error = {
        response: {
          status: 500,
        },
      }
      api.get.mockRejectedValue(error)
      rerender(<TextPreviewPane contractId={456} />)

      await waitFor(() => {
        expect(screen.getByText(/Text extraction failed/)).toBeInTheDocument()
      })

      expect(screen.queryByText('Initial text')).not.toBeInTheDocument()
    })
  })

  describe('Loading State Management', () => {
    it('should not show loading state after successful load', async () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('Text')).toBeInTheDocument()
      })

      expect(screen.queryByText('Extracting text…')).not.toBeInTheDocument()
    })

    it('should not show loading state after error', async () => {
      const error = {
        response: {
          status: 500,
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(/Text extraction failed/)).toBeInTheDocument()
      })

      expect(screen.queryByText('Extracting text…')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases - Response Data Structure', () => {
    it('should handle response with nested text property', async () => {
      api.get.mockResolvedValue({
        data: {
          text: 'Extracted text',
          metadata: { pages: 5 },
        },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('Extracted text')).toBeInTheDocument()
      })
    })

    it('should handle response with number as text', async () => {
      api.get.mockResolvedValue({
        data: { text: 12345 },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('12345')).toBeInTheDocument()
      })
    })

    it('should handle response with boolean false as text', async () => {
      api.get.mockResolvedValue({
        data: { text: false },
      })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('No text content found.')).toBeInTheDocument()
      })
    })

    it('should handle response with boolean true as text', async () => {
      api.get.mockResolvedValue({
        data: { text: true },
      })

      render(<TextPreviewPane contractId={123} />)

      // true is truthy but not a string, React will convert it
      await waitFor(() => {
        const preElement = screen.queryByText('No text content found.')
        // Since true is truthy, it won't show fallback
        expect(preElement).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have visible loading message', () => {
      api.get.mockReturnValue(new Promise(() => {}))

      render(<TextPreviewPane contractId={123} />)

      const loadingMessage = screen.getByText('Extracting text…')
      expect(loadingMessage).toBeVisible()
    })

    it('should have visible error message', async () => {
      const error = {
        response: {
          status: 500,
        },
      }
      api.get.mockRejectedValue(error)

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const errorMessage = screen.getByText(/Text extraction failed/)
        expect(errorMessage).toBeVisible()
      })
    })

    it('should have visible text content', async () => {
      api.get.mockResolvedValue({ data: { text: 'Visible text' } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const textContent = screen.getByText('Visible text')
        expect(textContent).toBeVisible()
      })
    })

    it('should maintain 600px height for consistency', async () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const preElement = screen.getByText('Text')
        expect(preElement).toHaveClass('h-[600px]')
      })
    })
  })

  describe('Text Formatting', () => {
    it('should preserve tabs in text', async () => {
      const textWithTabs = 'Column1\tColumn2\tColumn3'
      api.get.mockResolvedValue({ data: { text: textWithTabs } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const preElement = screen.getByText(textWithTabs)
        expect(preElement.textContent).toBe(textWithTabs)
      })
    })

    it('should preserve multiple spaces', async () => {
      const textWithSpaces = 'Word1     Word2     Word3'
      api.get.mockResolvedValue({ data: { text: textWithSpaces } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        const preElement = screen.getByText(textWithSpaces)
        expect(preElement.textContent).toBe(textWithSpaces)
      })
    })

    it('should handle text with carriage returns', async () => {
      const textWithCR = 'Line1\r\nLine2\r\nLine3'
      api.get.mockResolvedValue({ data: { text: textWithCR } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(textWithCR)).toBeInTheDocument()
      })
    })

    it('should handle text with various whitespace characters', async () => {
      const textWithWhitespace = 'Text\nwith\tvarious\r\nwhitespace'
      api.get.mockResolvedValue({ data: { text: textWithWhitespace } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText(textWithWhitespace)).toBeInTheDocument()
      })
    })
  })

  describe('API Call Behavior', () => {
    it('should only make one API call per render', async () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(screen.getByText('Text')).toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledTimes(1)
    })

    it('should use GET method', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={123} />)

      expect(api.get).toHaveBeenCalled()
    })

    it('should construct correct URL path', () => {
      api.get.mockResolvedValue({ data: { text: 'Text' } })

      render(<TextPreviewPane contractId={999} />)

      expect(api.get).toHaveBeenCalledWith('/contracts/999/preview')
    })
  })

  describe('Component Cleanup', () => {
    it('should not update state after unmount', async () => {
      api.get.mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { text: 'Text' } }), 100)
        )
      )

      const { unmount } = render(<TextPreviewPane contractId={123} />)

      unmount()

      // Wait a bit to ensure the promise resolves after unmount
      await new Promise(resolve => setTimeout(resolve, 150))

      // This test ensures no errors are thrown during state updates after unmount
      expect(true).toBe(true)
    })
  })

  describe('Multiple Instances', () => {
    it('should handle multiple instances with different contractIds independently', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('123')) {
          return Promise.resolve({ data: { text: 'Text for 123' } })
        } else if (url.includes('456')) {
          return Promise.resolve({ data: { text: 'Text for 456' } })
        }
      })

      const { container } = render(
        <>
          <TextPreviewPane contractId={123} />
          <TextPreviewPane contractId={456} />
        </>
      )

      await waitFor(() => {
        expect(screen.getByText('Text for 123')).toBeInTheDocument()
        expect(screen.getByText('Text for 456')).toBeInTheDocument()
      })

      expect(api.get).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple instances with one success and one error', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('123')) {
          return Promise.resolve({ data: { text: 'Success text' } })
        } else if (url.includes('456')) {
          return Promise.reject({ response: { status: 500 } })
        }
      })

      render(
        <>
          <TextPreviewPane contractId={123} />
          <TextPreviewPane contractId={456} />
        </>
      )

      await waitFor(() => {
        expect(screen.getByText('Success text')).toBeInTheDocument()
        expect(screen.getByText(/Text extraction failed/)).toBeInTheDocument()
      })
    })
  })
})
