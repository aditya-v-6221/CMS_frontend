import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { AuthProvider } from '../../context/AuthContext'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('Sidebar', () => {
  const renderSidebar = (user = null) => {
    if (user) {
      localStorage.getItem.mockReturnValue(JSON.stringify(user))
    } else {
      localStorage.getItem.mockReturnValue(null)
    }

    return render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Brand section', () => {
    it('should display ContractFlow brand', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
    })

    it('should display user email when full_name is not available', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      expect(screen.getAllByText('user@example.com')[0]).toBeInTheDocument()
    })

    it('should display user full_name when available', () => {
      renderSidebar({ id: 1, email: 'user@example.com', full_name: 'John Doe', role: 'viewer' })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Navigation items', () => {
    it('should render Dashboard link for all users', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
      expect(dashboardLink).toBeInTheDocument()
      expect(dashboardLink).toHaveAttribute('href', '/')
    })

    it('should render Templates link for all users', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const templatesLink = screen.getByRole('link', { name: /Templates/i })
      expect(templatesLink).toBeInTheDocument()
      expect(templatesLink).toHaveAttribute('href', '/templates')
    })

    it('should render Search link for all users', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const searchLink = screen.getByRole('link', { name: /Search/i })
      expect(searchLink).toBeInTheDocument()
      expect(searchLink).toHaveAttribute('href', '/search')
    })
  })

  describe('Role-based navigation - Upload Contract', () => {
    it('should show Upload Contract for editor users', () => {
      renderSidebar({ id: 1, email: 'editor@example.com', role: 'editor' })

      const uploadLink = screen.getByRole('link', { name: /Upload Contract/i })
      expect(uploadLink).toBeInTheDocument()
      expect(uploadLink).toHaveAttribute('href', '/contracts/upload')
    })

    it('should show Upload Contract for admin users', () => {
      renderSidebar({ id: 1, email: 'admin@example.com', role: 'admin' })

      const uploadLink = screen.getByRole('link', { name: /Upload Contract/i })
      expect(uploadLink).toBeInTheDocument()
    })

    it('should not show Upload Contract for viewer users', () => {
      renderSidebar({ id: 1, email: 'viewer@example.com', role: 'viewer' })

      const uploadLink = screen.queryByRole('link', { name: /Upload Contract/i })
      expect(uploadLink).not.toBeInTheDocument()
    })
  })

  describe('Role-based navigation - Admin only', () => {
    it('should show Deadline Tracker for admin users', () => {
      renderSidebar({ id: 1, email: 'admin@example.com', role: 'admin' })

      const deadlineLink = screen.getByRole('link', { name: /Deadline Tracker/i })
      expect(deadlineLink).toBeInTheDocument()
      expect(deadlineLink).toHaveAttribute('href', '/deadlines')
    })

    it('should show Audit for admin users', () => {
      renderSidebar({ id: 1, email: 'admin@example.com', role: 'admin' })

      const auditLink = screen.getByRole('link', { name: /Audit/i })
      expect(auditLink).toBeInTheDocument()
      expect(auditLink).toHaveAttribute('href', '/audit')
    })

    it('should not show Deadline Tracker for editor users', () => {
      renderSidebar({ id: 1, email: 'editor@example.com', role: 'editor' })

      const deadlineLink = screen.queryByRole('link', { name: /Deadline Tracker/i })
      expect(deadlineLink).not.toBeInTheDocument()
    })

    it('should not show Audit for editor users', () => {
      renderSidebar({ id: 1, email: 'editor@example.com', role: 'editor' })

      const auditLink = screen.queryByRole('link', { name: /Audit/i })
      expect(auditLink).not.toBeInTheDocument()
    })

    it('should not show Deadline Tracker for viewer users', () => {
      renderSidebar({ id: 1, email: 'viewer@example.com', role: 'viewer' })

      const deadlineLink = screen.queryByRole('link', { name: /Deadline Tracker/i })
      expect(deadlineLink).not.toBeInTheDocument()
    })

    it('should not show Audit for viewer users', () => {
      renderSidebar({ id: 1, email: 'viewer@example.com', role: 'viewer' })

      const auditLink = screen.queryByRole('link', { name: /Audit/i })
      expect(auditLink).not.toBeInTheDocument()
    })
  })

  describe('User information footer', () => {
    it('should display user email in footer', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const emailElements = screen.getAllByText('user@example.com')
      expect(emailElements.length).toBeGreaterThan(0)
    })

    it('should display user full_name in footer when available', () => {
      renderSidebar({ id: 1, email: 'user@example.com', full_name: 'Jane Smith', role: 'admin' })

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should display user role badge', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'editor' })

      expect(screen.getByText('editor')).toBeInTheDocument()
    })

    it('should render sign out button', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const signOutButton = screen.getByRole('button', { name: /Sign out/i })
      expect(signOutButton).toBeInTheDocument()
    })
  })

  describe('Sign out functionality', () => {
    it('should call logout and navigate to login on sign out click', async () => {
      const user = userEvent.setup()
      renderSidebar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const signOutButton = screen.getByRole('button', { name: /Sign out/i })
      await user.click(signOutButton)

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Active navigation state', () => {
    it('should highlight active navigation item', () => {
      renderSidebar({ id: 1, email: 'user@example.com', role: 'admin' })

      const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
      expect(dashboardLink).toHaveClass('bg-indigo-50', 'text-indigo-700')
    })
  })

  describe('Boundary cases', () => {
    it('should handle null user gracefully', () => {
      renderSidebar(null)

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Sign out/i })).toBeInTheDocument()
    })

    it('should handle user without role', () => {
      renderSidebar({ id: 1, email: 'user@example.com' })

      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Upload Contract/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Audit/i })).not.toBeInTheDocument()
    })

    it('should handle empty email', () => {
      renderSidebar({ id: 1, email: '', role: 'viewer' })

      expect(screen.getByText('ContractFlow')).toBeInTheDocument()
    })
  })

  describe('Navigation visibility by role combinations', () => {
    it('should show correct items for admin user', () => {
      renderSidebar({ id: 1, email: 'admin@example.com', role: 'admin' })

      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Upload Contract/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Templates/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Search/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Deadline Tracker/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Audit/i })).toBeInTheDocument()
    })

    it('should show correct items for editor user', () => {
      renderSidebar({ id: 1, email: 'editor@example.com', role: 'editor' })

      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Upload Contract/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Templates/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Search/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Deadline Tracker/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Audit/i })).not.toBeInTheDocument()
    })

    it('should show correct items for viewer user', () => {
      renderSidebar({ id: 1, email: 'viewer@example.com', role: 'viewer' })

      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Upload Contract/i })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Templates/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Search/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Deadline Tracker/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Audit/i })).not.toBeInTheDocument()
    })
  })
})
