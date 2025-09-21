import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from '@/stores/theme'

// Mock DOM APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

const mockMatchMedia = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

// Mock document and window
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia
})

// Mock document.documentElement
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn()
    },
    style: {
      setProperty: vi.fn(),
      removeProperty: vi.fn()
    }
  }
})

// Mock document.head for meta tag
Object.defineProperty(document, 'head', {
  value: {
    appendChild: vi.fn()
  }
})

Object.defineProperty(document, 'querySelector', {
  value: vi.fn()
})

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    setAttribute: vi.fn()
  }))
})

// Mock document.body
Object.defineProperty(document, 'body', {
  value: {
    style: {
      transition: ''
    }
  }
})

// Mock window.dispatchEvent
Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn()
})

describe('Theme Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useThemeStore()

    // Reset all mocks
    vi.clearAllMocks()

    // Setup default mock returns
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener
    })

    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial State', () => {
    it('should have correct default state', () => {
      expect(store.theme).toBe('system')
      expect(store.systemPreference).toBe('light')
      expect(store.isTransitioning).toBe(false)
    })

    it('should compute resolved theme correctly for system preference', () => {
      expect(store.resolvedTheme).toBe('light')
      expect(store.isLight).toBe(true)
      expect(store.isDark).toBe(false)
    })

    it('should compute resolved theme correctly for explicit themes', async () => {
      await store.setTheme('dark')
      expect(store.resolvedTheme).toBe('dark')
      expect(store.isDark).toBe(true)
      expect(store.isLight).toBe(false)

      await store.setTheme('light')
      expect(store.resolvedTheme).toBe('light')
      expect(store.isLight).toBe(true)
      expect(store.isDark).toBe(false)
    })
  })

  describe('System Preference Detection', () => {
    it('should detect dark system preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      })

      store.detectSystemPreference()
      expect(store.systemPreference).toBe('dark')
    })

    it('should detect light system preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      })

      store.detectSystemPreference()
      expect(store.systemPreference).toBe('light')
    })

    it('should handle system preference changes', () => {
      const mediaQueryList = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: mockRemoveEventListener
      }
      mockMatchMedia.mockReturnValue(mediaQueryList)

      store.detectSystemPreference()

      // Simulate system preference change
      const changeHandler = mediaQueryList.addEventListener.mock.calls[0][1]
      changeHandler({ matches: true })

      expect(store.systemPreference).toBe('dark')
    })

    it('should handle absence of matchMedia gracefully', () => {
      delete window.matchMedia

      expect(() => {
        store.detectSystemPreference()
      }).not.toThrow()

      expect(store.systemPreference).toBe('light')
    })
  })

  describe('Theme Persistence', () => {
    it('should persist theme to localStorage', async () => {
      await store.setTheme('dark')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'resource-mgmt-theme',
        'dark'
      )
    })

    it('should load persisted theme from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('dark')

      const loaded = store.loadPersistedTheme()
      expect(loaded).toBe('dark')
    })

    it('should handle invalid persisted theme', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-theme')

      const loaded = store.loadPersistedTheme()
      expect(loaded).toBe('system')
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const loaded = store.loadPersistedTheme()
      expect(loaded).toBe('system')
    })
  })

  describe('Theme Setting', () => {
    it('should set light theme', async () => {
      await store.setTheme('light')

      expect(store.theme).toBe('light')
      expect(store.resolvedTheme).toBe('light')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'resource-mgmt-theme',
        'light'
      )
    })

    it('should set dark theme', async () => {
      await store.setTheme('dark')

      expect(store.theme).toBe('dark')
      expect(store.resolvedTheme).toBe('dark')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'resource-mgmt-theme',
        'dark'
      )
    })

    it('should set system theme', async () => {
      await store.setTheme('system')

      expect(store.theme).toBe('system')
      expect(store.resolvedTheme).toBe('light') // Default system preference
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'resource-mgmt-theme',
        'system'
      )
    })

    it('should not change theme if already set to same value', async () => {
      store.theme = 'light'
      const setItemSpy = vi.spyOn(mockLocalStorage, 'setItem')

      await store.setTheme('light')

      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('should handle transition state correctly', async () => {
      vi.useFakeTimers()

      const promise = store.setTheme('dark')
      expect(store.isTransitioning).toBe(true)

      await promise

      // Fast-forward time to complete transition
      vi.advanceTimersByTime(300)
      expect(store.isTransitioning).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('Theme Toggling', () => {
    it('should toggle from light to dark', async () => {
      await store.setTheme('light')
      await store.toggleTheme()

      expect(store.theme).toBe('dark')
    })

    it('should toggle from dark to system', async () => {
      await store.setTheme('dark')
      await store.toggleTheme()

      expect(store.theme).toBe('system')
    })

    it('should toggle from system to light', async () => {
      await store.setTheme('system')
      await store.toggleTheme()

      expect(store.theme).toBe('light')
    })
  })

  describe('Theme Application', () => {
    it('should apply light theme classes', async () => {
      await store.setTheme('light')

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark')
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('light')
    })

    it('should apply dark theme classes', async () => {
      await store.setTheme('dark')

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark')
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark')
    })

    it('should apply CSS custom properties', async () => {
      await store.setTheme('dark')

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-bg',
        '#0f172a'
      )
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-text-primary',
        '#f8fafc'
      )
    })

    it('should dispatch theme-changed event', async () => {
      await store.setTheme('dark')

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'theme-changed',
          detail: expect.objectContaining({
            theme: 'dark',
            resolvedTheme: 'dark',
            isDark: true,
            isLight: false
          })
        })
      )
    })

    it('should update meta theme-color', async () => {
      const mockMetaElement = {
        setAttribute: vi.fn()
      }
      document.querySelector.mockReturnValue(mockMetaElement)

      await store.setTheme('dark')

      expect(mockMetaElement.setAttribute).toHaveBeenCalledWith(
        'content',
        '#1e293b'
      )
    })

    it('should create meta theme-color if not exists', async () => {
      const mockMetaElement = {
        setAttribute: vi.fn()
      }
      document.querySelector.mockReturnValue(null)
      document.createElement.mockReturnValue(mockMetaElement)

      await store.setTheme('dark')

      expect(document.createElement).toHaveBeenCalledWith('meta')
      expect(mockMetaElement.setAttribute).toHaveBeenCalledWith('name', 'theme-color')
      expect(document.head.appendChild).toHaveBeenCalledWith(mockMetaElement)
    })
  })

  describe('Theme Utilities', () => {
    it('should return correct theme class for light mode', async () => {
      await store.setTheme('light')

      const result = store.getThemeClass('light-class', 'dark-class')
      expect(result).toBe('light-class')
    })

    it('should return correct theme class for dark mode', async () => {
      await store.setTheme('dark')

      const result = store.getThemeClass('light-class', 'dark-class')
      expect(result).toBe('dark-class')
    })

    it('should return correct theme colors for light mode', async () => {
      await store.setTheme('light')

      const colors = store.getThemeColors()
      expect(colors.background).toBe('#ffffff')
      expect(colors.text).toBe('#1e293b')
    })

    it('should return correct theme colors for dark mode', async () => {
      await store.setTheme('dark')

      const colors = store.getThemeColors()
      expect(colors.background).toBe('#0f172a')
      expect(colors.text).toBe('#f8fafc')
    })

    it('should return correct theme icon', async () => {
      await store.setTheme('light')
      expect(store.getThemeIcon()).toBe('sun')

      await store.setTheme('dark')
      expect(store.getThemeIcon()).toBe('moon')

      await store.setTheme('system')
      expect(store.getThemeIcon()).toBe('computer-desktop')
    })

    it('should return correct theme label', async () => {
      await store.setTheme('light')
      expect(store.getThemeLabel()).toBe('Light')

      await store.setTheme('dark')
      expect(store.getThemeLabel()).toBe('Dark')

      await store.setTheme('system')
      expect(store.getThemeLabel()).toBe('System')
    })
  })

  describe('Theme Initialization', () => {
    it('should initialize theme correctly', () => {
      mockLocalStorage.getItem.mockReturnValue('dark')
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      })

      store.initializeTheme()

      expect(store.theme).toBe('dark')
      expect(store.systemPreference).toBe('dark')
    })

    it('should handle initialization errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(() => {
        store.initializeTheme()
      }).not.toThrow()

      expect(store.theme).toBe('light')
    })
  })

  describe('Theme Reset', () => {
    it('should reset theme to system', async () => {
      await store.setTheme('dark')
      await store.resetTheme()

      expect(store.theme).toBe('system')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('resource-mgmt-theme')
    })

    it('should handle reset errors gracefully', async () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      await expect(store.resetTheme()).rejects.toThrow('Storage error')
    })
  })

  describe('Cleanup', () => {
    it('should remove event listeners on cleanup', () => {
      const mediaQueryList = {
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      }
      mockMatchMedia.mockReturnValue(mediaQueryList)

      store.detectSystemPreference()
      store.cleanup()

      expect(mockRemoveEventListener).toHaveBeenCalled()
    })
  })

  describe('CSS Variables', () => {
    it('should provide correct CSS variables for light theme', async () => {
      await store.setTheme('light')

      const variables = store.cssVariables
      expect(variables['--theme-bg']).toBe('#ffffff')
      expect(variables['--theme-text-primary']).toBe('#1e293b')
      expect(variables['--theme-accent']).toBe('#3b82f6')
    })

    it('should provide correct CSS variables for dark theme', async () => {
      await store.setTheme('dark')

      const variables = store.cssVariables
      expect(variables['--theme-bg']).toBe('#0f172a')
      expect(variables['--theme-text-primary']).toBe('#f8fafc')
      expect(variables['--theme-accent']).toBe('#3b82f6')
    })
  })

  describe('Error Handling', () => {
    it('should handle DOM manipulation errors gracefully', async () => {
      document.documentElement.classList.add.mockImplementation(() => {
        throw new Error('DOM error')
      })

      // Should not throw
      await expect(store.setTheme('dark')).resolves.toBeUndefined()
    })

    it('should handle meta tag update errors gracefully', async () => {
      document.querySelector.mockImplementation(() => {
        throw new Error('DOM error')
      })

      // Should not throw
      await expect(store.setTheme('dark')).resolves.toBeUndefined()
    })

    it('should handle event dispatch errors gracefully', async () => {
      window.dispatchEvent.mockImplementation(() => {
        throw new Error('Event error')
      })

      // Should not throw
      await expect(store.setTheme('dark')).resolves.toBeUndefined()
    })
  })
})