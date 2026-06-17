import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PdfPreviewPane from './PdfPreviewPane'
import api from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('PdfPreviewPane', () => {
  let mockCreateObjectURL
  let mockRevokeObjectURL
  let createdUrls

  beforeEach(() => {
    createdUrls = []

    // Mock URL.createObjectURL
    mockCreateObjectURL = vi.fn((blob) => {
      const url = `blob:http://localhost/mock-${Date.now()}-${Math.random()}`
      createdUrls.push(url)
      return url
    })

    // Mock URL.revokeObjectURL
    mockRevokeObjectURL = vi.fn()

    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    // Reset API mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    createdUrls = []
  })

  describe('Loading State', () => {
    it('should display loading message initially', () => {
      // Mock API call to never resolve
      api.get.mockImplementation(() => new Promise(() => {}))

      render(<PdfPreviewPane contractId="contract-123" />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
    })

    it('should apply correct loading styles', () => {
      api.get.mockImplementation(() => new Promise(() => {}))

      render(<PdfPreviewPane contractId="contract-123" />)

      const loadingDiv = screen.getByText('Loading preview…')
      expect(loadingDiv).toHaveClass('h-[600px]')
      expect(loadingDiv).toHaveClass('flex')
      expect(loadingDiv).toHaveClass('items-center')
      expect(loadingDiv).toHaveClass('justify-center')
      expect(loadingDiv).toHaveClass('text-gray-400')
    })
  })

  describe('Successful PDF Loading', () => {
    it('should fetch PDF and display embed when successful', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-123" />)

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading preview…')).not.toBeInTheDocument()
      })

      // Check that embed element is rendered
      const embedElement = document.querySelector('embed')
      expect(embedElement).toBeInTheDocument()
      expect(embedElement).toHaveAttribute('type', 'application/pdf')
    })

    it('should call API with correct contract ID', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-456" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/contract-456/download', {
          responseType: 'blob'
        })
      })
    })

    it('should create blob URL with correct type', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })

      const blobArg = mockCreateObjectURL.mock.calls[0][0]
      expect(blobArg).toBeInstanceOf(Blob)
      expect(blobArg.type).toBe('application/pdf')
    })

    it('should set blob URL as embed src', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      const mockBlobUrl = 'blob:http://localhost/mock-url'
      api.get.mockResolvedValue({ data: mockPdfData })
      mockCreateObjectURL.mockReturnValue(mockBlobUrl)

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        const embedElement = document.querySelector('embed')
        expect(embedElement).toHaveAttribute('src', mockBlobUrl)
      })
    })

    it('should apply correct styles to embed element', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        const embedElement = document.querySelector('embed')
        expect(embedElement).toHaveClass('w-full')
        expect(embedElement).toHaveClass('h-[600px]')
        expect(embedElement).toHaveClass('rounded-lg')
        expect(embedElement).toHaveClass('border')
        expect(embedElement).toHaveClass('border-gray-200')
      })
    })
  })

  describe('Error State', () => {
    it('should display error message when API call fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should apply correct error styles', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        const errorDiv = screen.getByText('Could not load document preview.')
        expect(errorDiv).toHaveClass('h-[600px]')
        expect(errorDiv).toHaveClass('flex')
        expect(errorDiv).toHaveClass('items-center')
        expect(errorDiv).toHaveClass('justify-center')
        expect(errorDiv).toHaveClass('text-red-500')
      })
    })

    it('should not display embed when error occurs', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })

      expect(document.querySelector('embed')).not.toBeInTheDocument()
    })

    it('should handle API error without error message', async () => {
      api.get.mockRejectedValue({})

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should handle API timeout error', async () => {
      api.get.mockRejectedValue(new Error('timeout'))

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should handle 404 error', async () => {
      api.get.mockRejectedValue({ response: { status: 404 } })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should handle 500 error', async () => {
      api.get.mockRejectedValue({ response: { status: 500 } })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should revoke object URL on unmount', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      const mockBlobUrl = 'blob:http://localhost/mock-url'
      api.get.mockResolvedValue({ data: mockPdfData })
      mockCreateObjectURL.mockReturnValue(mockBlobUrl)

      const { unmount } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })

      unmount()

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockBlobUrl)
    })

    it('should not revoke URL if component unmounts before API completes', () => {
      api.get.mockImplementation(() => new Promise(() => {}))

      const { unmount } = render(<PdfPreviewPane contractId="contract-123" />)

      unmount()

      expect(mockRevokeObjectURL).not.toHaveBeenCalled()
    })

    it('should not revoke URL on error', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      const { unmount } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })

      unmount()

      expect(mockRevokeObjectURL).not.toHaveBeenCalled()
    })

    it('should only revoke URL once even with multiple unmounts', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      const mockBlobUrl = 'blob:http://localhost/mock-url'
      api.get.mockResolvedValue({ data: mockPdfData })
      mockCreateObjectURL.mockReturnValue(mockBlobUrl)

      const { unmount } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })

      unmount()
      unmount() // Should not cause issues

      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
    })
  })

  describe('Contract ID Changes', () => {
    it('should fetch new PDF when contractId changes', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      const { rerender } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/contract-123/download', {
          responseType: 'blob'
        })
      })

      // Change contract ID
      rerender(<PdfPreviewPane contractId="contract-456" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/contract-456/download', {
          responseType: 'blob'
        })
      })

      expect(api.get).toHaveBeenCalledTimes(2)
    })

    it('should show loading state when contractId changes', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      const { rerender } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.queryByText('Loading preview…')).not.toBeInTheDocument()
      })

      // Mock slow API for second call
      api.get.mockImplementation(() => new Promise(() => {}))

      rerender(<PdfPreviewPane contractId="contract-456" />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
    })

    it('should revoke old URL when contractId changes', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      const mockBlobUrl1 = 'blob:http://localhost/mock-url-1'
      const mockBlobUrl2 = 'blob:http://localhost/mock-url-2'

      api.get.mockResolvedValueOnce({ data: mockPdfData })
      mockCreateObjectURL.mockReturnValueOnce(mockBlobUrl1)

      const { rerender } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })

      // Change contract ID
      api.get.mockResolvedValueOnce({ data: mockPdfData })
      mockCreateObjectURL.mockReturnValueOnce(mockBlobUrl2)

      rerender(<PdfPreviewPane contractId="contract-456" />)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(2)
      })

      // Old URL should be revoked
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockBlobUrl1)
    })

    it('should clear error when contractId changes and new fetch succeeds', async () => {
      // First call fails
      api.get.mockRejectedValueOnce(new Error('Network error'))

      const { rerender } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })

      // Second call succeeds
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValueOnce({ data: mockPdfData })

      rerender(<PdfPreviewPane contractId="contract-456" />)

      await waitFor(() => {
        expect(screen.queryByText('Could not load document preview.')).not.toBeInTheDocument()
      })

      expect(document.querySelector('embed')).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Boundary Values', () => {
    it('should handle contractId as empty string', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts//download', {
          responseType: 'blob'
        })
      })
    })

    it('should handle contractId with special characters', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-123/test" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/contract-123/test/download', {
          responseType: 'blob'
        })
      })
    })

    it('should handle contractId with spaces', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract 123" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/contract 123/download', {
          responseType: 'blob'
        })
      })
    })

    it('should handle very long contractId', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })
      const longId = 'a'.repeat(1000)

      render(<PdfPreviewPane contractId={longId} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/contracts/${longId}/download`, {
          responseType: 'blob'
        })
      })
    })

    it('should handle contractId as number', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/download', {
          responseType: 'blob'
        })
      })
    })

    it('should handle contractId as null', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId={null} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/null/download', {
          responseType: 'blob'
        })
      })
    })

    it('should handle contractId as undefined', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId={undefined} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/undefined/download', {
          responseType: 'blob'
        })
      })
    })

    it('should handle empty blob response', async () => {
      const emptyBlob = new Blob([], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: emptyBlob })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        const embedElement = document.querySelector('embed')
        expect(embedElement).toBeInTheDocument()
      })
    })

    it('should handle very large blob response', async () => {
      const largeContent = new Array(1000000).fill('x').join('')
      const largeBlob = new Blob([largeContent], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: largeBlob })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })

      const blobArg = mockCreateObjectURL.mock.calls[0][0]
      expect(blobArg).toBeInstanceOf(Blob)
    })

    it('should handle blob with incorrect mime type from API', async () => {
      const mockData = new Blob(['mock content'], { type: 'text/plain' })
      api.get.mockResolvedValue({ data: mockData })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })

      // Component wraps in new Blob with correct type
      const blobArg = mockCreateObjectURL.mock.calls[0][0]
      expect(blobArg.type).toBe('application/pdf')
    })
  })

  describe('API Response Variations', () => {
    it('should handle response with nested data structure', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(document.querySelector('embed')).toBeInTheDocument()
      })
    })

    it('should handle API response with additional metadata', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({
        data: mockPdfData,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(document.querySelector('embed')).toBeInTheDocument()
      })
    })

    it('should handle slow API response', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })

      api.get.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ data: mockPdfData }), 100)
        )
      )

      render(<PdfPreviewPane contractId="contract-123" />)

      // Initially loading
      expect(screen.getByText('Loading preview…')).toBeInTheDocument()

      // Eventually succeeds
      await waitFor(() => {
        expect(document.querySelector('embed')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Multiple Simultaneous Renders', () => {
    it('should handle multiple instances with different contract IDs', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      const { container: container1 } = render(<PdfPreviewPane contractId="contract-123" />)
      const { container: container2 } = render(<PdfPreviewPane contractId="contract-456" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/contract-123/download', {
          responseType: 'blob'
        })
        expect(api.get).toHaveBeenCalledWith('/contracts/contract-456/download', {
          responseType: 'blob'
        })
      })

      expect(api.get).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('should render embed element accessible to screen readers', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        const embedElement = document.querySelector('embed')
        expect(embedElement).toBeInTheDocument()
        expect(embedElement.getAttribute('type')).toBe('application/pdf')
      })
    })

    it('should have visible loading text', () => {
      api.get.mockImplementation(() => new Promise(() => {}))

      render(<PdfPreviewPane contractId="contract-123" />)

      const loadingText = screen.getByText('Loading preview…')
      expect(loadingText).toBeVisible()
    })

    it('should have visible error text', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        const errorText = screen.getByText('Could not load document preview.')
        expect(errorText).toBeVisible()
      })
    })
  })

  describe('State Transitions', () => {
    it('should transition from loading to success', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      render(<PdfPreviewPane contractId="contract-123" />)

      // Initially loading
      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
      expect(screen.queryByText('Could not load document preview.')).not.toBeInTheDocument()
      expect(document.querySelector('embed')).not.toBeInTheDocument()

      // After success
      await waitFor(() => {
        expect(screen.queryByText('Loading preview…')).not.toBeInTheDocument()
      })

      expect(screen.queryByText('Could not load document preview.')).not.toBeInTheDocument()
      expect(document.querySelector('embed')).toBeInTheDocument()
    })

    it('should transition from loading to error', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      render(<PdfPreviewPane contractId="contract-123" />)

      // Initially loading
      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
      expect(screen.queryByText('Could not load document preview.')).not.toBeInTheDocument()

      // After error
      await waitFor(() => {
        expect(screen.queryByText('Loading preview…')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      expect(document.querySelector('embed')).not.toBeInTheDocument()
    })

    it('should transition from success back to loading on contractId change', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      const { rerender } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(document.querySelector('embed')).toBeInTheDocument()
      })

      // Change contract and mock slow response
      api.get.mockImplementation(() => new Promise(() => {}))
      rerender(<PdfPreviewPane contractId="contract-456" />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
      expect(document.querySelector('embed')).not.toBeInTheDocument()
    })

    it('should transition from error back to loading on contractId change', async () => {
      api.get.mockRejectedValue(new Error('Network error'))

      const { rerender } = render(<PdfPreviewPane contractId="contract-123" />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })

      // Change contract and mock pending response
      api.get.mockImplementation(() => new Promise(() => {}))
      rerender(<PdfPreviewPane contractId="contract-456" />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
      expect(screen.queryByText('Could not load document preview.')).not.toBeInTheDocument()
    })
  })

  describe('Race Conditions', () => {
    it('should handle rapid contractId changes', async () => {
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })

      const { rerender } = render(<PdfPreviewPane contractId="contract-1" />)
      rerender(<PdfPreviewPane contractId="contract-2" />)
      rerender(<PdfPreviewPane contractId="contract-3" />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(3)
      })
    })

    it('should handle unmount during API call', () => {
      api.get.mockImplementation(() => new Promise(() => {}))

      const { unmount } = render(<PdfPreviewPane contractId="contract-123" />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()

      // Should not throw error when unmounting during pending request
      expect(() => unmount()).not.toThrow()
    })

    it('should handle contractId change during API call', async () => {
      let resolveFirst
      const firstPromise = new Promise(resolve => { resolveFirst = resolve })

      api.get.mockImplementationOnce(() => firstPromise)

      const { rerender } = render(<PdfPreviewPane contractId="contract-1" />)

      // Change contract before first request completes
      const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: mockPdfData })
      rerender(<PdfPreviewPane contractId="contract-2" />)

      // Resolve first request after change
      resolveFirst({ data: mockPdfData })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2)
      })
    })
  })
})
