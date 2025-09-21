import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Global test setup for theme system tests

// Mock DOM APIs that may not be available in jsdom
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
})

// Mock performance.memory (if available in Chrome)
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 100000000
  }
})

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  configurable: true
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock CSS.supports if not available
if (!window.CSS || !window.CSS.supports) {
  window.CSS = {
    supports: vi.fn(() => true)
  }
}

// Setup Vue Test Utils global config
config.global = {
  ...config.global,
  stubs: {
    // Stub Heroicons to avoid import issues
    SunIcon: true,
    MoonIcon: true,
    ComputerDesktopIcon: true,
    ChevronDownIcon: true,
    CheckIcon: true,
    // Stub transition components
    Transition: true,
    TransitionGroup: true
  },
  mocks: {
    // Mock any global properties that components might expect
    $t: (key) => key, // Mock i18n
    $route: {
      path: '/',
      params: {},
      query: {},
      meta: {}
    },
    $router: {
      push: vi.fn(),
      replace: vi.fn(),
      go: vi.fn(),
      back: vi.fn(),
      forward: vi.fn()
    }
  }
}

// Utility functions for theme testing
export const mockSystemTheme = (isDark = false) => {
  window.matchMedia = vi.fn().mockImplementation(query => {
    if (query === '(prefers-color-scheme: dark)') {
      return {
        matches: isDark,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

export const mockReducedMotion = (isReduced = false) => {
  window.matchMedia = vi.fn().mockImplementation(query => {
    if (query === '(prefers-reduced-motion: reduce)') {
      return {
        matches: isReduced,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

export const mockHighContrast = (isHighContrast = false) => {
  window.matchMedia = vi.fn().mockImplementation(query => {
    if (query === '(prefers-contrast: high)') {
      return {
        matches: isHighContrast,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

export const simulateStorageError = () => {
  localStorageMock.setItem.mockImplementation(() => {
    throw new Error('QuotaExceededError: DOM Exception 22')
  })

  localStorageMock.getItem.mockImplementation(() => {
    throw new Error('SecurityError: DOM Exception 18')
  })
}

export const restoreStorage = () => {
  localStorageMock.setItem.mockClear()
  localStorageMock.getItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  restoreStorage()

  // Reset DOM state
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')

  // Clear any custom properties
  const computedStyle = getComputedStyle(document.documentElement)
  for (const property of computedStyle) {
    if (property.startsWith('--')) {
      document.documentElement.style.removeProperty(property)
    }
  }

  // Reset head elements
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.remove()
  }
})

// Helper for testing theme changes
export const waitForThemeChange = (timeout = 1000) => {
  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener('theme-changed', handler)
      resolve()
    }
    window.addEventListener('theme-changed', handler)
    setTimeout(() => {
      window.removeEventListener('theme-changed', handler)
      resolve()
    }, timeout)
  })
}

// Helper for testing transitions
export const mockTransitionEnd = () => {
  const originalTransition = Element.prototype.addEventListener
  Element.prototype.addEventListener = function(event, handler, options) {
    if (event === 'transitionend') {
      setTimeout(() => handler({ target: this, propertyName: 'background-color' }), 0)
    }
    return originalTransition.call(this, event, handler, options)
  }
}

// Performance testing helpers
export const measureThemePerformance = async (themeOperation) => {
  const start = performance.now()
  await themeOperation()
  const end = performance.now()
  return end - start
}

// Accessibility testing helpers
export const checkColorContrast = (foreground, background) => {
  // Simplified contrast calculation for testing
  const getLuminance = (color) => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  const lum1 = getLuminance(foreground)
  const lum2 = getLuminance(background)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

export const meetsWCAGAA = (foreground, background) => {
  return checkColorContrast(foreground, background) >= 4.5
}

export const meetsWCAGAAA = (foreground, background) => {
  return checkColorContrast(foreground, background) >= 7
}