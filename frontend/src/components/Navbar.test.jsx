import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Navbar from './Navbar'
import { AuthProvider } from '../context/AuthContext'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderNavbar = (user) => {
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

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('branding and navigation links', () => {
    it('should render CMS logo link', () => {
      const user = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('CMS')).toBeTruthy()
    })

    it('should render Contracts link', () => {
      const user = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('Contracts')).toBeTruthy()
    })

    it('should render Search link', () => {
      const user = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('Search')).toBeTruthy()
    })

    it('should render Templates link', () => {
      const user = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('Templates')).toBeTruthy()
    })

    it('should not render Audit link for non-admin user', () => {
      const user = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })

    it('should render Audit link for admin user', () => {
      const user = { id: 1, email: 'admin@test.com', role: 'admin' }
      renderNavbar(user)

      expect(screen.getByText('Audit')).toBeTruthy()
    })

    it('should not render Audit link for editor user', () => {
      const user = { id: 1, email: 'editor@test.com', role: 'editor' }
      renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })

    it('should not render Audit link for reviewer user', () => {
      const user = { id: 1, email: 'reviewer@test.com', role: 'reviewer' }
      renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })
  })

  describe('user information display', () => {
    it('should display user full_name when available', () => {
      const user = { id: 1, email: 'test@test.com', full_name: 'John Doe', role: 'admin' }
      renderNavbar(user)

      expect(screen.getByText('John Doe')).toBeTruthy()
    })

    it('should display user email when full_name is not available', () => {
      const user = { id: 1, email: 'test@example.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('test@example.com')).toBeTruthy()
    })

    it('should display user email when full_name is empty string', () => {
      const user = { id: 1, email: 'test@test.com', full_name: '', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('test@test.com')).toBeTruthy()
    })

    it('should display user email when full_name is null', () => {
      const user = { id: 1, email: 'user@test.com', full_name: null, role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('user@test.com')).toBeTruthy()
    })

    it('should display user role', () => {
      const user = { id: 1, email: 'test@test.com', role: 'admin' }
      const { container } = renderNavbar(user)

      expect(screen.getByText('admin')).toBeTruthy()
    })

    it('should display editor role', () => {
      const user = { id: 1, email: 'test@test.com', role: 'editor' }
      renderNavbar(user)

      expect(screen.getByText('editor')).toBeTruthy()
    })

    it('should display reviewer role', () => {
      const user = { id: 1, email: 'test@test.com', role: 'reviewer' }
      renderNavbar(user)

      expect(screen.getByText('reviewer')).toBeTruthy()
    })

    it('should display viewer role', () => {
      const user = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('viewer')).toBeTruthy()
    })
  })

  describe('logout functionality', () => {
    it('should render Sign out button', () => {
      const user = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('Sign out')).toBeTruthy()
    })

    it('should call logout and navigate on Sign out click', async () => {
      const user = userEvent.setup()
      const testUser = { id: 1, email: 'test@test.com', role: 'admin' }
      renderNavbar(testUser)

      const signOutButton = screen.getByText('Sign out')
      await user.click(signOutButton)

      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should only call navigate once on logout', async () => {
      const user = userEvent.setup()
      const testUser = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(testUser)

      await user.click(screen.getByText('Sign out'))

      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('should handle user with no email or full_name', () => {
      const user = { id: 1, role: 'admin' }
      renderNavbar(user)

      expect(screen.getByText('admin')).toBeTruthy()
    })

    it('should handle user with undefined role', () => {
      const user = { id: 1, email: 'test@test.com' }
      const { container } = renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })

    it('should handle user with empty role string', () => {
      const user = { id: 1, email: 'test@test.com', role: '' }
      renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })

    it('should handle user with null role', () => {
      const user = { id: 1, email: 'test@test.com', role: null }
      renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })

    it('should handle user with unknown role', () => {
      const user = { id: 1, email: 'test@test.com', role: 'unknown' }
      renderNavbar(user)

      expect(screen.getByText('unknown')).toBeTruthy()
      expect(screen.queryByText('Audit')).toBeNull()
    })

    it('should handle very long email', () => {
      const longEmail = 'a'.repeat(100) + '@example.com'
      const user = { id: 1, email: longEmail, role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText(longEmail)).toBeTruthy()
    })

    it('should handle very long full_name', () => {
      const longName = 'A'.repeat(100)
      const user = { id: 1, email: 'test@test.com', full_name: longName, role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText(longName)).toBeTruthy()
    })

    it('should handle special characters in email', () => {
      const user = { id: 1, email: 'test+tag@example.co.uk', role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText('test+tag@example.co.uk')).toBeTruthy()
    })

    it('should handle special characters in full_name', () => {
      const user = { id: 1, email: 'test@test.com', full_name: "O'Brien-Smith", role: 'viewer' }
      renderNavbar(user)

      expect(screen.getByText("O'Brien-Smith")).toBeTruthy()
    })
  })

  describe('role-based conditional rendering boundary', () => {
    it('should show Audit for role exactly equal to admin', () => {
      const user = { id: 1, email: 'test@test.com', role: 'admin' }
      renderNavbar(user)

      expect(screen.getByText('Audit')).toBeTruthy()
    })

    it('should not show Audit for role case variation (Admin)', () => {
      const user = { id: 1, email: 'test@test.com', role: 'Admin' }
      renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })

    it('should not show Audit for role with whitespace', () => {
      const user = { id: 1, email: 'test@test.com', role: ' admin ' }
      renderNavbar(user)

      expect(screen.queryByText('Audit')).toBeNull()
    })
  })

  describe('multiple logout clicks', () => {
    it('should handle double click on Sign out', async () => {
      const user = userEvent.setup()
      const testUser = { id: 1, email: 'test@test.com', role: 'viewer' }
      renderNavbar(testUser)

      const signOutButton = screen.getByText('Sign out')
      await user.click(signOutButton)
      await user.click(signOutButton)

      expect(mockNavigate).toHaveBeenCalledTimes(2)
    })
  })
})
