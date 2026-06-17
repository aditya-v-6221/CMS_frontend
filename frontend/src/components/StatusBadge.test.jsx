import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  describe('status rendering', () => {
    it('should render draft status with correct styling', () => {
      const { container } = render(<StatusBadge status="draft" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('draft')
      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-700')
    })

    it('should render review status with correct styling', () => {
      const { container } = render(<StatusBadge status="review" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('review')
      expect(badge.className).toContain('bg-yellow-100')
      expect(badge.className).toContain('text-yellow-800')
    })

    it('should render approval status with correct styling', () => {
      const { container } = render(<StatusBadge status="approval" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('approval')
      expect(badge.className).toContain('bg-blue-100')
      expect(badge.className).toContain('text-blue-800')
    })

    it('should render pending_signature status with underscore replaced', () => {
      const { container } = render(<StatusBadge status="pending_signature" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('pending signature')
      expect(badge.className).toContain('bg-purple-100')
      expect(badge.className).toContain('text-purple-800')
    })

    it('should render executed status with correct styling', () => {
      const { container } = render(<StatusBadge status="executed" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('executed')
      expect(badge.className).toContain('bg-green-100')
      expect(badge.className).toContain('text-green-800')
    })

    it('should render expired status with correct styling', () => {
      const { container } = render(<StatusBadge status="expired" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('expired')
      expect(badge.className).toContain('bg-red-100')
      expect(badge.className).toContain('text-red-700')
    })

    it('should render terminated status with correct styling', () => {
      const { container } = render(<StatusBadge status="terminated" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('terminated')
      expect(badge.className).toContain('bg-red-200')
      expect(badge.className).toContain('text-red-900')
    })
  })

  describe('unknown status handling', () => {
    it('should render unknown status with default styling', () => {
      const { container } = render(<StatusBadge status="unknown_status" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('unknown status')
      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })

    it('should render null status with default styling', () => {
      const { container } = render(<StatusBadge status={null} />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('')
      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })

    it('should render undefined status with default styling', () => {
      const { container } = render(<StatusBadge status={undefined} />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('')
      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })

    it('should render empty string status with default styling', () => {
      const { container } = render(<StatusBadge status="" />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe('')
      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })
  })

  describe('underscore replacement', () => {
    it('should replace single underscore in status text', () => {
      const { getByText } = render(<StatusBadge status="pending_review" />)
      expect(getByText('pending review')).toBeTruthy()
    })

    it('should only replace first underscore in multi-underscore status', () => {
      const { getByText } = render(<StatusBadge status="pending_signature_review" />)
      expect(getByText('pending signature_review')).toBeTruthy()
    })

    it('should not modify status without underscore', () => {
      const { getByText } = render(<StatusBadge status="draft" />)
      expect(getByText('draft')).toBeTruthy()
    })
  })

  describe('CSS classes', () => {
    it('should have base CSS classes', () => {
      const { container } = render(<StatusBadge status="draft" />)
      const badge = container.querySelector('span')

      expect(badge.className).toContain('px-2.5')
      expect(badge.className).toContain('py-0.5')
      expect(badge.className).toContain('rounded-full')
      expect(badge.className).toContain('text-xs')
      expect(badge.className).toContain('font-medium')
    })

    it('should combine base and status-specific classes', () => {
      const { container } = render(<StatusBadge status="review" />)
      const badge = container.querySelector('span')

      expect(badge.className).toContain('px-2.5')
      expect(badge.className).toContain('bg-yellow-100')
      expect(badge.className).toContain('text-yellow-800')
    })
  })

  describe('edge cases', () => {
    it('should handle numeric status', () => {
      const { container } = render(<StatusBadge status={123} />)
      const badge = container.querySelector('span')

      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })

    it('should handle boolean status', () => {
      const { container } = render(<StatusBadge status={true} />)
      const badge = container.querySelector('span')

      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })

    it('should handle object status', () => {
      const { container } = render(<StatusBadge status={{}} />)
      const badge = container.querySelector('span')

      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })

    it('should handle very long status string', () => {
      const longStatus = 'a'.repeat(100)
      const { container } = render(<StatusBadge status={longStatus} />)
      const badge = container.querySelector('span')

      expect(badge.textContent).toBe(longStatus)
      expect(badge.className).toContain('bg-gray-100')
    })

    it('should handle status with special characters', () => {
      const { getByText } = render(<StatusBadge status="status-with-dash" />)
      expect(getByText('status-with-dash')).toBeTruthy()
    })
  })

  describe('boundary values', () => {
    it('should handle status at COLORS key boundary (exists)', () => {
      const { container } = render(<StatusBadge status="draft" />)
      expect(container.querySelector('span').className).toContain('bg-gray-100')
    })

    it('should handle status just beyond COLORS key boundary (not exists)', () => {
      const { container } = render(<StatusBadge status="draft2" />)
      expect(container.querySelector('span').className).toContain('bg-gray-100')
      expect(container.querySelector('span').className).toContain('text-gray-600')
    })
  })
})
