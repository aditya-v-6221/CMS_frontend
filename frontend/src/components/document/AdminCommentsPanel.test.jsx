import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminCommentsPanel from './AdminCommentsPanel'
import api from '../../api/client'

vi.mock('../../api/client', () => ({
  default: {
    patch: vi.fn()
  }
}))

describe('AdminCommentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering with different states', () => {
    it('should render empty state when no comments', () => {
      render(<AdminCommentsPanel contractId="123" comments={[]} onResolved={vi.fn()} />)

      expect(screen.getByText('No comments yet')).toBeInTheDocument()
      expect(screen.getByText('No comments yet')).toHaveClass('text-sm', 'text-gray-400')
    })

    it('should render empty state with empty array and no onResolved callback', () => {
      render(<AdminCommentsPanel contractId="123" comments={[]} />)

      expect(screen.getByText('No comments yet')).toBeInTheDocument()
    })

    it('should render single unresolved comment', () => {
      const comments = [
        {
          id: 1,
          user_name: 'John Doe',
          user_id: 100,
          comment_type: 'general',
          content: 'This is a test comment',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('This is a test comment')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument()
    })

    it('should render single resolved comment', () => {
      const comments = [
        {
          id: 1,
          user_name: 'John Doe',
          user_id: 100,
          comment_type: 'general',
          content: 'This is resolved',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: true
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('This is resolved')).toBeInTheDocument()
      expect(screen.getByText('resolved')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    })

    it('should render multiple comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'John Doe',
          user_id: 100,
          comment_type: 'general',
          content: 'First comment',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        },
        {
          id: 2,
          user_name: 'Jane Smith',
          user_id: 101,
          comment_type: 'urgent',
          content: 'Second comment',
          created_at: '2026-06-16T11:00:00Z',
          is_resolved: true
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('First comment')).toBeInTheDocument()
      expect(screen.getByText('Second comment')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Resolve' })).toHaveLength(1)
    })
  })

  describe('User name and ID rendering', () => {
    it('should render user_name when provided', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Alice Johnson',
          user_id: 200,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.queryByText(/User #/)).not.toBeInTheDocument()
    })

    it('should render User #id when user_name is null', () => {
      const comments = [
        {
          id: 1,
          user_name: null,
          user_id: 200,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('User #200')).toBeInTheDocument()
    })

    it('should render User #id when user_name is undefined', () => {
      const comments = [
        {
          id: 1,
          user_id: 300,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('User #300')).toBeInTheDocument()
    })

    it('should render User #id when user_name is empty string', () => {
      const comments = [
        {
          id: 1,
          user_name: '',
          user_id: 400,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('User #400')).toBeInTheDocument()
    })
  })

  describe('Comment type rendering', () => {
    it('should not render comment type badge for general type', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          comment_type: 'general',
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.queryByText('general')).not.toBeInTheDocument()
    })

    it('should not render comment type badge when comment_type is null', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          comment_type: null,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.queryByText(/general/i)).not.toBeInTheDocument()
    })

    it('should not render comment type badge when comment_type is undefined', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const container = screen.getByText('Test').closest('div').closest('div')
      expect(container.querySelector('.bg-yellow-100')).not.toBeInTheDocument()
    })

    it('should render comment type badge for urgent type', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          comment_type: 'urgent',
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('urgent')).toBeInTheDocument()
      expect(screen.getByText('urgent')).toHaveClass('bg-yellow-100', 'text-yellow-700')
    })

    it('should render comment type badge with underscores replaced by spaces', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          comment_type: 'needs_review',
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('needs review')).toBeInTheDocument()
    })

    it('should render comment type badge for action_required type', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          comment_type: 'action_required',
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('action required')).toBeInTheDocument()
    })
  })

  describe('Resolved state rendering', () => {
    it('should show resolved badge for resolved comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: true
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('resolved')).toBeInTheDocument()
      expect(screen.getByText('resolved')).toHaveClass('bg-gray-200', 'text-gray-500')
    })

    it('should not show resolved badge for unresolved comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.queryByText('resolved')).not.toBeInTheDocument()
    })

    it('should apply line-through style to resolved comment content', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Resolved content',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: true
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const contentElement = screen.getByText('Resolved content')
      expect(contentElement).toHaveClass('line-through')
    })

    it('should not apply line-through style to unresolved comment content', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Active content',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const contentElement = screen.getByText('Active content')
      expect(contentElement).not.toHaveClass('line-through')
    })

    it('should apply correct background color for resolved comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: true
        }
      ]

      const { container } = render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const commentDiv = container.querySelector('.bg-gray-50')
      expect(commentDiv).toBeInTheDocument()
      expect(commentDiv).toHaveClass('border-gray-100', 'text-gray-400')
    })

    it('should apply correct background color for unresolved comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      const { container } = render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const commentDiv = container.querySelector('.bg-indigo-50')
      expect(commentDiv).toBeInTheDocument()
      expect(commentDiv).toHaveClass('border-indigo-100', 'text-gray-800')
    })
  })

  describe('Date rendering', () => {
    it('should render formatted date', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:30:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const dateElement = screen.getByText(/6\/15\/2026|15\/6\/2026/)
      expect(dateElement).toBeInTheDocument()
      expect(dateElement).toHaveClass('text-xs', 'text-gray-400')
    })

    it('should handle different date formats', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-01-01T00:00:00.000Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const dateText = screen.getByText(/2026/).textContent
      expect(dateText).toBeTruthy()
    })
  })

  describe('Resolve button interaction', () => {
    it('should show Resolve button for unresolved comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      expect(resolveButton).toBeInTheDocument()
      expect(resolveButton).toHaveClass('hover:bg-gray-100', 'text-gray-600')
    })

    it('should not show Resolve button for resolved comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: true
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    })

    it('should call api.patch with correct parameters when Resolve is clicked', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 42,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="789" comments={comments} onResolved={vi.fn()} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/789/comments/42')
      })
    })

    it('should call onResolved callback after successful API call', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={onResolved} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(onResolved).toHaveBeenCalledTimes(1)
      })
    })

    it('should not call onResolved when onResolved is undefined', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })

    it('should not call onResolved when onResolved is null', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={null} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })

    it('should handle API error gracefully without calling onResolved', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      api.patch.mockRejectedValue(new Error('Network error'))

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={onResolved} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })

      expect(onResolved).not.toHaveBeenCalled()
    })

    it('should handle multiple Resolve button clicks on different comments', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 1,
          user_name: 'User 1',
          user_id: 100,
          content: 'First',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        },
        {
          id: 2,
          user_name: 'User 2',
          user_id: 101,
          content: 'Second',
          created_at: '2026-06-15T11:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={onResolved} />)

      const resolveButtons = screen.getAllByRole('button', { name: 'Resolve' })
      expect(resolveButtons).toHaveLength(2)

      await user.click(resolveButtons[0])
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/comments/1')
      })

      await user.click(resolveButtons[1])
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/comments/2')
      })

      expect(onResolved).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge cases and boundary values', () => {
    it('should handle comment with very long content', () => {
      const longContent = 'a'.repeat(1000)
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: longContent,
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText(longContent)).toBeInTheDocument()
      expect(screen.getByText(longContent)).toHaveClass('break-words')
    })

    it('should handle comment with special characters', () => {
      const specialContent = '<script>alert("XSS")</script> & "quotes" & \'single\''
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: specialContent,
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText(specialContent)).toBeInTheDocument()
    })

    it('should handle comment with very long user name', () => {
      const longName = 'Very Long User Name That Exceeds Normal Length'.repeat(3)
      const comments = [
        {
          id: 1,
          user_name: longName,
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText(longName)).toBeInTheDocument()
    })

    it('should handle comment with user_id of 0', () => {
      const comments = [
        {
          id: 1,
          user_name: null,
          user_id: 0,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('User #0')).toBeInTheDocument()
    })

    it('should handle comment with negative user_id', () => {
      const comments = [
        {
          id: 1,
          user_name: null,
          user_id: -1,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('User #-1')).toBeInTheDocument()
    })

    it('should handle comment with id of 0', () => {
      const comments = [
        {
          id: 0,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('should handle empty string content', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: '',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should handle whitespace-only content', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: '   ',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('   ')).toBeInTheDocument()
    })

    it('should handle very large array of comments', () => {
      const comments = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        user_name: `User ${i}`,
        user_id: 100 + i,
        content: `Comment ${i}`,
        created_at: '2026-06-15T10:00:00Z',
        is_resolved: i % 2 === 0
      }))

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('User 0')).toBeInTheDocument()
      expect(screen.getByText('User 99')).toBeInTheDocument()
      expect(screen.getByText('Comment 0')).toBeInTheDocument()
      expect(screen.getByText('Comment 99')).toBeInTheDocument()
    })

    it('should handle different contractId types', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="abc-def-123" comments={comments} onResolved={vi.fn()} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/abc-def-123/comments/1')
      })
    })

    it('should handle numeric contractId', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId={456} comments={comments} onResolved={vi.fn()} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/456/comments/1')
      })
    })
  })

  describe('Complex scenarios', () => {
    it('should render mixed resolved and unresolved comments with different types', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Alice',
          user_id: 100,
          comment_type: 'urgent',
          content: 'Urgent issue',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        },
        {
          id: 2,
          user_name: null,
          user_id: 200,
          comment_type: 'needs_review',
          content: 'Needs review',
          created_at: '2026-06-15T11:00:00Z',
          is_resolved: true
        },
        {
          id: 3,
          user_name: 'Bob',
          user_id: 300,
          comment_type: 'general',
          content: 'General comment',
          created_at: '2026-06-15T12:00:00Z',
          is_resolved: false
        },
        {
          id: 4,
          user_name: '',
          user_id: 400,
          content: 'No type specified',
          created_at: '2026-06-15T13:00:00Z',
          is_resolved: true
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('User #200')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('User #400')).toBeInTheDocument()

      expect(screen.getByText('urgent')).toBeInTheDocument()
      expect(screen.getByText('needs review')).toBeInTheDocument()
      expect(screen.queryByText('general')).not.toBeInTheDocument()

      expect(screen.getAllByText('resolved')).toHaveLength(2)
      expect(screen.getAllByRole('button', { name: 'Resolve' })).toHaveLength(2)
    })

    it('should maintain key uniqueness with multiple comments', () => {
      const comments = [
        {
          id: 1,
          user_name: 'User 1',
          user_id: 100,
          content: 'First',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        },
        {
          id: 2,
          user_name: 'User 2',
          user_id: 101,
          content: 'Second',
          created_at: '2026-06-15T11:00:00Z',
          is_resolved: false
        }
      ]

      const { container } = render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const commentDivs = container.querySelectorAll('[class*="rounded-lg"]')
      expect(commentDivs).toHaveLength(2)
    })

    it('should handle rapid successive clicks on same Resolve button', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      api.patch.mockResolvedValue({ data: {} })

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={onResolved} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })

      await user.click(resolveButton)
      await user.click(resolveButton)
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledTimes(3)
      })

      expect(onResolved).toHaveBeenCalledTimes(3)
    })

    it('should handle API timeout error', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      api.patch.mockRejectedValue(new Error('Timeout'))

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={onResolved} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })

      expect(onResolved).not.toHaveBeenCalled()
    })

    it('should handle API 500 error', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      const error = new Error('Internal Server Error')
      error.response = { status: 500 }
      api.patch.mockRejectedValue(error)

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={onResolved} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })

      expect(onResolved).not.toHaveBeenCalled()
    })

    it('should handle API 404 error', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      const error = new Error('Not Found')
      error.response = { status: 404 }
      api.patch.mockRejectedValue(error)

      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={onResolved} />)

      const resolveButton = screen.getByRole('button', { name: 'Resolve' })
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })

      expect(onResolved).not.toHaveBeenCalled()
    })
  })

  describe('Layout and structure', () => {
    it('should render container with correct spacing class', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      const { container } = render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const mainDiv = container.querySelector('.space-y-3')
      expect(mainDiv).toBeInTheDocument()
    })

    it('should render comment with correct structure classes', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      const { container } = render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const commentDiv = container.querySelector('.rounded-lg')
      expect(commentDiv).toHaveClass('p-3', 'border', 'text-sm')
    })

    it('should render flex layout for comment header', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      const { container } = render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={vi.fn()} />)

      const flexDiv = container.querySelector('.flex.items-start.justify-between')
      expect(flexDiv).toBeInTheDocument()
    })
  })

  describe('Props validation', () => {
    it('should handle contractId as string', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      expect(() => {
        render(<AdminCommentsPanel contractId="test-id" comments={comments} onResolved={vi.fn()} />)
      }).not.toThrow()
    })

    it('should handle contractId as number', () => {
      const comments = [
        {
          id: 1,
          user_name: 'Test User',
          user_id: 100,
          content: 'Test',
          created_at: '2026-06-15T10:00:00Z',
          is_resolved: false
        }
      ]

      expect(() => {
        render(<AdminCommentsPanel contractId={123} comments={comments} onResolved={vi.fn()} />)
      }).not.toThrow()
    })

    it('should handle onResolved as function', () => {
      const comments = []

      expect(() => {
        render(<AdminCommentsPanel contractId="123" comments={comments} onResolved={() => {}} />)
      }).not.toThrow()
    })

    it('should handle missing onResolved prop', () => {
      const comments = []

      expect(() => {
        render(<AdminCommentsPanel contractId="123" comments={comments} />)
      }).not.toThrow()
    })
  })
})
