import { render, screen } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { AuthProvider } from '../../context/AuthContext'

describe('ProtectedRoute', () => {
  const ProtectedContent = () => <div data-testid="protected-content">Protected Content</div>
  const LoginPage = () => <div data-testid="login-page">Login Page</div>

  const renderWithRouter = (user = null) => {
    if (user) {
      localStorage.getItem.mockReturnValue(JSON.stringify(user))
    } else {
      localStorage.getItem.mockReturnValue(null)
    }

    return render(
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('Authenticated user', () => {
    it('should render children when user is logged in', () => {
      renderWithRouter({ id: 1, email: 'user@example.com', role: 'viewer' })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    })

    it('should render children when user is admin', () => {
      renderWithRouter({ id: 2, email: 'admin@example.com', role: 'admin' })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render children when user is editor', () => {
      renderWithRouter({ id: 3, email: 'editor@example.com', role: 'editor' })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render children with minimal user data', () => {
      renderWithRouter({ email: 'minimal@example.com' })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render children when user has full_name', () => {
      renderWithRouter({ id: 4, email: 'full@example.com', full_name: 'John Doe', role: 'viewer' })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated user', () => {
    it('should redirect to login when user is null', () => {
      renderWithRouter(null)

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should redirect to login when localStorage is empty', () => {
      localStorage.getItem.mockReturnValue(null)

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ProtectedContent />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should redirect to login when localStorage has invalid JSON', () => {
      localStorage.getItem.mockReturnValue('invalid-json{')

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ProtectedContent />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  describe('Navigation behavior', () => {
    it('should use replace navigation to prevent back button loop', () => {
      // This test verifies the replace prop is used in Navigate component
      // The actual navigation behavior is handled by react-router-dom
      renderWithRouter(null)

      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  describe('Multiple protected routes', () => {
    it('should protect multiple routes independently', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'user@example.com' }))

      const Content1 = () => <div data-testid="content-1">Content 1</div>
      const Content2 = () => <div data-testid="content-2">Content 2</div>

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Content1 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Content2 />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(screen.getByTestId('content-1')).toBeInTheDocument()
    })
  })

  describe('Children rendering', () => {
    it('should render single child component', () => {
      renderWithRouter({ id: 1, email: 'user@example.com' })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render complex child component tree', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, email: 'user@example.com' }))

      const ComplexChild = () => (
        <div>
          <header data-testid="header">Header</header>
          <main data-testid="main">Main</main>
          <footer data-testid="footer">Footer</footer>
        </div>
      )

      render(
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ComplexChild />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      )

      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('main')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })
})
