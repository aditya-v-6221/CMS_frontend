import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import TemplatesPage from './TemplatesPage'
import api from '../api/client'
import { AuthContext } from '../context/AuthContext'

// Mock dependencies
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

const mockNavigate = vi.fn()

describe('TemplatesPage', () => {
  let user

  const mockTemplates = [
    {
      id: 1,
      title: 'Standard NDA',
      description: 'Standard non-disclosure agreement',
      contract_type: 'NDA',
      jurisdiction: 'IN',
      governing_law: 'Indian Contract Act, 1872',
      is_active: true,
      tags: ['Pre-approved', 'Short-form'],
      content: 'NDA content with {{counterparty_name}} placeholder',
    },
    {
      id: 2,
      title: 'Master Service Agreement',
      description: 'MSA template',
      contract_type: 'MSA',
      jurisdiction: 'US',
      governing_law: 'Delaware Law',
      is_active: true,
      tags: ['Standard'],
      content: null,
    },
    {
      id: 3,
      title: 'Inactive Template',
      description: 'This template is inactive',
      contract_type: 'SOW',
      jurisdiction: 'EU',
      governing_law: null,
      is_active: false,
      tags: null,
      content: null,
    },
  ]

  const mockAuthContext = (role = 'viewer') => ({
    user: { id: 1, email: 'test@example.com', role },
    login: vi.fn(),
    logout: vi.fn(),
  })

  const renderWithAuth = (role = 'viewer') => {
    const authValue = mockAuthContext(role)
    return {
      ...render(
        <BrowserRouter>
          <AuthContext.Provider value={authValue}>
            <TemplatesPage />
          </AuthContext.Provider>
        </BrowserRouter>
      ),
      authValue,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    const { useNavigate } = require('react-router-dom')
    useNavigate.mockReturnValue(mockNavigate)
    user = userEvent.setup()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render loading state initially', async () => {
      api.get.mockImplementation(() => new Promise(() => {})) // Never resolves
      renderWithAuth('viewer')

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should render templates page title with count', async () => {
      api.get.mockResolvedValue({ data: { items: mockTemplates.slice(0, 2), total: 2 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Templates')).toBeInTheDocument()
        expect(screen.getByText('(2)')).toBeInTheDocument()
      })
    })

    it('should load templates on mount', async () => {
      api.get.mockResolvedValue({ data: { items: mockTemplates.slice(0, 2), total: 2 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?limit=100')
      })

      expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      expect(screen.getByText('Master Service Agreement')).toBeInTheDocument()
    })

    it('should render empty state when no templates exist', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('No templates available.')).toBeInTheDocument()
      })
    })

    it('should render admin-specific empty state for admin users', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('No templates yet. Create one with the button above.')).toBeInTheDocument()
      })
    })
  })

  describe('Role-based Rendering', () => {
    it('should show "New template" button for admin users', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })
    })

    it('should not show "New template" button for non-admin users', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.queryByText('+ New template')).not.toBeInTheDocument()
      })
    })

    it('should show "Use template" button for editor users on active templates', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })
    })

    it('should show "Use template" button for admin users on active templates', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })
    })

    it('should not show "Use template" button for viewer users', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.queryByText('Use template')).not.toBeInTheDocument()
      })
    })

    it('should show "Deactivate" button for admin users on active templates', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })
    })

    it('should not show "Deactivate" button for non-admin users', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.queryByText('Deactivate')).not.toBeInTheDocument()
      })
    })

    it('should show "Show inactive" checkbox only for admin users', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByLabelText('Show inactive')).toBeInTheDocument()
      })
    })

    it('should not show "Show inactive" checkbox for non-admin users', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.queryByLabelText('Show inactive')).not.toBeInTheDocument()
      })
    })
  })

  describe('Template Card Rendering', () => {
    it('should render template with all metadata fields', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
        expect(screen.getByText('Standard non-disclosure agreement')).toBeInTheDocument()
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getByText('IN')).toBeInTheDocument()
        expect(screen.getByText('· Indian Contract Act, 1872')).toBeInTheDocument()
        expect(screen.getByText('Pre-approved')).toBeInTheDocument()
        expect(screen.getByText('Short-form')).toBeInTheDocument()
        expect(screen.getByText(/NDA content with/)).toBeInTheDocument()
      })
    })

    it('should render template without optional fields', async () => {
      const minimalTemplate = {
        id: 4,
        title: 'Minimal Template',
        description: null,
        contract_type: null,
        jurisdiction: null,
        governing_law: null,
        is_active: true,
        tags: null,
        content: null,
      }
      api.get.mockResolvedValue({ data: { items: [minimalTemplate], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Minimal Template')).toBeInTheDocument()
      })

      // Verify optional fields are not rendered
      expect(screen.queryByText('·')).not.toBeInTheDocument()
    })

    it('should render inactive template with reduced opacity', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[2]], total: 1 } })
      renderWithAuth('admin')

      // Enable inactive templates
      const checkbox = await screen.findByLabelText('Show inactive')
      await user.click(checkbox)

      await waitFor(() => {
        expect(screen.getByText('Inactive Template')).toBeInTheDocument()
        expect(screen.getByText('Inactive')).toBeInTheDocument()
      })
    })

    it('should not render tags when tags array is empty', async () => {
      const templateWithEmptyTags = {
        ...mockTemplates[0],
        tags: [],
      }
      api.get.mockResolvedValue({ data: { items: [templateWithEmptyTags], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      expect(screen.queryByText('Pre-approved')).not.toBeInTheDocument()
    })

    it('should not render tags when tags is null', async () => {
      const templateWithNullTags = {
        ...mockTemplates[0],
        tags: null,
      }
      api.get.mockResolvedValue({ data: { items: [templateWithNullTags], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      expect(screen.queryByText('Pre-approved')).not.toBeInTheDocument()
    })

    it('should not render content section when content is null', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[1]], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Master Service Agreement')).toBeInTheDocument()
      })

      // Check that content preview is not rendered
      const card = screen.getByText('Master Service Agreement').closest('div')
      expect(within(card).queryByText(/content/i)).not.toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { items: mockTemplates.slice(0, 2), total: 2 } })
    })

    it('should filter templates by contract type', async () => {
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?contract_type=NDA&limit=100')
      })
    })

    it('should filter templates by jurisdiction', async () => {
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')
      await user.selectOptions(jurisdictionSelect, 'US')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?jurisdiction=US&limit=100')
      })
    })

    it('should filter by both type and jurisdiction', async () => {
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'MSA')

      const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')
      await user.selectOptions(jurisdictionSelect, 'EU')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?contract_type=MSA&jurisdiction=EU&limit=100')
      })
    })

    it('should include inactive templates when checkbox is checked (admin only)', async () => {
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByLabelText('Show inactive')).toBeInTheDocument()
      })

      const checkbox = screen.getByLabelText('Show inactive')
      await user.click(checkbox)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?include_inactive=true&limit=100')
      })
    })

    it('should not include inactive parameter when checkbox is unchecked', async () => {
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByLabelText('Show inactive')).toBeInTheDocument()
      })

      // Checkbox is unchecked by default
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?limit=100')
      })
    })

    it('should reset to "All types" filter option', async () => {
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?contract_type=NDA&limit=100')
      })

      api.get.mockClear()
      await user.selectOptions(typeSelect, '')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?limit=100')
      })
    })
  })

  describe('CreateTemplateModal', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
    })

    it('should open create template modal when button is clicked', async () => {
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      expect(screen.getByText('New template')).toBeInTheDocument()
      expect(screen.getByLabelText('Title *')).toBeInTheDocument()
    })

    it('should close modal when Cancel button is clicked', async () => {
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))
      expect(screen.getByText('New template')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(screen.queryByText('New template')).not.toBeInTheDocument()
    })

    it('should close modal when X button is clicked', async () => {
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))
      expect(screen.getByText('New template')).toBeInTheDocument()

      const closeButton = screen.getByText('×')
      await user.click(closeButton)

      expect(screen.queryByText('New template')).not.toBeInTheDocument()
    })

    it('should submit create template form with all fields', async () => {
      api.post.mockResolvedValue({ data: { id: 5 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Test Template')

      const contractTypeSelect = screen.getByLabelText('Contract type')
      await user.selectOptions(contractTypeSelect, 'NDA')

      const jurisdictionSelect = screen.getByLabelText('Jurisdiction')
      await user.selectOptions(jurisdictionSelect, 'IN')

      const governingLawInput = screen.getByLabelText('Governing law')
      await user.type(governingLawInput, 'Test Law')

      const descriptionTextarea = screen.getByLabelText('Description')
      await user.type(descriptionTextarea, 'Test description')

      const contentTextarea = screen.getByLabelText('Template body (plain text)')
      await user.type(contentTextarea, 'Template content with {{counterparty_name}}')

      const tagsInput = screen.getByLabelText('Tags (comma-separated)')
      await user.type(tagsInput, 'Tag1, Tag2, Tag3')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/templates', {
          title: 'New Test Template',
          description: 'Test description',
          contract_type: 'NDA',
          jurisdiction: 'IN',
          governing_law: 'Test Law',
          content: 'Template content with {{counterparty_name}}',
          tags: ['Tag1', 'Tag2', 'Tag3'],
        })
      })

      // Modal should close and reload templates
      await waitFor(() => {
        expect(screen.queryByText('New template')).not.toBeInTheDocument()
      })
    })

    it('should submit with only required title field', async () => {
      api.post.mockResolvedValue({ data: { id: 5 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Minimal Template')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/templates', {
          title: 'Minimal Template',
          description: null,
          contract_type: null,
          jurisdiction: null,
          governing_law: null,
          content: null,
          tags: null,
        })
      })
    })

    it('should disable submit button when title is empty', async () => {
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      expect(submitButton).toBeDisabled()
    })

    it('should disable submit button when title is only whitespace', async () => {
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, '   ')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      expect(submitButton).toBeDisabled()
    })

    it('should parse comma-separated tags correctly', async () => {
      api.post.mockResolvedValue({ data: { id: 5 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Template')

      const tagsInput = screen.getByLabelText('Tags (comma-separated)')
      await user.type(tagsInput, 'Tag1,  Tag2  ,Tag3,  ,Tag4')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/templates', expect.objectContaining({
          tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4'], // Empty strings filtered out
        }))
      })
    })

    it('should handle empty tags string', async () => {
      api.post.mockResolvedValue({ data: { id: 5 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Template')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/templates', expect.objectContaining({
          tags: null,
        }))
      })
    })

    it('should show loading state during submission', async () => {
      api.post.mockImplementation(() => new Promise(() => {})) // Never resolves
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Template')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Creating…')).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      })
    })

    it('should display error message on API failure', async () => {
      api.post.mockRejectedValue({
        response: { data: { detail: 'Template creation failed' } },
      })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Template')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Template creation failed')).toBeInTheDocument()
      })
    })

    it('should display validation errors from API', async () => {
      api.post.mockRejectedValue({
        response: {
          data: {
            detail: [
              { msg: 'Title is required' },
              { msg: 'Invalid jurisdiction' },
            ],
          },
        },
      })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'T')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Title is required, Invalid jurisdiction')).toBeInTheDocument()
      })
    })

    it('should display generic error message when no detail provided', async () => {
      api.post.mockRejectedValue({ response: {} })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Template')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to create template')).toBeInTheDocument()
      })
    })

    it('should reload templates after successful creation', async () => {
      api.post.mockResolvedValue({ data: { id: 5 } })
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      api.get.mockClear()
      await user.click(screen.getByText('+ New template'))

      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Template')

      const submitButton = screen.getByRole('button', { name: 'Create template' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled()
      })
    })
  })

  describe('InstantiateModal', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
    })

    it('should open instantiate modal when "Use template" is clicked', async () => {
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      expect(screen.getByText('Use template: Standard NDA')).toBeInTheDocument()
      expect(screen.getByText(/A new contract in/)).toBeInTheDocument()
    })

    it('should show template content notice when template has content', async () => {
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      expect(screen.getByText(/The template body will be pre-loaded for reviewer editing/)).toBeInTheDocument()
    })

    it('should not show template content notice when template has no content', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[1]], total: 1 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      expect(screen.queryByText(/The template body will be pre-loaded for reviewer editing/)).not.toBeInTheDocument()
    })

    it('should pre-populate form fields with template values', async () => {
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const contractTypeSelect = screen.getByLabelText('Contract type')
      expect(contractTypeSelect).toHaveValue('NDA')

      const jurisdictionSelect = screen.getByLabelText('Jurisdiction')
      expect(jurisdictionSelect).toHaveValue('IN')

      const governingLawInput = screen.getByLabelText('Governing law')
      expect(governingLawInput).toHaveValue('Indian Contract Act, 1872')
    })

    it('should close modal when Cancel button is clicked', async () => {
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))
      expect(screen.getByText('Use template: Standard NDA')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(screen.queryByText('Use template: Standard NDA')).not.toBeInTheDocument()
    })

    it('should close modal when X button is clicked', async () => {
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const modalTitle = screen.getByText('Use template: Standard NDA')
      const closeButton = modalTitle.parentElement.querySelector('button')
      await user.click(closeButton)

      expect(screen.queryByText('Use template: Standard NDA')).not.toBeInTheDocument()
    })

    it('should submit instantiate form with all fields', async () => {
      api.post.mockResolvedValue({ data: { id: 100 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const titleInput = screen.getByLabelText('Contract title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Custom Contract Title')

      const contractTypeSelect = screen.getByLabelText('Contract type')
      await user.selectOptions(contractTypeSelect, 'MSA')

      const jurisdictionSelect = screen.getByLabelText('Jurisdiction')
      await user.selectOptions(jurisdictionSelect, 'US')

      const governingLawInput = screen.getByLabelText('Governing law')
      await user.clear(governingLawInput)
      await user.type(governingLawInput, 'Custom Law')

      const departmentInput = screen.getByLabelText('Department')
      await user.type(departmentInput, 'Engineering')

      const counterpartyNameInput = screen.getByLabelText('Counterparty name')
      await user.type(counterpartyNameInput, 'Acme Corp')

      const counterpartyEmailInput = screen.getByLabelText('Counterparty email')
      await user.type(counterpartyEmailInput, 'contact@acme.com')

      const effectiveDateInput = screen.getByLabelText('Effective date')
      await user.type(effectiveDateInput, '2026-01-01')

      const expiryDateInput = screen.getByLabelText('Expiry date')
      await user.type(expiryDateInput, '2027-01-01')

      const descriptionTextarea = screen.getByLabelText('Description')
      await user.type(descriptionTextarea, 'Contract description')

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/templates/1/instantiate', {
          title: 'Custom Contract Title',
          description: 'Contract description',
          counterparty_name: 'Acme Corp',
          counterparty_email: 'contact@acme.com',
          effective_date: '2026-01-01',
          expiry_date: '2027-01-01',
          department: 'Engineering',
          jurisdiction: 'US',
          governing_law: 'Custom Law',
          contract_type: 'MSA',
        })
      })
    })

    it('should submit with only filled fields', async () => {
      api.post.mockResolvedValue({ data: { id: 100 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const counterpartyNameInput = screen.getByLabelText('Counterparty name')
      await user.type(counterpartyNameInput, 'Acme Corp')

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/templates/1/instantiate', {
          counterparty_name: 'Acme Corp',
          jurisdiction: 'IN', // Pre-populated from template
          governing_law: 'Indian Contract Act, 1872', // Pre-populated from template
          contract_type: 'NDA', // Pre-populated from template
        })
      })
    })

    it('should navigate to created contract after successful submission', async () => {
      api.post.mockResolvedValue({ data: { id: 100 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/contracts/100')
      })
    })

    it('should show loading state during submission', async () => {
      api.post.mockImplementation(() => new Promise(() => {})) // Never resolves
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Creating contract…')).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      })
    })

    it('should display error message on API failure', async () => {
      api.post.mockRejectedValue({
        response: { data: { detail: 'Contract creation failed' } },
      })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Contract creation failed')).toBeInTheDocument()
      })
    })

    it('should display validation errors from API', async () => {
      api.post.mockRejectedValue({
        response: {
          data: {
            detail: [
              { msg: 'Invalid email format' },
              { msg: 'Effective date must be before expiry date' },
            ],
          },
        },
      })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid email format, Effective date must be before expiry date')).toBeInTheDocument()
      })
    })

    it('should display generic error message when no detail provided', async () => {
      api.post.mockRejectedValue({ response: {} })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to create contract')).toBeInTheDocument()
      })
    })

    it('should reload templates after successful contract creation', async () => {
      api.post.mockResolvedValue({ data: { id: 100 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      api.get.mockClear()
      await user.click(screen.getByText('Use template'))

      const submitButton = screen.getByRole('button', { name: 'Create contract' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled()
      })
    })
  })

  describe('Deactivate Template', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      window.confirm = vi.fn()
      window.alert = vi.fn()
    })

    afterEach(() => {
      delete window.confirm
      delete window.alert
    })

    it('should show confirmation dialog when deactivate is clicked', async () => {
      window.confirm.mockReturnValue(false)
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Deactivate'))

      expect(window.confirm).toHaveBeenCalledWith(
        'Deactivate "Standard NDA"? It will no longer be available for new contracts.'
      )
    })

    it('should not deactivate when user cancels confirmation', async () => {
      window.confirm.mockReturnValue(false)
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Deactivate'))

      expect(api.delete).not.toHaveBeenCalled()
    })

    it('should deactivate template when user confirms', async () => {
      window.confirm.mockReturnValue(true)
      api.delete.mockResolvedValue({})
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Deactivate'))

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/templates/1')
      })
    })

    it('should reload templates after successful deactivation', async () => {
      window.confirm.mockReturnValue(true)
      api.delete.mockResolvedValue({})
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })

      api.get.mockClear()
      await user.click(screen.getByText('Deactivate'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled()
      })
    })

    it('should show alert on deactivation failure', async () => {
      window.confirm.mockReturnValue(true)
      api.delete.mockRejectedValue({
        response: { data: { detail: 'Cannot deactivate template' } },
      })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Deactivate'))

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Cannot deactivate template')
      })
    })

    it('should show generic alert on deactivation failure without detail', async () => {
      window.confirm.mockReturnValue(true)
      api.delete.mockRejectedValue({ response: {} })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Deactivate'))

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to deactivate template')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null user gracefully', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      const authValue = { user: null, login: vi.fn(), logout: vi.fn() }

      render(
        <BrowserRouter>
          <AuthContext.Provider value={authValue}>
            <TemplatesPage />
          </AuthContext.Provider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('No templates available.')).toBeInTheDocument()
      })

      expect(screen.queryByText('+ New template')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Show inactive')).not.toBeInTheDocument()
    })

    it('should handle undefined user role', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      const authValue = {
        user: { id: 1, email: 'test@example.com', role: undefined },
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <BrowserRouter>
          <AuthContext.Provider value={authValue}>
            <TemplatesPage />
          </AuthContext.Provider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      expect(screen.queryByText('Use template')).not.toBeInTheDocument()
      expect(screen.queryByText('Deactivate')).not.toBeInTheDocument()
    })

    it('should handle API error during initial load', async () => {
      api.get.mockRejectedValue(new Error('Network error'))
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Component should still render even if API fails
      expect(screen.getByText('Templates')).toBeInTheDocument()
    })

    it('should handle empty response data', async () => {
      api.get.mockResolvedValue({ data: { items: undefined, total: undefined } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should handle template with very long title', async () => {
      const longTitleTemplate = {
        ...mockTemplates[0],
        title: 'A'.repeat(200),
      }
      api.get.mockResolvedValue({ data: { items: [longTitleTemplate], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('A'.repeat(200))).toBeInTheDocument()
      })
    })

    it('should handle template with special characters in title', async () => {
      const specialTemplate = {
        ...mockTemplates[0],
        title: 'Template <>&"\'',
      }
      api.get.mockResolvedValue({ data: { items: [specialTemplate], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Template <>&"\'')).toBeInTheDocument()
      })
    })

    it('should handle multiple rapid filter changes', async () => {
      api.get.mockResolvedValue({ data: { items: mockTemplates.slice(0, 2), total: 2 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')

      // Rapidly change filters
      await user.selectOptions(typeSelect, 'NDA')
      await user.selectOptions(typeSelect, 'MSA')
      await user.selectOptions(typeSelect, 'SLA')

      // Should eventually settle on the last selection
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('contract_type=SLA'))
      })
    })

    it('should handle template with empty string values', async () => {
      const emptyStringTemplate = {
        id: 5,
        title: 'Empty Values Template',
        description: '',
        contract_type: '',
        jurisdiction: '',
        governing_law: '',
        is_active: true,
        tags: [],
        content: '',
      }
      api.get.mockResolvedValue({ data: { items: [emptyStringTemplate], total: 1 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByText('Empty Values Template')).toBeInTheDocument()
      })
    })

    it('should not show "Use template" button for inactive templates', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[2]], total: 1 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Inactive Template')).toBeInTheDocument()
      })

      expect(screen.queryByText('Use template')).not.toBeInTheDocument()
    })

    it('should not show "Deactivate" button for inactive templates', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[2]], total: 1 } })
      renderWithAuth('admin')

      // Enable inactive templates
      const checkbox = await screen.findByLabelText('Show inactive')
      await user.click(checkbox)

      await waitFor(() => {
        expect(screen.getByText('Inactive Template')).toBeInTheDocument()
      })

      expect(screen.queryByText('Deactivate')).not.toBeInTheDocument()
    })

    it('should handle all contract types in filter', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })

      const typeSelect = screen.getByDisplayValue('All types')
      const options = Array.from(typeSelect.options).map(o => o.value)

      expect(options).toContain('NDA')
      expect(options).toContain('MSA')
      expect(options).toContain('SLA')
      expect(options).toContain('SOW')
      expect(options).toContain('Employment')
      expect(options).toContain('Vendor')
      expect(options).toContain('Partnership')
      expect(options).toContain('Other')
    })

    it('should handle all jurisdictions in filter', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('viewer')

      await waitFor(() => {
        expect(screen.getByDisplayValue('All jurisdictions')).toBeInTheDocument()
      })

      const jurisdictionSelect = screen.getByDisplayValue('All jurisdictions')
      const options = Array.from(jurisdictionSelect.options).map(o => o.value)

      expect(options).toContain('IN')
      expect(options).toContain('EU')
      expect(options).toContain('US')
      expect(options).toContain('APAC')
      expect(options).toContain('GLOBAL')
    })

    it('should handle form with undefined template values in instantiate modal', async () => {
      const templateWithUndefined = {
        ...mockTemplates[0],
        contract_type: undefined,
        jurisdiction: undefined,
        governing_law: undefined,
      }
      api.get.mockResolvedValue({ data: { items: [templateWithUndefined], total: 1 } })
      api.post.mockResolvedValue({ data: { id: 100 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      const contractTypeSelect = screen.getByLabelText('Contract type')
      expect(contractTypeSelect).toHaveValue('')

      const jurisdictionSelect = screen.getByLabelText('Jurisdiction')
      expect(jurisdictionSelect).toHaveValue('')

      const governingLawInput = screen.getByLabelText('Governing law')
      expect(governingLawInput).toHaveValue('')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels in create modal', async () => {
      api.get.mockResolvedValue({ data: { items: [], total: 0 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('+ New template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('+ New template'))

      expect(screen.getByLabelText('Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Contract type')).toBeInTheDocument()
      expect(screen.getByLabelText('Jurisdiction')).toBeInTheDocument()
      expect(screen.getByLabelText('Governing law')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Template body (plain text)')).toBeInTheDocument()
      expect(screen.getByLabelText('Tags (comma-separated)')).toBeInTheDocument()
    })

    it('should have proper form labels in instantiate modal', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('editor')

      await waitFor(() => {
        expect(screen.getByText('Use template')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Use template'))

      expect(screen.getByLabelText('Contract title')).toBeInTheDocument()
      expect(screen.getByLabelText('Contract type')).toBeInTheDocument()
      expect(screen.getByLabelText('Jurisdiction')).toBeInTheDocument()
      expect(screen.getByLabelText('Governing law')).toBeInTheDocument()
      expect(screen.getByLabelText('Department')).toBeInTheDocument()
      expect(screen.getByLabelText('Counterparty name')).toBeInTheDocument()
      expect(screen.getByLabelText('Counterparty email')).toBeInTheDocument()
      expect(screen.getByLabelText('Effective date')).toBeInTheDocument()
      expect(screen.getByLabelText('Expiry date')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    it('should have accessible button roles', async () => {
      api.get.mockResolvedValue({ data: { items: [mockTemplates[0]], total: 1 } })
      renderWithAuth('admin')

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: '+ New template' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Use template' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
    })
  })
})
