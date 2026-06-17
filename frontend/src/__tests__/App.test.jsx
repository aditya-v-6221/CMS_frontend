import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock child components to simplify testing
jest.mock('../components/Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>
  }
})

jest.mock('../pages/LoginPage', () => {
  return function MockLoginPage() {
    return <div data-testid="login-page">Login Page</div>
  }
})

jest.mock('../pages/RegisterPage', () => {
  return function MockRegisterPage() {
    return <div data-testid="register-page">Register Page</div>
  }
})

jest.mock('../pages/DashboardPage', () => {
  return function MockDashboardPage() {
    return <div data-testid="dashboard-page">Dashboard Page</div>
  }
})

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('Routing', () => {
    it('should render without crashing', () => {
      render(<App />)
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should wrap application with AuthProvider', () => {
      render(<App />)
      // The app should render, proving AuthProvider is wrapping correctly
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should use BrowserRouter for routing', () => {
      render(<App />)
      // Rendering succeeds, proving BrowserRouter is present
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  describe('Protected routes', () => {
    it('should redirect to login when user is not authenticated', () => {
      localStorage.getItem.mockReturnValue(null)

      render(<App />)

      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should allow access to dashboard when user is authenticated', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'test@example.com', role: 'viewer' }))

      render(<App />)

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
  })

  describe('Layout component', () => {
    it('should render Sidebar and children in Layout', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'test@example.com', role: 'viewer' }))

      render(<App />)

      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })
  })

  describe('Public routes', () => {
    it('should allow access to login page without authentication', () => {
      localStorage.getItem.mockReturnValue(null)
      window.history.pushState({}, 'Login', '/login')

      render(<App />)

      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })
})
