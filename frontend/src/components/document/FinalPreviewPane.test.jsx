import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FinalPreviewPane from './FinalPreviewPane'
import api from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockObjectURL = 'blob:mock-url-12345'
const originalCreateObjectURL = global.URL.createObjectURL
const originalRevokeObjectURL = global.URL.revokeObjectURL

describe('FinalPreviewPane', () => {
  let createObjectURLMock
  let revokeObjectURLMock

  beforeEach(() => {
    // Mock URL methods
    createObjectURLMock = vi.fn(() => mockObjectURL)
    revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock

    // Reset API mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original URL methods
    global.URL.createObjectURL = originalCreateObjectURL
    global.URL.revokeObjectURL = originalRevokeObjectURL
  })

  describe('Loading State', () => {
    it('should display loading state initially', () => {
      // Create a promise that never resolves to keep loading state
      const neverResolve = new Promise(() => {})
      api.get.mockReturnValue(neverResolve)

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      expect(screen.getByText('Generating final document…')).toBeInTheDocument()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('should display loading spinner with correct CSS classes', () => {
      const neverResolve = new Promise(() => {})
      api.get.mockReturnValue(neverResolve)

      const { container } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('h-6', 'w-6', 'text-indigo-400')
    })
  })

  describe('Successful API Response', () => {
    it('should fetch and display PDF preview when contractId is provided', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Generating final document…')).not.toBeInTheDocument()
      })

      // Verify API was called with correct parameters
      expect(api.get).toHaveBeenCalledWith('/contracts/123/final-preview', {
        responseType: 'blob',
      })

      // Verify blob URL was created
      expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob))

      // Verify embed element is rendered with correct attributes
      const embedElement = screen.getByRole('document', { hidden: true })
      expect(embedElement).toBeInTheDocument()
      expect(embedElement).toHaveAttribute('src', mockObjectURL)
      expect(embedElement).toHaveAttribute('type', 'application/pdf')
    })

    it('should fetch PDF with different contractId', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="456" hasReviewedContent={true} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/456/final-preview', {
          responseType: 'blob',
        })
      })
    })

    it('should display success message when hasReviewedContent is true', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={true} />)

      await waitFor(() => {
        expect(screen.getByText(/Reviewer changes applied/)).toBeInTheDocument()
      })

      expect(
        screen.getByText('Reviewer changes applied — this is the exact document that will be sent for signing.')
      ).toBeInTheDocument()

      // Should not show the "No reviewer edits" message
      expect(screen.queryByText(/No reviewer edits yet/)).not.toBeInTheDocument()
    })

    it('should display info message when hasReviewedContent is false', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText(/No reviewer edits yet/)).toBeInTheDocument()
      })

      expect(
        screen.getByText('No reviewer edits yet — original document will be sent for signing.')
      ).toBeInTheDocument()

      // Should not show the "Reviewer changes applied" message
      expect(screen.queryByText(/Reviewer changes applied/)).not.toBeInTheDocument()
    })

    it('should display checkmark icon when hasReviewedContent is true', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { container } = render(<FinalPreviewPane contractId="123" hasReviewedContent={true} />)

      await waitFor(() => {
        expect(screen.getByText(/Reviewer changes applied/)).toBeInTheDocument()
      })

      // Find the checkmark SVG path
      const checkmarkPath = container.querySelector('path[d="M5 13l4 4L19 7"]')
      expect(checkmarkPath).toBeInTheDocument()
    })

    it('should have correct CSS classes for success message', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { container } = render(<FinalPreviewPane contractId="123" hasReviewedContent={true} />)

      await waitFor(() => {
        expect(screen.getByText(/Reviewer changes applied/)).toBeInTheDocument()
      })

      const successDiv = screen.getByText(/Reviewer changes applied/).closest('div')
      expect(successDiv).toHaveClass('bg-green-50', 'border-green-200', 'text-green-700')
    })

    it('should have correct CSS classes for info message', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { container } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText(/No reviewer edits yet/)).toBeInTheDocument()
      })

      const infoDiv = screen.getByText(/No reviewer edits yet/).closest('div')
      expect(infoDiv).toHaveClass('bg-gray-50', 'border-gray-200', 'text-gray-500')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      // Loading state should be gone
      expect(screen.queryByText('Generating final document…')).not.toBeInTheDocument()

      // Embed should not be rendered
      expect(screen.queryByRole('document', { hidden: true })).not.toBeInTheDocument()
    })

    it('should display error with correct styling', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      const errorDiv = screen.getByText('Could not generate final document preview.').closest('div')
      expect(errorDiv).toHaveClass('text-red-500', 'text-sm')
    })

    it('should not create blob URL when API call fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      expect(createObjectURLMock).not.toHaveBeenCalled()
    })

    it('should handle API rejection without error message', async () => {
      api.get.mockRejectedValue()

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should revoke blob URL on unmount', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { unmount } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled()
      })

      unmount()

      expect(revokeObjectURLMock).toHaveBeenCalledWith(mockObjectURL)
    })

    it('should not revoke blob URL if API call failed', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      const { unmount } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      unmount()

      expect(revokeObjectURLMock).not.toHaveBeenCalled()
    })

    it('should not revoke blob URL if component unmounts before loading completes', () => {
      const neverResolve = new Promise(() => {})
      api.get.mockReturnValue(neverResolve)

      const { unmount } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      unmount()

      expect(revokeObjectURLMock).not.toHaveBeenCalled()
    })
  })

  describe('Effect Dependencies', () => {
    it('should refetch when contractId changes', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { rerender } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/final-preview', {
          responseType: 'blob',
        })
      })

      // Change contractId
      rerender(<FinalPreviewPane contractId="456" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/456/final-preview', {
          responseType: 'blob',
        })
      })

      // Should be called twice (once for each contractId)
      expect(api.get).toHaveBeenCalledTimes(2)
    })

    it('should not refetch when hasReviewedContent changes', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { rerender } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1)
      })

      // Change hasReviewedContent
      rerender(<FinalPreviewPane contractId="123" hasReviewedContent={true} />)

      // Should still only be called once
      expect(api.get).toHaveBeenCalledTimes(1)
    })

    it('should revoke old blob URL when contractId changes', async () => {
      const mockBlob1 = new Blob(['mock pdf data 1'], { type: 'application/pdf' })
      const mockBlob2 = new Blob(['mock pdf data 2'], { type: 'application/pdf' })

      let callCount = 0
      api.get.mockImplementation(() => {
        callCount++
        return Promise.resolve({ data: callCount === 1 ? mockBlob1 : mockBlob2 })
      })

      const { rerender } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalledTimes(1)
      })

      // Change contractId
      rerender(<FinalPreviewPane contractId="456" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalledTimes(2)
      })

      // Old blob URL should have been revoked
      expect(revokeObjectURLMock).toHaveBeenCalledWith(mockObjectURL)
    })
  })

  describe('Edge Cases and Boundary Values', () => {
    it('should handle contractId as string', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="abc-123-def" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/abc-123-def/final-preview', {
          responseType: 'blob',
        })
      })
    })

    it('should handle empty string contractId', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts//final-preview', {
          responseType: 'blob',
        })
      })
    })

    it('should handle numeric contractId', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId={999} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/999/final-preview', {
          responseType: 'blob',
        })
      })
    })

    it('should handle null contractId', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId={null} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/null/final-preview', {
          responseType: 'blob',
        })
      })
    })

    it('should handle undefined contractId', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId={undefined} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/undefined/final-preview', {
          responseType: 'blob',
        })
      })
    })

    it('should handle hasReviewedContent as undefined', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={undefined} />)

      await waitFor(() => {
        expect(screen.getByText(/No reviewer edits yet/)).toBeInTheDocument()
      })

      expect(screen.queryByText(/Reviewer changes applied/)).not.toBeInTheDocument()
    })

    it('should handle hasReviewedContent as null', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={null} />)

      await waitFor(() => {
        expect(screen.getByText(/No reviewer edits yet/)).toBeInTheDocument()
      })

      expect(screen.queryByText(/Reviewer changes applied/)).not.toBeInTheDocument()
    })

    it('should handle empty blob response', async () => {
      const emptyBlob = new Blob([], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: emptyBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled()
      })

      const embedElement = screen.getByRole('document', { hidden: true })
      expect(embedElement).toBeInTheDocument()
    })

    it('should handle very large contractId', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const largeId = '9'.repeat(100)
      render(<FinalPreviewPane contractId={largeId} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/contracts/${largeId}/final-preview`, {
          responseType: 'blob',
        })
      })
    })

    it('should handle special characters in contractId', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const specialId = 'contract-123_abc@test'
      render(<FinalPreviewPane contractId={specialId} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/contracts/${specialId}/final-preview`, {
          responseType: 'blob',
        })
      })
    })
  })

  describe('Blob Creation', () => {
    it('should create blob with correct type', async () => {
      const mockBlobData = 'mock pdf binary data'
      const mockBlob = new Blob([mockBlobData], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled()
      })

      // Verify the blob passed to createObjectURL has the correct type
      const createdBlob = createObjectURLMock.mock.calls[0][0]
      expect(createdBlob).toBeInstanceOf(Blob)
      expect(createdBlob.type).toBe('application/pdf')
    })

    it('should handle blob creation with different data types', async () => {
      const arrayBuffer = new ArrayBuffer(8)
      api.get.mockResolvedValue({ data: arrayBuffer })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled()
      })

      const createdBlob = createObjectURLMock.mock.calls[0][0]
      expect(createdBlob).toBeInstanceOf(Blob)
    })
  })

  describe('Component Structure and Styling', () => {
    it('should render embed with correct CSS classes', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByRole('document', { hidden: true })).toBeInTheDocument()
      })

      const embedElement = screen.getByRole('document', { hidden: true })
      expect(embedElement).toHaveClass('w-full', 'h-[600px]', 'rounded-lg', 'border', 'border-gray-200')
    })

    it('should render loading state with correct height', () => {
      const neverResolve = new Promise(() => {})
      api.get.mockReturnValue(neverResolve)

      const { container } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      const loadingDiv = container.querySelector('.h-\\[600px\\]')
      expect(loadingDiv).toBeInTheDocument()
      expect(loadingDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
    })

    it('should render error state with correct height', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      const { container } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      const errorDiv = container.querySelector('.h-\\[600px\\]')
      expect(errorDiv).toBeInTheDocument()
      expect(errorDiv).toHaveClass('flex', 'items-center', 'justify-center')
    })

    it('should wrap content in flex container with gap', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { container } = render(<FinalPreviewPane contractId="123" hasReviewedContent={true} />)

      await waitFor(() => {
        expect(screen.getByText(/Reviewer changes applied/)).toBeInTheDocument()
      })

      const wrapper = container.querySelector('.flex.flex-col.gap-3')
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe('Multiple Sequential Renders', () => {
    it('should handle rapid contractId changes', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { rerender } = render(<FinalPreviewPane contractId="1" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/final-preview', { responseType: 'blob' })
      })

      rerender(<FinalPreviewPane contractId="2" hasReviewedContent={false} />)
      rerender(<FinalPreviewPane contractId="3" hasReviewedContent={false} />)
      rerender(<FinalPreviewPane contractId="4" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/4/final-preview', { responseType: 'blob' })
      })

      // Should have been called for each contractId
      expect(api.get).toHaveBeenCalledTimes(4)
    })

    it('should handle transition from error to success', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'))
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      const { rerender } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      // Change contractId to trigger new fetch
      rerender(<FinalPreviewPane contractId="456" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByRole('document', { hidden: true })).toBeInTheDocument()
      })

      expect(screen.queryByText('Could not generate final document preview.')).not.toBeInTheDocument()
    })

    it('should handle transition from success to error', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValueOnce({ data: mockBlob })
      api.get.mockRejectedValue(new Error('Network error'))

      const { rerender } = render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByRole('document', { hidden: true })).toBeInTheDocument()
      })

      // Change contractId to trigger new fetch that will fail
      rerender(<FinalPreviewPane contractId="456" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      expect(screen.queryByRole('document', { hidden: true })).not.toBeInTheDocument()
    })
  })

  describe('API Response Edge Cases', () => {
    it('should handle API response with null data', async () => {
      api.get.mockResolvedValue({ data: null })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled()
      })
    })

    it('should handle API response with undefined data', async () => {
      api.get.mockResolvedValue({ data: undefined })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled()
      })
    })

    it('should handle API response without data property', async () => {
      api.get.mockResolvedValue({})

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled()
      })
    })

    it('should handle timeout errors', async () => {
      api.get.mockRejectedValue(new Error('timeout of 30000ms exceeded'))

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })
    })

    it('should handle 404 errors', async () => {
      const error = new Error('Request failed with status code 404')
      error.response = { status: 404 }
      api.get.mockRejectedValue(error)

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })
    })

    it('should handle 500 errors', async () => {
      const error = new Error('Request failed with status code 500')
      error.response = { status: 500 }
      api.get.mockRejectedValue(error)

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should provide visual loading indicator', () => {
      const neverResolve = new Promise(() => {})
      api.get.mockReturnValue(neverResolve)

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      const loadingText = screen.getByText('Generating final document…')
      expect(loadingText).toBeInTheDocument()
      expect(loadingText).toHaveClass('text-sm')
    })

    it('should use semantic color coding for success message', async () => {
      const mockBlob = new Blob(['mock pdf data'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockBlob })

      render(<FinalPreviewPane contractId="123" hasReviewedContent={true} />)

      await waitFor(() => {
        expect(screen.getByText(/Reviewer changes applied/)).toBeInTheDocument()
      })

      const successMessage = screen.getByText(/Reviewer changes applied/)
      expect(successMessage.closest('div')).toHaveClass('text-green-700')
    })

    it('should use semantic color coding for error message', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<FinalPreviewPane contractId="123" hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })

      const errorMessage = screen.getByText('Could not generate final document preview.')
      expect(errorMessage.closest('div')).toHaveClass('text-red-500')
    })
  })
})
