import { render, screen } from '@testing-library/react'
import StatusBadge from '../../components/StatusBadge'

describe('StatusBadge', () => {
  describe('Status rendering', () => {
    it('should render draft status with correct styling', () => {
      render(<StatusBadge status="draft" />)
      const badge = screen.getByText('draft')

      expect(badge).toHaveClass('bg-gray-100', 'text-gray-700')
    })

    it('should render review status with correct styling', () => {
      render(<StatusBadge status="review" />)
      const badge = screen.getByText('review')

      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })

    it('should render approval status with correct styling', () => {
      render(<StatusBadge status="approval" />)
      const badge = screen.getByText('approval')

      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
    })

    it('should render pending_signature status with correct styling and formatted text', () => {
      render(<StatusBadge status="pending_signature" />)
      const badge = screen.getByText('pending signature')

      expect(badge).toHaveClass('bg-purple-100', 'text-purple-800')
    })

    it('should render executed status with correct styling', () => {
      render(<StatusBadge status="executed" />)
      const badge = screen.getByText('executed')

      expect(badge).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('should render expired status with correct styling', () => {
      render(<StatusBadge status="expired" />)
      const badge = screen.getByText('expired')

      expect(badge).toHaveClass('bg-red-100', 'text-red-700')
    })

    it('should render terminated status with correct styling', () => {
      render(<StatusBadge status="terminated" />)
      const badge = screen.getByText('terminated')

      expect(badge).toHaveClass('bg-red-200', 'text-red-900')
    })
  })

  describe('Unknown status handling', () => {
    it('should render unknown status with default gray styling', () => {
      render(<StatusBadge status="unknown_status" />)
      const badge = screen.getByText('unknown status')

      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('should render custom status with underscore replacement', () => {
      render(<StatusBadge status="custom_test_status" />)
      const badge = screen.getByText('custom test status')

      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })
  })

  describe('Null and undefined handling', () => {
    it('should handle null status gracefully', () => {
      render(<StatusBadge status={null} />)

      expect(screen.getByText('')).toBeInTheDocument()
    })

    it('should handle undefined status gracefully', () => {
      render(<StatusBadge status={undefined} />)

      expect(screen.getByText('')).toBeInTheDocument()
    })

    it('should handle empty string status', () => {
      render(<StatusBadge status="" />)
      const badge = screen.getByText('')

      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })
  })

  describe('CSS classes', () => {
    it('should apply base classes to all badges', () => {
      render(<StatusBadge status="draft" />)
      const badge = screen.getByText('draft')

      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium')
    })

    it('should be a span element', () => {
      render(<StatusBadge status="review" />)
      const badge = screen.getByText('review')

      expect(badge.tagName).toBe('SPAN')
    })
  })

  describe('Text formatting', () => {
    it('should replace single underscore with space', () => {
      render(<StatusBadge status="pending_signature" />)

      expect(screen.getByText('pending signature')).toBeInTheDocument()
    })

    it('should only replace first underscore', () => {
      render(<StatusBadge status="test_status_value" />)

      expect(screen.getByText('test status_value')).toBeInTheDocument()
    })

    it('should handle status without underscores', () => {
      render(<StatusBadge status="executed" />)

      expect(screen.getByText('executed')).toBeInTheDocument()
    })

    it('should preserve casing of status text', () => {
      render(<StatusBadge status="DRAFT" />)

      expect(screen.getByText('DRAFT')).toBeInTheDocument()
    })
  })

  describe('Multiple instances', () => {
    it('should render multiple badges with different statuses', () => {
      const { rerender } = render(<StatusBadge status="draft" />)
      expect(screen.getByText('draft')).toBeInTheDocument()

      rerender(<StatusBadge status="executed" />)
      expect(screen.getByText('executed')).toBeInTheDocument()
    })
  })
})
