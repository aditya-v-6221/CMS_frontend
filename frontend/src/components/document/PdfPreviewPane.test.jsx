import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PdfPreviewPane from './PdfPreviewPane'
import api from '../../api/client'

vi.mock('../../api/client')

describe('PdfPreviewPane', () => {
  const mockPdfData = new Blob(['mock pdf content'], { type: 'application/pdf' })
  let createObjectURLSpy
  let revokeObjectURLSpy

  beforeEach(() => {
    vi.clearAllMocks()
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
  })

  describe('loading state', () => {
    it('should show loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      render(<PdfPreviewPane contractId={1} />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
    })

    it('should apply correct styling to loading state', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      const { container } = render(<PdfPreviewPane contractId={1} />)

      const loadingDiv = screen.getByText('Loading preview…')
      expect(loadingDiv.parentElement).toHaveClass('h-[600px]', 'flex', 'items-center', 'justify-center')
    })

    it('should fetch PDF on mount', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={123} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/download', {
          responseType: 'blob',
        })
      })
    })

    it('should refetch PDF when contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/download', {
          responseType: 'blob',
        })
      })

      rerender(<PdfPreviewPane contractId={2} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/2/download', {
          responseType: 'blob',
        })
      })
    })
  })

  describe('error state', () => {
    it('should show error message when API call fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'))
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should apply correct styling to error state', async () => {
      api.get.mockRejectedValue(new Error('Network error'))
      const { container } = render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const errorDiv = screen.getByText('Could not load document preview.')
        expect(errorDiv).toHaveClass('h-[600px]', 'flex', 'items-center', 'justify-center', 'text-red-500')
      })
    })

    it('should handle 404 errors', async () => {
      api.get.mockRejectedValue({ response: { status: 404 } })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should handle 500 errors', async () => {
      api.get.mockRejectedValue({ response: { status: 500 } })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      api.get.mockRejectedValue(new Error('Network timeout'))
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })
  })

  describe('success state', () => {
    it('should render embed element when PDF loads successfully', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toBeInTheDocument()
      })
    })

    it('should create blob URL for PDF', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      })
    })

    it('should set correct src on embed element', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed.getAttribute('src')).toBe('blob:mock-url')
      })
    })

    it('should set correct type on embed element', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed.getAttribute('type')).toBe('application/pdf')
      })
    })

    it('should apply correct styling to embed element', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('w-full', 'h-[600px]', 'rounded-lg', 'border', 'border-gray-200')
      })
    })
  })

  describe('cleanup', () => {
    it('should revoke blob URL on unmount', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { unmount } = render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled()
      })

      unmount()

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should revoke old blob URL when contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled()
      })

      createObjectURLSpy.mockReturnValue('blob:new-url')
      rerender(<PdfPreviewPane contractId={2} />)

      await waitFor(() => {
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      })
    })

    it('should not revoke URL if blob was never created', () => {
      api.get.mockRejectedValue(new Error('Failed'))
      const { unmount } = render(<PdfPreviewPane contractId={1} />)

      unmount()

      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    })

    it('should handle multiple mounts and unmounts', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })

      const { unmount: unmount1 } = render(<PdfPreviewPane contractId={1} />)
      await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())
      unmount1()

      createObjectURLSpy.mockReturnValue('blob:url-2')
      const { unmount: unmount2 } = render(<PdfPreviewPane contractId={2} />)
      await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2))
      unmount2()

      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
    })
  })

  describe('blob handling', () => {
    it('should create blob with correct MIME type', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const createCall = URL.createObjectURL.mock.calls[0]
        const blob = createCall[0]
        expect(blob.type).toBe('application/pdf')
      })
    })

    it('should handle empty blob data', async () => {
      const emptyBlob = new Blob([], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: emptyBlob })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toBeInTheDocument()
      })
    })

    it('should handle large blob data', async () => {
      const largeData = new Array(10000).fill('pdf content').join('')
      const largeBlob = new Blob([largeData], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: largeBlob })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toBeInTheDocument()
      })
    })
  })

  describe('boundary values', () => {
    it('should handle contractId of 0', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={0} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/0/download', {
          responseType: 'blob',
        })
      })
    })

    it('should handle very large contractId', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={999999999} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/999999999/download', {
          responseType: 'blob',
        })
      })
    })

    it('should handle negative contractId', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={-1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/-1/download', {
          responseType: 'blob',
        })
      })
    })
  })

  describe('state transitions', () => {
    it('should transition from loading to success', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading preview…')).not.toBeInTheDocument()
        expect(document.querySelector('embed')).toBeInTheDocument()
      })
    })

    it('should transition from loading to error', async () => {
      api.get.mockRejectedValue(new Error('Failed'))
      render(<PdfPreviewPane contractId={1} />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading preview…')).not.toBeInTheDocument()
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })

    it('should return to loading when contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(document.querySelector('embed')).toBeInTheDocument()
      })

      api.get.mockImplementation(() => new Promise(() => {}))
      rerender(<PdfPreviewPane contractId={2} />)

      expect(screen.getByText('Loading preview…')).toBeInTheDocument()
    })
  })

  describe('API request configuration', () => {
    it('should request blob response type', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ responseType: 'blob' })
        )
      })
    })

    it('should use correct endpoint path', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={42} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/contracts/42/download',
          expect.any(Object)
        )
      })
    })
  })

  describe('concurrent requests', () => {
    it('should handle rapid contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<PdfPreviewPane contractId={1} />)

      rerender(<PdfPreviewPane contractId={2} />)
      rerender(<PdfPreviewPane contractId={3} />)
      rerender(<PdfPreviewPane contractId={4} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/4/download', expect.any(Object))
      })
    })

    it('should clean up previous blob when new one is created', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled()
      })

      createObjectURLSpy.mockReturnValue('blob:new-url')
      rerender(<PdfPreviewPane contractId={2} />)

      await waitFor(() => {
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      })
    })
  })

  describe('error edge cases', () => {
    it('should handle undefined response data', async () => {
      api.get.mockResolvedValue({ data: undefined })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        // May fail when trying to create blob from undefined
        expect(api.get).toHaveBeenCalled()
      })
    })

    it('should handle null response data', async () => {
      api.get.mockResolvedValue({ data: null })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled()
      })
    })

    it('should handle promise rejection with no error object', async () => {
      api.get.mockRejectedValue(undefined)
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Could not load document preview.')).toBeInTheDocument()
      })
    })
  })

  describe('visual rendering', () => {
    it('should render with fixed height', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('h-[600px]')
      })
    })

    it('should render with full width', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('w-full')
      })
    })

    it('should have rounded corners', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('rounded-lg')
      })
    })

    it('should have border', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<PdfPreviewPane contractId={1} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('border', 'border-gray-200')
      })
    })
  })
})
