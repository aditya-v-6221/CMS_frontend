import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  describe('status display', () => {
    it('should render draft status with correct styling', () => {
      render(<StatusBadge status="draft" />)
      const badge = screen.getByText('draft')

      expect(badge).toBeInTheDocument()
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

    it('should render pending_signature status with underscore replaced', () => {
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

  describe('edge cases', () => {
    it('should render unknown status with default styling', () => {
      render(<StatusBadge status="unknown_status" />)
      const badge = screen.getByText('unknown status')

      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('should handle null status', () => {
      render(<StatusBadge status={null} />)
      const element = screen.queryByText(/./i)

      // The component will render an empty span
      expect(element?.textContent).toBe('')
    })

    it('should handle undefined status', () => {
      render(<StatusBadge status={undefined} />)
      const element = screen.queryByText(/./i)

      expect(element?.textContent).toBe('')
    })

    it('should handle empty string status', () => {
      render(<StatusBadge status="" />)

      // Empty string becomes empty text after replace
      const badge = document.querySelector('span')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('underscore replacement', () => {
    it('should replace single underscore with space', () => {
      render(<StatusBadge status="pending_approval" />)
      expect(screen.getByText('pending approval')).toBeInTheDocument()
    })

    it('should replace only first underscore', () => {
      render(<StatusBadge status="very_long_status_name" />)
      // replace() replaces only the first occurrence
      expect(screen.getByText('very long_status_name')).toBeInTheDocument()
    })

    it('should not modify status without underscore', () => {
      render(<StatusBadge status="active" />)
      expect(screen.getByText('active')).toBeInTheDocument()
    })
  })

  describe('styling classes', () => {
    it('should always include base classes', () => {
      render(<StatusBadge status="draft" />)
      const badge = screen.getByText('draft')

      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium')
    })

    it('should be a span element', () => {
      const { container } = render(<StatusBadge status="draft" />)
      const badge = container.querySelector('span')

      expect(badge).toBeInTheDocument()
      expect(badge?.tagName).toBe('SPAN')
    })
  })

  describe('boundary values', () => {
    it('should handle very long status name', () => {
      const longStatus = 'a'.repeat(1000)
      render(<StatusBadge status={longStatus} />)

      expect(screen.getByText(longStatus)).toBeInTheDocument()
    })

    it('should handle status with special characters', () => {
      render(<StatusBadge status="status@#$%" />)
      expect(screen.getByText('status@#$%')).toBeInTheDocument()
    })

    it('should handle status with numbers', () => {
      render(<StatusBadge status="status123" />)
      expect(screen.getByText('status123')).toBeInTheDocument()
    })

    it('should handle status with leading/trailing spaces', () => {
      render(<StatusBadge status="  draft  " />)
      expect(screen.getByText('  draft  ')).toBeInTheDocument()
    })
  })

  describe('all documented statuses', () => {
    const allStatuses = [
      { status: 'draft', color: 'bg-gray-100 text-gray-700' },
      { status: 'review', color: 'bg-yellow-100 text-yellow-800' },
      { status: 'approval', color: 'bg-blue-100 text-blue-800' },
      { status: 'pending_signature', color: 'bg-purple-100 text-purple-800' },
      { status: 'executed', color: 'bg-green-100 text-green-800' },
      { status: 'expired', color: 'bg-red-100 text-red-700' },
      { status: 'terminated', color: 'bg-red-200 text-red-900' },
    ]

    allStatuses.forEach(({ status, color }) => {
      it(`should render ${status} with correct color classes`, () => {
        render(<StatusBadge status={status} />)
        const displayText = status.replace('_', ' ')
        const badge = screen.getByText(displayText)

        const colorClasses = color.split(' ')
        colorClasses.forEach(cls => {
          expect(badge).toHaveClass(cls)
        })
      })
    })
  })
})
