import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: vi.fn()
}))

vi.mock('./components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}))

vi.mock('./components/ProtectedRoute', () => ({
  default: ({ children }) => <div data-testid="protected-route">{children}</div>
}))

vi.mock('./pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>
}))

vi.mock('./pages/RegisterPage', () => ({
  default: () => <div data-testid="register-page">Register Page</div>
}))

vi.mock('./pages/DashboardPage', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}))

vi.mock('./pages/ContractsPage', () => ({
  default: () => <div data-testid="contracts-page">Contracts Page</div>
}))

vi.mock('./pages/ContractDetailPage', () => ({
  default: () => <div data-testid="contract-detail-page">Contract Detail Page</div>
}))

vi.mock('./pages/UploadPage', () => ({
  default: () => <div data-testid="upload-page">Upload Page</div>
}))

vi.mock('./pages/SearchPage', () => ({
  default: () => <div data-testid="search-page">Search Page</div>
}))

vi.mock('./pages/AuditPage', () => ({
  default: () => <div data-testid="audit-page">Audit Page</div>
}))

vi.mock('./pages/TemplatesPage', () => ({
  default: () => <div data-testid="templates-page">Templates Page</div>
}))

vi.mock('./pages/DeadlineTrackerPage', () => ({
  default: () => <div data-testid="deadline-tracker-page">Deadline Tracker Page</div>
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('routing structure', () => {
    it('should wrap application with AuthProvider', () => {
      render(<App />)
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    })

    it('should render LoginPage at /login route', () => {
      window.history.pushState({}, '', '/login')
      render(<App />)
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should render RegisterPage at /register route', () => {
      window.history.pushState({}, '', '/register')
      render(<App />)
      expect(screen.getByTestId('register-page')).toBeInTheDocument()
    })

    it('should not show Sidebar on login page', () => {
      window.history.pushState({}, '', '/login')
      render(<App />)
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    })

    it('should not show Sidebar on register page', () => {
      window.history.pushState({}, '', '/register')
      render(<App />)
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    })
  })

  describe('protected routes', () => {
    it('should wrap dashboard with ProtectedRoute', () => {
      window.history.pushState({}, '', '/')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    it('should wrap contracts page with ProtectedRoute', () => {
      window.history.pushState({}, '', '/contracts')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('contracts-page')).toBeInTheDocument()
    })

    it('should wrap upload page with ProtectedRoute', () => {
      window.history.pushState({}, '', '/contracts/upload')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('upload-page')).toBeInTheDocument()
    })

    it('should wrap search page with ProtectedRoute', () => {
      window.history.pushState({}, '', '/search')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('search-page')).toBeInTheDocument()
    })

    it('should wrap audit page with ProtectedRoute', () => {
      window.history.pushState({}, '', '/audit')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('audit-page')).toBeInTheDocument()
    })

    it('should wrap deadlines page with ProtectedRoute', () => {
      window.history.pushState({}, '', '/deadlines')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('deadline-tracker-page')).toBeInTheDocument()
    })

    it('should wrap templates page with ProtectedRoute', () => {
      window.history.pushState({}, '', '/templates')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('templates-page')).toBeInTheDocument()
    })

    it('should wrap contract detail page with ProtectedRoute', () => {
      window.history.pushState({}, '', '/contracts/123')
      render(<App />)
      expect(screen.getByTestId('protected-route')).toBeInTheDocument()
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument()
    })
  })

  describe('layout rendering', () => {
    it('should render Sidebar within Layout for protected routes', () => {
      window.history.pushState({}, '', '/')
      render(<App />)
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })

    it('should render main content area within Layout', () => {
      window.history.pushState({}, '', '/')
      const { container } = render(<App />)
      const main = container.querySelector('main')
      expect(main).toBeInTheDocument()
      expect(main).toHaveClass('flex-1', 'overflow-auto')
    })

    it('should apply layout structure with flex display', () => {
      window.history.pushState({}, '', '/')
      const { container } = render(<App />)
      const layoutDiv = container.querySelector('.min-h-screen.bg-gray-50.flex')
      expect(layoutDiv).toBeInTheDocument()
    })
  })

  describe('route matching', () => {
    it('should render DashboardPage at / route', () => {
      window.history.pushState({}, '', '/')
      render(<App />)
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    it('should render ContractsPage at /contracts route', () => {
      window.history.pushState({}, '', '/contracts')
      render(<App />)
      expect(screen.getByTestId('contracts-page')).toBeInTheDocument()
    })

    it('should render UploadPage at /contracts/upload route', () => {
      window.history.pushState({}, '', '/contracts/upload')
      render(<App />)
      expect(screen.getByTestId('upload-page')).toBeInTheDocument()
    })

    it('should render ContractDetailPage at /contracts/:id route', () => {
      window.history.pushState({}, '', '/contracts/123')
      render(<App />)
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument()
    })

    it('should render SearchPage at /search route', () => {
      window.history.pushState({}, '', '/search')
      render(<App />)
      expect(screen.getByTestId('search-page')).toBeInTheDocument()
    })

    it('should render AuditPage at /audit route', () => {
      window.history.pushState({}, '', '/audit')
      render(<App />)
      expect(screen.getByTestId('audit-page')).toBeInTheDocument()
    })

    it('should render DeadlineTrackerPage at /deadlines route', () => {
      window.history.pushState({}, '', '/deadlines')
      render(<App />)
      expect(screen.getByTestId('deadline-tracker-page')).toBeInTheDocument()
    })

    it('should render TemplatesPage at /templates route', () => {
      window.history.pushState({}, '', '/templates')
      render(<App />)
      expect(screen.getByTestId('templates-page')).toBeInTheDocument()
    })
  })

  describe('wildcard routing', () => {
    it('should handle unknown routes', () => {
      window.history.pushState({}, '', '/unknown-route')
      render(<App />)
      // Should redirect to / which renders dashboard
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    it('should handle deeply nested unknown routes', () => {
      window.history.pushState({}, '', '/unknown/nested/route')
      render(<App />)
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    it('should handle routes with special characters', () => {
      window.history.pushState({}, '', '/route@#$%')
      render(<App />)
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty route', () => {
      window.history.pushState({}, '', '')
      render(<App />)
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    it('should handle route with query parameters', () => {
      window.history.pushState({}, '', '/contracts?page=2&status=draft')
      render(<App />)
      expect(screen.getByTestId('contracts-page')).toBeInTheDocument()
    })

    it('should handle route with hash', () => {
      window.history.pushState({}, '', '/contracts#section')
      render(<App />)
      expect(screen.getByTestId('contracts-page')).toBeInTheDocument()
    })

    it('should handle contract detail with numeric ID', () => {
      window.history.pushState({}, '', '/contracts/999')
      render(<App />)
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument()
    })

    it('should handle contract detail with UUID-like ID', () => {
      window.history.pushState({}, '', '/contracts/abc-123-def-456')
      render(<App />)
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument()
    })
  })

  describe('Layout component', () => {
    it('should render children within Layout', () => {
      const Layout = ({ children }) => (
        <div className="min-h-screen bg-gray-50 flex">
          <div data-testid="sidebar">Sidebar</div>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      )

      const { container } = render(
        <Layout>
          <div data-testid="test-child">Test Content</div>
        </Layout>
      )

      expect(screen.getByTestId('test-child')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })

    it('should apply correct styling classes to Layout', () => {
      window.history.pushState({}, '', '/')
      const { container } = render(<App />)

      const layoutContainer = container.querySelector('.min-h-screen.bg-gray-50.flex')
      expect(layoutContainer).toBeInTheDocument()
    })

    it('should apply correct styling to main element', () => {
      window.history.pushState({}, '', '/')
      const { container } = render(<App />)

      const mainElement = container.querySelector('main')
      expect(mainElement).toHaveClass('flex-1', 'overflow-auto')
    })
  })
})
