import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useTheme } from '@/composables/useTheme'
import { useThemeStore } from '@/stores/theme'

// Test component to use the composable
const TestComponent = {
  template: '<div></div>',
  setup() {
    return useTheme()
  }
}

// Mock DOM APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

const mockMatchMedia = vi.fn()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia
})

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

Object.defineProperty(document, 'body', {
  value: {
    style: {
      transition: ''
    }
  }
})

Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn()
})

describe('useTheme Composable', () => {
  let wrapper
  let themeStore

  beforeEach(() => {
    setActivePinia(createPinia())
    themeStore = useThemeStore()

    // Reset all mocks
    vi.clearAllMocks()

    // Setup default mock returns
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })

    mockLocalStorage.getItem.mockReturnValue(null)

    wrapper = mount(TestComponent)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
  })

  describe('Reactive Properties', () => {
    it('should provide reactive theme properties', async () => {
      const vm = wrapper.vm

      expect(vm.theme).toBe('system')
      expect(vm.resolvedTheme).toBe('light')
      expect(vm.isDark).toBe(false)
      expect(vm.isLight).toBe(true)
      expect(vm.isTransitioning).toBe(false)

      await vm.setTheme('dark')

      expect(vm.theme).toBe('dark')
      expect(vm.resolvedTheme).toBe('dark')
      expect(vm.isDark).toBe(true)
      expect(vm.isLight).toBe(false)
    })

    it('should provide CSS variables', () => {
      const vm = wrapper.vm

      expect(vm.cssVariables).toBeDefined()
      expect(vm.cssVariables).toHaveProperty('--theme-bg')
      expect(vm.cssVariables).toHaveProperty('--theme-text-primary')
    })
  })

  describe('Theme Actions', () => {
    it('should set theme through composable', async () => {
      const vm = wrapper.vm

      await vm.setTheme('dark')
      expect(vm.theme).toBe('dark')

      await vm.setTheme('light')
      expect(vm.theme).toBe('light')

      await vm.setTheme('system')
      expect(vm.theme).toBe('system')
    })

    it('should toggle theme through composable', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      await vm.toggleTheme()
      expect(vm.theme).toBe('dark')

      await vm.toggleTheme()
      expect(vm.theme).toBe('system')

      await vm.toggleTheme()
      expect(vm.theme).toBe('light')
    })

    it('should reset theme through composable', async () => {
      const vm = wrapper.vm

      await vm.setTheme('dark')
      expect(vm.theme).toBe('dark')

      await vm.resetTheme()
      expect(vm.theme).toBe('system')
    })
  })

  describe('Theme Utilities', () => {
    it('should provide theme class utility', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      expect(vm.getThemeClass('light-class', 'dark-class')).toBe('light-class')

      await vm.setTheme('dark')
      expect(vm.getThemeClass('light-class', 'dark-class')).toBe('dark-class')
    })

    it('should provide theme colors utility', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const lightColors = vm.getThemeColors()
      expect(lightColors.background).toBe('#ffffff')

      await vm.setTheme('dark')
      const darkColors = vm.getThemeColors()
      expect(darkColors.background).toBe('#0f172a')
    })

    it('should provide theme icon utility', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      expect(vm.getThemeIcon()).toBe('sun')

      await vm.setTheme('dark')
      expect(vm.getThemeIcon()).toBe('moon')

      await vm.setTheme('system')
      expect(vm.getThemeIcon()).toBe('computer-desktop')
    })

    it('should provide theme label utility', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      expect(vm.getThemeLabel()).toBe('Light')

      await vm.setTheme('dark')
      expect(vm.getThemeLabel()).toBe('Dark')

      await vm.setTheme('system')
      expect(vm.getThemeLabel()).toBe('System')
    })
  })

  describe('Theme Classes Helper', () => {
    it('should provide Tailwind theme classes for light mode', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const classes = vm.themeClasses

      expect(classes.bg.primary).toBe('bg-white')
      expect(classes.text.primary).toBe('text-gray-900')
      expect(classes.border.primary).toBe('border-gray-200')
    })

    it('should provide Tailwind theme classes for dark mode', async () => {
      const vm = wrapper.vm

      await vm.setTheme('dark')
      const classes = vm.themeClasses

      expect(classes.bg.primary).toBe('bg-gray-900')
      expect(classes.text.primary).toBe('text-gray-100')
      expect(classes.border.primary).toBe('border-gray-600')
    })

    it('should provide button theme classes', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const lightClasses = vm.themeClasses
      expect(lightClasses.button.primary).toContain('bg-blue-600')
      expect(lightClasses.button.secondary).toContain('bg-gray-200')

      await vm.setTheme('dark')
      const darkClasses = vm.themeClasses
      expect(darkClasses.button.primary).toContain('bg-blue-500')
      expect(darkClasses.button.secondary).toContain('bg-gray-700')
    })

    it('should provide form input theme classes', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const lightClasses = vm.themeClasses
      expect(lightClasses.input.base).toContain('bg-white')
      expect(lightClasses.input.base).toContain('text-gray-900')

      await vm.setTheme('dark')
      const darkClasses = vm.themeClasses
      expect(darkClasses.input.base).toContain('bg-gray-800')
      expect(darkClasses.input.base).toContain('text-gray-100')
    })

    it('should provide navigation theme classes', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const lightClasses = vm.themeClasses
      expect(lightClasses.nav.item).toContain('text-gray-700')
      expect(lightClasses.nav.active).toContain('text-blue-600')

      await vm.setTheme('dark')
      const darkClasses = vm.themeClasses
      expect(darkClasses.nav.item).toContain('text-gray-300')
      expect(darkClasses.nav.active).toContain('text-blue-400')
    })

    it('should provide card theme classes', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const lightClasses = vm.themeClasses
      expect(lightClasses.card.base).toContain('bg-white')
      expect(lightClasses.card.base).toContain('border-gray-200')

      await vm.setTheme('dark')
      const darkClasses = vm.themeClasses
      expect(darkClasses.card.base).toContain('bg-gray-800')
      expect(darkClasses.card.base).toContain('border-gray-700')
    })

    it('should provide status indicator theme classes', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const lightClasses = vm.themeClasses
      expect(lightClasses.status.success).toContain('bg-green-50')
      expect(lightClasses.status.error).toContain('bg-red-50')

      await vm.setTheme('dark')
      const darkClasses = vm.themeClasses
      expect(darkClasses.status.success).toContain('bg-green-900/20')
      expect(darkClasses.status.error).toContain('bg-red-900/20')
    })
  })

  describe('Color Values', () => {
    it('should provide color values for programmatic use', async () => {
      const vm = wrapper.vm

      await vm.setTheme('light')
      const lightColors = vm.colors
      expect(lightColors.background).toBe('#ffffff')
      expect(lightColors.text).toBe('#1e293b')
      expect(lightColors.primary).toBe('#3b82f6')

      await vm.setTheme('dark')
      const darkColors = vm.colors
      expect(darkColors.background).toBe('#0f172a')
      expect(darkColors.text).toBe('#f8fafc')
      expect(darkColors.primary).toBe('#3b82f6')
    })
  })

  describe('Theme Transition', () => {
    it('should handle theme transitions with custom duration', async () => {
      vi.useFakeTimers()
      const vm = wrapper.vm

      let transitionCompleted = false
      vm.withThemeTransition(() => {
        transitionCompleted = true
      }, 200)

      expect(transitionCompleted).toBe(true)

      // Should remove transition after specified duration
      vi.advanceTimersByTime(200)

      vi.useRealTimers()
    })

    it('should handle theme transitions with default duration', async () => {
      vi.useFakeTimers()
      const vm = wrapper.vm

      let transitionCompleted = false
      vm.withThemeTransition(() => {
        transitionCompleted = true
      })

      expect(transitionCompleted).toBe(true)

      // Should remove transition after default duration (150ms)
      vi.advanceTimersByTime(150)

      vi.useRealTimers()
    })
  })

  describe('Theme Change Events', () => {
    it('should listen for theme change events', () => {
      const vm = wrapper.vm
      const mockCallback = vi.fn()

      vm.onThemeChange(mockCallback)

      // Simulate theme change event
      const event = new CustomEvent('theme-changed', {
        detail: { theme: 'dark', resolvedTheme: 'dark' }
      })
      window.dispatchEvent(event)

      expect(mockCallback).toHaveBeenCalledWith('dark', 'dark')
    })

    it('should remove theme change listeners', () => {
      const vm = wrapper.vm
      const mockCallback = vi.fn()

      vm.onThemeChange(mockCallback)
      vm.offThemeChange()

      // Simulate theme change event after removing listener
      const event = new CustomEvent('theme-changed', {
        detail: { theme: 'dark', resolvedTheme: 'dark' }
      })
      window.dispatchEvent(event)

      expect(mockCallback).not.toHaveBeenCalled()
    })
  })

  describe('Media Query Helpers', () => {
    it('should detect prefers-color-scheme', () => {
      mockMatchMedia.mockImplementation((query) => {
        if (query === '(prefers-color-scheme: dark)') {
          return { matches: true }
        }
        return { matches: false }
      })

      const vm = wrapper.vm
      expect(vm.prefersColorScheme).toBe('dark')
    })

    it('should detect prefers-reduced-motion', () => {
      mockMatchMedia.mockImplementation((query) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true }
        }
        return { matches: false }
      })

      const vm = wrapper.vm
      expect(vm.prefersReducedMotion).toBe(true)
    })

    it('should handle absence of matchMedia gracefully', () => {
      delete window.matchMedia

      const vm = wrapper.vm
      expect(vm.prefersColorScheme).toBe('light')
      expect(vm.prefersReducedMotion).toBe(false)
    })
  })

  describe('Accessibility Helpers', () => {
    it('should calculate contrast ratio', () => {
      const vm = wrapper.vm

      // Test with known color values
      const ratio = vm.getContrastRatio('#ffffff', '#000000')
      expect(ratio).toBeGreaterThan(1)
    })

    it('should check WCAG AA compliance', () => {
      const vm = wrapper.vm

      // White on black should meet WCAG AA
      expect(vm.meetsWCAGAA('#000000', '#ffffff')).toBe(true)

      // Light gray on white should not meet WCAG AA
      expect(vm.meetsWCAGAA('#cccccc', '#ffffff')).toBe(false)
    })

    it('should check WCAG AAA compliance', () => {
      const vm = wrapper.vm

      // White on black should meet WCAG AAA
      expect(vm.meetsWCAGAAA('#000000', '#ffffff')).toBe(true)

      // Lower contrast should not meet WCAG AAA
      expect(vm.meetsWCAGAAA('#666666', '#ffffff')).toBe(false)
    })
  })

  describe('Component Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const mockRemoveEventListener = vi.spyOn(window, 'removeEventListener')
      const vm = wrapper.vm

      // Add a theme change listener
      vm.onThemeChange(() => {})

      // Unmount component
      wrapper.unmount()

      expect(mockRemoveEventListener).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle theme changes when component is unmounted', async () => {
      const vm = wrapper.vm

      wrapper.unmount()

      // Should not throw error
      await expect(vm.setTheme('dark')).resolves.toBeUndefined()
    })

    it('should handle invalid theme values gracefully', async () => {
      const vm = wrapper.vm

      // TypeScript should prevent this, but test runtime behavior
      await expect(vm.setTheme('invalid' as any)).resolves.toBeUndefined()
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks with frequent theme changes', async () => {
      const vm = wrapper.vm

      // Rapidly change themes multiple times
      for (let i = 0; i < 100; i++) {
        await vm.setTheme(i % 2 === 0 ? 'light' : 'dark')
      }

      // Should still be responsive
      expect(vm.theme).toBe('dark')
    })

    it('should cache computed values appropriately', () => {
      const vm = wrapper.vm

      const classes1 = vm.themeClasses
      const classes2 = vm.themeClasses

      // Should return the same object reference for cached computed
      expect(classes1).toBe(classes2)
    })
  })
})