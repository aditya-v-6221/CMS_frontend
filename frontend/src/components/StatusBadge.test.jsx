import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  describe('status rendering', () => {
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

    it('should render pending_signature status with correct styling', () => {
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

  describe('underscore replacement', () => {
    it('should replace underscores with spaces', () => {
      render(<StatusBadge status="pending_signature" />)
      expect(screen.getByText('pending signature')).toBeInTheDocument()
    })

    it('should handle status without underscores', () => {
      render(<StatusBadge status="draft" />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('should handle multiple underscores', () => {
      render(<StatusBadge status="test_multiple_underscores" />)
      const badge = screen.getByText(/test/)
      // Only first underscore is replaced due to replace without 'g' flag
      expect(badge.textContent).toBe('test multiple_underscores')
    })
  })

  describe('edge cases', () => {
    it('should handle unknown status with default styling', () => {
      render(<StatusBadge status="unknown_status" />)
      const badge = screen.getByText('unknown status')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('should handle null status', () => {
      render(<StatusBadge status={null} />)
      const badge = screen.getByText('')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('should handle undefined status', () => {
      render(<StatusBadge status={undefined} />)
      const badge = screen.getByText('')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('should handle empty string status', () => {
      render(<StatusBadge status="" />)
      const badge = screen.getByText('')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('should handle status with special characters', () => {
      render(<StatusBadge status="test@status#123" />)
      expect(screen.getByText('test@status#123')).toBeInTheDocument()
    })

    it('should handle very long status', () => {
      const longStatus = 'a'.repeat(100)
      render(<StatusBadge status={longStatus} />)
      expect(screen.getByText(longStatus)).toBeInTheDocument()
    })
  })

  describe('styling classes', () => {
    it('should have base classes for badge styling', () => {
      render(<StatusBadge status="draft" />)
      const badge = screen.getByText('draft')
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium')
    })

    it('should be a span element', () => {
      render(<StatusBadge status="draft" />)
      const badge = screen.getByText('draft')
      expect(badge.tagName).toBe('SPAN')
    })

    it('should apply correct color classes for each status', () => {
      const statuses = [
        { status: 'draft', bgClass: 'bg-gray-100', textClass: 'text-gray-700' },
        { status: 'review', bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
        { status: 'approval', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
        { status: 'pending_signature', bgClass: 'bg-purple-100', textClass: 'text-purple-800' },
        { status: 'executed', bgClass: 'bg-green-100', textClass: 'text-green-800' },
        { status: 'expired', bgClass: 'bg-red-100', textClass: 'text-red-700' },
        { status: 'terminated', bgClass: 'bg-red-200', textClass: 'text-red-900' },
      ]

      statuses.forEach(({ status, bgClass, textClass }) => {
        const { rerender } = render(<StatusBadge status={status} />)
        const badge = screen.getByText(status.replace('_', ' '))
        expect(badge).toHaveClass(bgClass, textClass)
        rerender(<div />)
      })
    })
  })

  describe('accessibility', () => {
    it('should be visible and readable', () => {
      render(<StatusBadge status="executed" />)
      const badge = screen.getByText('executed')
      expect(badge).toBeVisible()
    })

    it('should display text content correctly for screen readers', () => {
      render(<StatusBadge status="pending_signature" />)
      const badge = screen.getByText('pending signature')
      expect(badge.textContent).toBe('pending signature')
    })
  })
})
