import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FinalPreviewPane from './FinalPreviewPane'
import api from '../../api/client'

vi.mock('../../api/client')

describe('FinalPreviewPane', () => {
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
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      expect(screen.getByText('Generating final document…')).toBeInTheDocument()
    })

    it('should show spinner during loading', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      const { container } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should fetch final preview on mount', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={123} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/123/final-preview', {
          responseType: 'blob',
        })
      })
    })

    it('should refetch when contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/1/final-preview', expect.any(Object))
      })

      rerender(<FinalPreviewPane contractId={2} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/2/final-preview', expect.any(Object))
      })
    })
  })

  describe('error state', () => {
    it('should show error message when API call fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'))
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText('Could not generate final document preview.')).toBeInTheDocument()
      })
    })

    it('should apply error styling', async () => {
      api.get.mockRejectedValue(new Error('Failed'))
      const { container } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const errorDiv = container.querySelector('.text-red-500')
        expect(errorDiv).toBeInTheDocument()
      })
    })
  })

  describe('success state with reviewed content', () => {
    it('should show success banner when hasReviewedContent is true', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Reviewer changes applied — this is the exact document/)
        ).toBeInTheDocument()
      })
    })

    it('should show checkmark icon in success banner', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { container } = render(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      await waitFor(() => {
        const svg = container.querySelector('.text-green-700 svg')
        expect(svg).toBeInTheDocument()
      })
    })

    it('should apply green styling to success banner', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { container } = render(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      await waitFor(() => {
        const banner = container.querySelector('.bg-green-50')
        expect(banner).toBeInTheDocument()
      })
    })

    it('should render embed element', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toBeInTheDocument()
      })
    })

    it('should set correct src on embed element', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed.getAttribute('src')).toBe('blob:mock-url')
      })
    })
  })

  describe('success state without reviewed content', () => {
    it('should show info banner when hasReviewedContent is false', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(
          screen.getByText(/No reviewer edits yet — original document will be sent/)
        ).toBeInTheDocument()
      })
    })

    it('should apply gray styling to info banner', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { container } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const banner = container.querySelector('.bg-gray-50')
        expect(banner).toBeInTheDocument()
      })
    })

    it('should still render embed element', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toBeInTheDocument()
      })
    })
  })

  describe('blob URL management', () => {
    it('should create blob URL for PDF', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      })
    })

    it('should create blob with correct MIME type', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const createCall = URL.createObjectURL.mock.calls[0]
        const blob = createCall[0]
        expect(blob.type).toBe('application/pdf')
      })
    })

    it('should revoke blob URL on unmount', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { unmount } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled()
      })

      unmount()

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should revoke old blob URL when contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled()
      })

      createObjectURLSpy.mockReturnValue('blob:new-url')
      rerender(<FinalPreviewPane contractId={2} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      })
    })

    it('should not revoke URL if blob was never created', () => {
      api.get.mockRejectedValue(new Error('Failed'))
      const { unmount } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      unmount()

      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    })
  })

  describe('hasReviewedContent prop changes', () => {
    it('should update banner when hasReviewedContent changes from false to true', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText(/No reviewer edits yet/)).toBeInTheDocument()
      })

      rerender(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      expect(screen.getByText(/Reviewer changes applied/)).toBeInTheDocument()
    })

    it('should update banner when hasReviewedContent changes from true to false', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      await waitFor(() => {
        expect(screen.getByText(/Reviewer changes applied/)).toBeInTheDocument()
      })

      rerender(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      expect(screen.getByText(/No reviewer edits yet/)).toBeInTheDocument()
    })
  })

  describe('embed element styling', () => {
    it('should have full width', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('w-full')
      })
    })

    it('should have fixed height', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('h-[600px]')
      })
    })

    it('should have rounded corners', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('rounded-lg')
      })
    })

    it('should have border', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toHaveClass('border', 'border-gray-200')
      })
    })

    it('should set PDF type attribute', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed.getAttribute('type')).toBe('application/pdf')
      })
    })
  })

  describe('boundary values', () => {
    it('should handle contractId of 0', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={0} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/0/final-preview', expect.any(Object))
      })
    })

    it('should handle very large contractId', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={999999999} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/999999999/final-preview', expect.any(Object))
      })
    })

    it('should handle negative contractId', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={-1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/-1/final-preview', expect.any(Object))
      })
    })

    it('should handle empty blob data', async () => {
      const emptyBlob = new Blob([], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: emptyBlob })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toBeInTheDocument()
      })
    })

    it('should handle large blob data', async () => {
      const largeData = new Array(10000).fill('pdf content').join('')
      const largeBlob = new Blob([largeData], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: largeBlob })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        const embed = document.querySelector('embed')
        expect(embed).toBeInTheDocument()
      })
    })
  })

  describe('state transitions', () => {
    it('should transition from loading to success', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      expect(screen.getByText('Generating final document…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Generating final document…')).not.toBeInTheDocument()
        expect(document.querySelector('embed')).toBeInTheDocument()
      })
    })

    it('should transition from loading to error', async () => {
      api.get.mockRejectedValue(new Error('Failed'))
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      expect(screen.getByText('Generating final document…')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Generating final document…')).not.toBeInTheDocument()
        expect(screen.getByText(/Could not generate final document preview/)).toBeInTheDocument()
      })
    })

    it('should return to loading when contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(document.querySelector('embed')).toBeInTheDocument()
      })

      api.get.mockImplementation(() => new Promise(() => {}))
      rerender(<FinalPreviewPane contractId={2} hasReviewedContent={false} />)

      expect(screen.getByText('Generating final document…')).toBeInTheDocument()
    })
  })

  describe('banner content', () => {
    it('should mention exact document for signing with reviewed content', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={true} />)

      await waitFor(() => {
        expect(screen.getByText(/exact document that will be sent for signing/)).toBeInTheDocument()
      })
    })

    it('should mention original document without reviewed content', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(screen.getByText(/original document will be sent for signing/)).toBeInTheDocument()
      })
    })
  })

  describe('concurrent requests', () => {
    it('should handle rapid contractId changes', async () => {
      api.get.mockResolvedValue({ data: mockPdfData })
      const { rerender } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      rerender(<FinalPreviewPane contractId={2} hasReviewedContent={false} />)
      rerender(<FinalPreviewPane contractId={3} hasReviewedContent={false} />)
      rerender(<FinalPreviewPane contractId={4} hasReviewedContent={false} />)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/contracts/4/final-preview', expect.any(Object))
      })
    })
  })

  describe('loading spinner', () => {
    it('should show indigo spinner color', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      const { container } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      const spinner = container.querySelector('.text-indigo-400')
      expect(spinner).toBeInTheDocument()
    })

    it('should center loading content', () => {
      api.get.mockImplementation(() => new Promise(() => {}))
      const { container } = render(<FinalPreviewPane contractId={1} hasReviewedContent={false} />)

      const loadingDiv = screen.getByText('Generating final document…').parentElement
      expect(loadingDiv).toHaveClass('h-[600px]', 'flex', 'items-center', 'justify-center')
    })
  })
})
