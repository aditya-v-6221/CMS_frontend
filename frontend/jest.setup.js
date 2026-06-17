import '@testing-library/jest-dom'

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// Mock window.location
delete window.location
window.location = { href: '', assign: jest.fn(), reload: jest.fn() }
