import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { AuthProvider } from '../../context/AuthContext'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

describe('Navbar', () => {
  const renderNavbar = (user = null) => {
    if (user) {
      localStorage.getItem.mockReturnValue(JSON.stringify(user))
    } else {
      localStorage.getItem.mockReturnValue(null)
    }

    return render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Brand and navigation links', () => {
    it('should render CMS brand link', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const brandLink = screen.getByRole('link', { name: 'CMS' })
      expect(brandLink).toBeInTheDocument()
      expect(brandLink).toHaveAttribute('href', '/')
    })

    it('should render Contracts navigation link', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const contractsLink = screen.getByRole('link', { name: 'Contracts' })
      expect(contractsLink).toBeInTheDocument()
      expect(contractsLink).toHaveAttribute('href', '/contracts')
    })

    it('should render Search navigation link', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const searchLink = screen.getByRole('link', { name: 'Search' })
      expect(searchLink).toBeInTheDocument()
      expect(searchLink).toHaveAttribute('href', '/search')
    })

    it('should render Templates navigation link', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const templatesLink = screen.getByRole('link', { name: 'Templates' })
      expect(templatesLink).toBeInTheDocument()
      expect(templatesLink).toHaveAttribute('href', '/templates')
    })
  })

  describe('Admin-only navigation', () => {
    it('should show Audit link for admin users', () => {
      renderNavbar({ id: 1, email: 'admin@example.com', role: 'admin' })

      const auditLink = screen.getByRole('link', { name: 'Audit' })
      expect(auditLink).toBeInTheDocument()
      expect(auditLink).toHaveAttribute('href', '/audit')
    })

    it('should not show Audit link for viewer users', () => {
      renderNavbar({ id: 1, email: 'viewer@example.com', role: 'viewer' })

      const auditLink = screen.queryByRole('link', { name: 'Audit' })
      expect(auditLink).not.toBeInTheDocument()
    })

    it('should not show Audit link for editor users', () => {
      renderNavbar({ id: 1, email: 'editor@example.com', role: 'editor' })

      const auditLink = screen.queryByRole('link', { name: 'Audit' })
      expect(auditLink).not.toBeInTheDocument()
    })

    it('should not show Audit link when role is undefined', () => {
      renderNavbar({ id: 1, email: 'user@example.com' })

      const auditLink = screen.queryByRole('link', { name: 'Audit' })
      expect(auditLink).not.toBeInTheDocument()
    })
  })

  describe('User information display', () => {
    it('should display full_name when available', () => {
      renderNavbar({ id: 1, email: 'user@example.com', full_name: 'John Doe', role: 'viewer' })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display email when full_name is not available', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })

    it('should display email when full_name is empty string', () => {
      renderNavbar({ id: 1, email: 'user@example.com', full_name: '', role: 'viewer' })

      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })

    it('should display user role badge', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'editor' })

      expect(screen.getByText('editor')).toBeInTheDocument()
    })

    it('should handle undefined role', () => {
      renderNavbar({ id: 1, email: 'user@example.com' })

      expect(screen.queryByText('undefined')).toBeInTheDocument()
    })
  })

  describe('Sign out functionality', () => {
    it('should call logout and navigate to login on sign out click', async () => {
      const user = userEvent.setup()
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const signOutButton = screen.getByRole('button', { name: 'Sign out' })
      await user.click(signOutButton)

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should display Sign out button', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const signOutButton = screen.getByRole('button', { name: 'Sign out' })
      expect(signOutButton).toBeInTheDocument()
    })
  })

  describe('CSS styling', () => {
    it('should apply correct styling to nav element', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('bg-white', 'border-b', 'border-gray-200', 'px-6', 'py-3')
    })

    it('should apply indigo color to CMS brand', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const brandLink = screen.getByRole('link', { name: 'CMS' })
      expect(brandLink).toHaveClass('text-indigo-600')
    })

    it('should apply role badge styling', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'admin' })

      const roleBadge = screen.getByText('admin')
      expect(roleBadge).toHaveClass('bg-indigo-50', 'text-indigo-700', 'rounded-full')
    })
  })

  describe('Role-specific scenarios', () => {
    it('should render correctly for admin with full_name', () => {
      renderNavbar({ id: 1, email: 'admin@example.com', full_name: 'Admin User', role: 'admin' })

      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Audit' })).toBeInTheDocument()
    })

    it('should render correctly for editor without full_name', () => {
      renderNavbar({ id: 2, email: 'editor@example.com', role: 'editor' })

      expect(screen.getByText('editor@example.com')).toBeInTheDocument()
      expect(screen.getByText('editor')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Audit' })).not.toBeInTheDocument()
    })

    it('should render correctly for viewer', () => {
      renderNavbar({ id: 3, email: 'viewer@example.com', role: 'viewer' })

      expect(screen.getByText('viewer@example.com')).toBeInTheDocument()
      expect(screen.getByText('viewer')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Audit' })).not.toBeInTheDocument()
    })
  })

  describe('Navigation links accessibility', () => {
    it('should have proper hover states on navigation links', () => {
      renderNavbar({ id: 1, email: 'user@example.com', role: 'viewer' })

      const contractsLink = screen.getByRole('link', { name: 'Contracts' })
      expect(contractsLink).toHaveClass('hover:text-gray-900')
    })
  })

  describe('Null user handling', () => {
    it('should handle rendering when user is null', () => {
      renderNavbar(null)

      expect(screen.getByRole('link', { name: 'CMS' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    })
  })
})
