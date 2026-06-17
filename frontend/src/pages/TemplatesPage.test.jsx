import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TemplatesPage from './TemplatesPage'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client')

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderTemplatesPage(user = null) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  return render(
    <AuthProvider>
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('TemplatesPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
    window.alert = vi.fn()
  })

  describe('rendering', () => {
    it('should render templates page header', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Templates')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      api.get.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { total: 0, items: [] } }), 100))
      )

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should display template count', async () => {
      api.get.mockResolvedValue({
        data: { total: 5, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('(5)')).toBeInTheDocument()
      })
    })

    it('should render filter dropdowns', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: '' })).toBeInTheDocument()
      })

      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('admin-specific features', () => {
    it('should show New template button for admin', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument()
      })
    })

    it('should not show New template button for editor', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /new template/i })).not.toBeInTheDocument()
      })
    })

    it('should not show New template button for reviewer', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'reviewer@test.com', role: 'reviewer' })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /new template/i })).not.toBeInTheDocument()
      })
    })

    it('should not show New template button for viewer', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /new template/i })).not.toBeInTheDocument()
      })
    })

    it('should show inactive checkbox for admin', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByLabelText('Show inactive')).toBeInTheDocument()
      })
    })

    it('should not show inactive checkbox for non-admin', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        expect(screen.queryByLabelText('Show inactive')).not.toBeInTheDocument()
      })
    })
  })

  describe('loading templates', () => {
    it('should load templates on mount', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 2,
          items: [
            { id: 1, title: 'Template 1', is_active: true },
            { id: 2, title: 'Template 2', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?limit=100')
      })
    })

    it('should display templates', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 2,
          items: [
            { id: 1, title: 'Standard NDA', is_active: true, contract_type: 'NDA', jurisdiction: 'US' },
            { id: 2, title: 'MSA Template', is_active: true, contract_type: 'MSA', jurisdiction: 'EU' },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Standard NDA')).toBeInTheDocument()
        expect(screen.getByText('MSA Template')).toBeInTheDocument()
      })
    })

    it('should display no templates message when list is empty', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('No templates available.')).toBeInTheDocument()
      })
    })

    it('should display admin-specific empty message for admin', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByText('No templates yet. Create one with the button above.')).toBeInTheDocument()
      })
    })
  })

  describe('filtering templates', () => {
    it('should filter by contract type', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
      })

      const typeSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(typeSelect, 'NDA')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?contract_type=NDA&limit=100')
      })
    })

    it('should filter by jurisdiction', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
      })

      const jurisdictionSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(jurisdictionSelect, 'US')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?jurisdiction=US&limit=100')
      })
    })

    it('should filter by both type and jurisdiction', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
      })

      await user.selectOptions(screen.getAllByRole('combobox')[0], 'NDA')
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'US')

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?contract_type=NDA&jurisdiction=US&limit=100')
      })
    })

    it('should include inactive when checkbox is checked by admin', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      const user = userEvent.setup()
      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByLabelText('Show inactive')).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText('Show inactive'))

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/templates?include_inactive=true&limit=100')
      })
    })
  })

  describe('template display', () => {
    it('should display template metadata', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'NDA Template',
              description: 'Standard NDA for US',
              contract_type: 'NDA',
              jurisdiction: 'US',
              governing_law: 'US Federal Law',
              is_active: true,
            },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('NDA Template')).toBeInTheDocument()
        expect(screen.getByText('Standard NDA for US')).toBeInTheDocument()
        expect(screen.getByText('NDA')).toBeInTheDocument()
        expect(screen.getByText('US')).toBeInTheDocument()
        expect(screen.getByText(/US Federal Law/)).toBeInTheDocument()
      })
    })

    it('should display tags', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'NDA Template',
              is_active: true,
              tags: ['Pre-approved', 'Short-form'],
            },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('Pre-approved')).toBeInTheDocument()
        expect(screen.getByText('Short-form')).toBeInTheDocument()
      })
    })

    it('should display inactive badge for inactive templates', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Old Template',
              is_active: false,
            },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await user.click(screen.getByLabelText('Show inactive'))

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument()
      })
    })

    it('should display template content preview', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 1,
              title: 'Template',
              is_active: true,
              content: 'This is the template body content that will be shown as preview',
            },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText(/This is the template body content/)).toBeInTheDocument()
      })
    })
  })

  describe('use template - editor and admin', () => {
    it('should show Use template button for editor on active templates', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Template 1', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use template/i })).toBeInTheDocument()
      })
    })

    it('should show Use template button for admin on active templates', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Template 1', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use template/i })).toBeInTheDocument()
      })
    })

    it('should not show Use template button for reviewer', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Template 1', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'reviewer@test.com', role: 'reviewer' })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /use template/i })).not.toBeInTheDocument()
      })
    })

    it('should not show Use template button for viewer', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Template 1', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'viewer@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /use template/i })).not.toBeInTheDocument()
      })
    })

    it('should open instantiate modal when Use template is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Test Template', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use template/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /use template/i }))

      expect(screen.getByText('Use template: Test Template')).toBeInTheDocument()
    })
  })

  describe('deactivate template - admin only', () => {
    it('should show Deactivate button for admin on active templates', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Template 1', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
      })
    })

    it('should not show Deactivate button for non-admin', async () => {
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Template 1', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'editor@test.com', role: 'editor' })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument()
      })
    })

    it('should confirm before deactivating', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Test Template', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /deactivate/i }))

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Deactivate "Test Template"?')
      )
    })

    it('should call delete API and reload when confirmed', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Test Template', is_active: true },
          ],
        },
      })
      api.delete.mockResolvedValue({})

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /deactivate/i }))

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/templates/1')
      })
    })

    it('should not deactivate when cancelled', async () => {
      const user = userEvent.setup()
      window.confirm = vi.fn(() => false)
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Test Template', is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /deactivate/i }))

      expect(api.delete).not.toHaveBeenCalled()
    })

    it('should show alert on deactivate error', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: 'Test Template', is_active: true },
          ],
        },
      })
      api.delete.mockRejectedValue({
        response: { data: { detail: 'Cannot deactivate' } },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /deactivate/i }))

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Cannot deactivate')
      })
    })
  })

  describe('create template modal - admin only', () => {
    it('should open modal when New template is clicked', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /new template/i }))

      expect(screen.getByText('New template')).toBeInTheDocument()
    })

    it('should submit create template form', async () => {
      const user = userEvent.setup()
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })
      api.post.mockResolvedValue({ data: { id: 1 } })

      renderTemplatesPage({ id: 1, email: 'admin@test.com', role: 'admin' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /new template/i }))

      const modal = screen.getByText('New template').closest('div').parentElement
      const titleInput = within(modal).getByPlaceholderText(/e.g. Standard NDA/)
      await user.type(titleInput, 'New Template')

      await user.click(within(modal).getByRole('button', { name: /create template/i }))

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/templates', expect.objectContaining({
          title: 'New Template',
        }))
      })
    })
  })

  describe('boundary values', () => {
    it('should handle very long template title', async () => {
      const longTitle = 'A'.repeat(500)
      api.get.mockResolvedValue({
        data: {
          total: 1,
          items: [
            { id: 1, title: longTitle, is_active: true },
          ],
        },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText(longTitle)).toBeInTheDocument()
      })
    })

    it('should handle zero templates', async () => {
      api.get.mockResolvedValue({
        data: { total: 0, items: [] },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('(0)')).toBeInTheDocument()
      })
    })

    it('should handle large number of templates', async () => {
      const templates = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Template ${i + 1}`,
        is_active: true,
      }))

      api.get.mockResolvedValue({
        data: { total: 100, items: templates },
      })

      renderTemplatesPage({ id: 1, email: 'test@test.com', role: 'viewer' })

      await waitFor(() => {
        expect(screen.getByText('(100)')).toBeInTheDocument()
      })
    })
  })

  describe('equivalence partitioning', () => {
    const roles = [
      { role: 'admin', canCreate: true, canInstantiate: true, canDeactivate: true },
      { role: 'editor', canCreate: false, canInstantiate: true, canDeactivate: false },
      { role: 'reviewer', canCreate: false, canInstantiate: false, canDeactivate: false },
      { role: 'viewer', canCreate: false, canInstantiate: false, canDeactivate: false },
    ]

    roles.forEach(({ role, canCreate, canInstantiate, canDeactivate }) => {
      it(`should show correct actions for ${role}`, async () => {
        api.get.mockResolvedValue({
          data: {
            total: 1,
            items: [
              { id: 1, title: 'Template 1', is_active: true },
            ],
          },
        })

        renderTemplatesPage({ id: 1, email: `${role}@test.com`, role })

        await waitFor(() => {
          expect(screen.getByText('Template 1')).toBeInTheDocument()
        })

        if (canCreate) {
          expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument()
        } else {
          expect(screen.queryByRole('button', { name: /new template/i })).not.toBeInTheDocument()
        }

        if (canInstantiate) {
          expect(screen.getByRole('button', { name: /use template/i })).toBeInTheDocument()
        } else {
          expect(screen.queryByRole('button', { name: /use template/i })).not.toBeInTheDocument()
        }

        if (canDeactivate) {
          expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
        } else {
          expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument()
        }
      })
    })
  })
})
