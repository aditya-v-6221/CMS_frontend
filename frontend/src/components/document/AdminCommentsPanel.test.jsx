import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminCommentsPanel from './AdminCommentsPanel'
import api from '../../api/client'

vi.mock('../../api/client')

describe('AdminCommentsPanel', () => {
  const mockComments = [
    {
      id: 1,
      user_id: 10,
      user_name: 'John Doe',
      content: 'This needs clarification',
      comment_type: 'general',
      is_resolved: false,
      created_at: '2024-01-15T10:30:00Z',
    },
    {
      id: 2,
      user_id: 20,
      user_name: 'Jane Smith',
      content: 'Approved with minor changes',
      comment_type: 'approval_note',
      is_resolved: false,
      created_at: '2024-01-16T14:20:00Z',
    },
    {
      id: 3,
      user_id: 30,
      user_name: null,
      content: 'This was resolved earlier',
      comment_type: 'general',
      is_resolved: true,
      created_at: '2024-01-14T09:15:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state', () => {
    it('should show empty message when no comments', () => {
      render(<AdminCommentsPanel contractId={1} comments={[]} />)

      expect(screen.getByText('No comments yet')).toBeInTheDocument()
    })

    it('should apply correct styling to empty message', () => {
      const { container } = render(<AdminCommentsPanel contractId={1} comments={[]} />)
      const emptyMessage = screen.getByText('No comments yet')

      expect(emptyMessage).toHaveClass('text-sm', 'text-gray-400')
    })
  })

  describe('comments rendering', () => {
    it('should render all comments', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(screen.getByText('This needs clarification')).toBeInTheDocument()
      expect(screen.getByText('Approved with minor changes')).toBeInTheDocument()
      expect(screen.getByText('This was resolved earlier')).toBeInTheDocument()
    })

    it('should display user names', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should show User ID when user_name is null', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(screen.getByText('User #30')).toBeInTheDocument()
    })

    it('should display formatted timestamps', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      // Date formatting might vary by locale, just check dates exist
      const timestamps = screen.getAllByText(/2024|Jan|15|16|14/)
      expect(timestamps.length).toBeGreaterThan(0)
    })

    it('should show comment content', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(screen.getByText('This needs clarification')).toBeInTheDocument()
    })
  })

  describe('comment types', () => {
    it('should display comment type badges for non-general types', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(screen.getByText('approval note')).toBeInTheDocument()
    })

    it('should replace underscores in comment type with spaces', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: 'Test comment',
          comment_type: 'legal_review',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('legal review')).toBeInTheDocument()
    })

    it('should not show badge for general comment type', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: 'General comment',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.queryByText('general')).not.toBeInTheDocument()
    })

    it('should not show badge when comment_type is null', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: 'Test comment',
          comment_type: null,
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      const badges = screen.queryByText(/review|note|approval/)
      expect(badges).not.toBeInTheDocument()
    })
  })

  describe('resolved status', () => {
    it('should show resolved badge for resolved comments', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(screen.getByText('resolved')).toBeInTheDocument()
    })

    it('should apply strikethrough to resolved comment content', () => {
      const { container } = render(<AdminCommentsPanel contractId={1} comments={mockComments} />)
      const resolvedComment = screen.getByText('This was resolved earlier')

      expect(resolvedComment).toHaveClass('line-through')
    })

    it('should apply gray styling to resolved comments', () => {
      const { container } = render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      // Find the resolved comment container
      const resolvedBadge = screen.getByText('resolved')
      const commentCard = resolvedBadge.closest('.p-3')

      expect(commentCard).toHaveClass('bg-gray-50')
    })

    it('should not show Resolve button for resolved comments', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      const resolveButtons = screen.getAllByText('Resolve')
      // Should have 2 Resolve buttons for 2 unresolved comments
      expect(resolveButtons).toHaveLength(2)
    })

    it('should show Resolve button for unresolved comments', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      const resolveButtons = screen.getAllByText('Resolve')
      expect(resolveButtons.length).toBeGreaterThan(0)
    })
  })

  describe('resolve functionality', () => {
    it('should call API to resolve comment when button clicked', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({})

      render(<AdminCommentsPanel contractId={123} comments={[mockComments[0]]} />)

      const resolveButton = screen.getByText('Resolve')
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/comments/1')
      })
    })

    it('should call onResolved callback after successful resolve', async () => {
      const user = userEvent.setup()
      const onResolved = vi.fn()
      api.patch.mockResolvedValue({})

      render(
        <AdminCommentsPanel
          contractId={123}
          comments={[mockComments[0]]}
          onResolved={onResolved}
        />
      )

      const resolveButton = screen.getByText('Resolve')
      await user.click(resolveButton)

      await waitFor(() => {
        expect(onResolved).toHaveBeenCalled()
      })
    })

    it('should not crash if onResolved is not provided', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({})

      render(<AdminCommentsPanel contractId={123} comments={[mockComments[0]]} />)

      const resolveButton = screen.getByText('Resolve')
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })
    })

    it('should silently handle resolve errors', async () => {
      const user = userEvent.setup()
      api.patch.mockRejectedValue(new Error('Network error'))

      render(<AdminCommentsPanel contractId={123} comments={[mockComments[0]]} />)

      const resolveButton = screen.getByText('Resolve')
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled()
      })

      // Should not show error message
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    it('should handle multiple resolve clicks on different comments', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({})

      render(<AdminCommentsPanel contractId={123} comments={mockComments.slice(0, 2)} />)

      const resolveButtons = screen.getAllByText('Resolve')
      await user.click(resolveButtons[0])
      await user.click(resolveButtons[1])

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledTimes(2)
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/comments/1')
        expect(api.patch).toHaveBeenCalledWith('/contracts/123/comments/2')
      })
    })
  })

  describe('styling and layout', () => {
    it('should apply correct styling to unresolved comments', () => {
      const { container } = render(
        <AdminCommentsPanel contractId={1} comments={[mockComments[0]]} />
      )

      const commentCard = container.querySelector('.bg-indigo-50')
      expect(commentCard).toBeInTheDocument()
    })

    it('should have proper spacing between comments', () => {
      const { container } = render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      const commentsContainer = container.querySelector('.space-y-3')
      expect(commentsContainer).toBeInTheDocument()
    })

    it('should render comment type badge with correct styling', () => {
      render(<AdminCommentsPanel contractId={1} comments={[mockComments[1]]} />)

      const badge = screen.getByText('approval note')
      expect(badge).toHaveClass('text-xs', 'bg-yellow-100', 'text-yellow-700')
    })

    it('should render resolved badge with correct styling', () => {
      render(<AdminCommentsPanel contractId={1} comments={[mockComments[2]]} />)

      const badge = screen.getByText('resolved')
      expect(badge).toHaveClass('text-xs', 'bg-gray-200', 'text-gray-500')
    })
  })

  describe('edge cases', () => {
    it('should handle comment with empty content', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: '',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should handle very long comment content', () => {
      const longContent = 'a'.repeat(10000)
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: longContent,
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText(longContent)).toBeInTheDocument()
    })

    it('should handle special characters in content', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: 'Special chars: <>&"\'',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('Special chars: <>&"\'')).toBeInTheDocument()
    })

    it('should handle very long user names', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Very Long Name That Goes On And On And On',
          content: 'Test comment',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('Very Long Name That Goes On And On And On')).toBeInTheDocument()
    })

    it('should handle user_id of 0', () => {
      const comments = [
        {
          id: 1,
          user_id: 0,
          user_name: null,
          content: 'Test comment',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('User #0')).toBeInTheDocument()
    })

    it('should handle comment with whitespace-only content', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: '   ',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-01-15T10:30:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  describe('boundary values', () => {
    it('should handle contractId of 0', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({})

      render(<AdminCommentsPanel contractId={0} comments={[mockComments[0]]} />)

      const resolveButton = screen.getByText('Resolve')
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/0/comments/1')
      })
    })

    it('should handle very large contractId', async () => {
      const user = userEvent.setup()
      api.patch.mockResolvedValue({})

      render(<AdminCommentsPanel contractId={999999999} comments={[mockComments[0]]} />)

      const resolveButton = screen.getByText('Resolve')
      await user.click(resolveButton)

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/contracts/999999999/comments/1')
      })
    })

    it('should handle large number of comments', () => {
      const manyComments = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        user_id: i,
        user_name: `User ${i}`,
        content: `Comment ${i}`,
        comment_type: 'general',
        is_resolved: false,
        created_at: '2024-01-15T10:30:00Z',
      }))

      render(<AdminCommentsPanel contractId={1} comments={manyComments} />)

      expect(screen.getByText('Comment 0')).toBeInTheDocument()
      expect(screen.getByText('Comment 99')).toBeInTheDocument()
    })
  })

  describe('date formatting', () => {
    it('should handle various date formats', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: 'Test',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2024-12-31T23:59:59Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should handle old dates', () => {
      const comments = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Test User',
          content: 'Test',
          comment_type: 'general',
          is_resolved: false,
          created_at: '2000-01-01T00:00:00Z',
        },
      ]
      render(<AdminCommentsPanel contractId={1} comments={comments} />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  describe('interaction states', () => {
    it('should have proper button styling', () => {
      render(<AdminCommentsPanel contractId={1} comments={[mockComments[0]]} />)

      const resolveButton = screen.getByText('Resolve')
      expect(resolveButton).toHaveClass('text-xs', 'px-2', 'py-1')
    })

    it('should render button as button element', () => {
      const { container } = render(
        <AdminCommentsPanel contractId={1} comments={[mockComments[0]]} />
      )

      const resolveButton = screen.getByText('Resolve')
      expect(resolveButton.tagName).toBe('BUTTON')
    })
  })

  describe('mixed comment states', () => {
    it('should correctly display mix of resolved and unresolved comments', () => {
      render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(screen.getByText('resolved')).toBeInTheDocument()
      expect(screen.getAllByText('Resolve')).toHaveLength(2)
    })

    it('should correctly style different comment types in same list', () => {
      const { container } = render(<AdminCommentsPanel contractId={1} comments={mockComments} />)

      expect(container.querySelector('.bg-indigo-50')).toBeInTheDocument()
      expect(container.querySelector('.bg-gray-50')).toBeInTheDocument()
    })
  })
})
