# Testing Guide

This document describes the test suite for the CMS Frontend application.

## Test Framework

- **Test Runner**: Vitest
- **Component Testing**: React Testing Library (`@testing-library/react`)
- **User Interactions**: `@testing-library/user-event`
- **Environment**: jsdom

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

Tests are co-located with their source files using the `.test.jsx` or `.test.js` extension:

```
src/
├── api/
│   ├── client.js
│   └── client.test.js
├── components/
│   ├── Navbar.jsx
│   ├── Navbar.test.jsx
│   └── ...
├── pages/
│   ├── LoginPage.jsx
│   ├── LoginPage.test.jsx
│   └── ...
└── context/
    ├── AuthContext.jsx
    └── AuthContext.test.jsx
```

## Test Coverage

### API Layer
- **client.js**: Tests for axios interceptors, authentication headers, and 401 error handling

### Context
- **AuthContext**: Tests for authentication provider, login/logout functions, and localStorage integration

### Components
- **StatusBadge**: Tests for status rendering and styling variations
- **ProtectedRoute**: Tests for authenticated/unauthenticated routing
- **Navbar**: Tests for role-based navigation and logout functionality
- **Sidebar**: Tests for role-based menu items and user display
- **Document Components**: Tests for diff viewer, PDF preview, editor panes

### Pages
- **LoginPage**: Tests for form validation, submission, error handling
- **RegisterPage**: Tests for registration flow and validation
- **ContractsPage**: Tests for filtering, pagination, and contract listing
- **DashboardPage**: Tests for dashboard statistics and recent contracts
- **Other Pages**: Comprehensive tests for all application pages

## Testing Patterns

### Mocking Dependencies

```javascript
// Mock API client
vi.mock('../api/client')

// Mock router hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock context
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}))
```

### Testing User Interactions

```javascript
import userEvent from '@testing-library/user-event'

it('should handle button click', async () => {
  const user = userEvent.setup()
  render(<Component />)
  
  await user.click(screen.getByRole('button'))
  await user.type(screen.getByLabelText('Email'), 'test@test.com')
})
```

### Testing Async Behavior

```javascript
import { waitFor } from '@testing-library/react'

it('should load data', async () => {
  api.get.mockResolvedValue({ data: { items: [] } })
  render(<Component />)
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})
```

### Testing Error States

```javascript
it('should display error message', async () => {
  api.post.mockRejectedValue({
    response: { data: { detail: 'Error message' } }
  })
  
  render(<Component />)
  // ... trigger error
  
  await waitFor(() => {
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })
})
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText`, `getByText`
3. **Mock External Dependencies**: Mock API calls, localStorage, browser APIs
4. **Test Edge Cases**: null, undefined, empty arrays, boundary values
5. **Test All Branches**: Ensure all conditional rendering paths are tested
6. **Avoid Implementation Details**: Don't test state directly, test the output

## Common Test Scenarios

### Component Rendering
- Initial render with default props
- Conditional rendering based on props/state
- Different user roles (admin, editor, viewer)

### Form Handling
- Input validation
- Successful submission
- Error handling
- Loading states

### API Integration
- Successful API calls
- Error responses (401, 403, 404, 500)
- Network errors
- Loading states

### Routing
- Navigation on user actions
- Protected routes
- URL parameter handling

### User Interactions
- Button clicks
- Form submissions
- Input changes
- Keyboard events

## Troubleshooting

### Tests Failing with "Cannot find module"
Ensure all dependencies are installed:
```bash
npm install
```

### Tests Timing Out
Increase timeout or check for missing `await`:
```javascript
it('test', async () => {
  await user.click(button) // Don't forget await!
}, 10000) // Optional timeout
```

### Mock Not Working
Ensure mock is defined before component import:
```javascript
vi.mock('./module') // Must be before component import
import Component from './Component'
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
