import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useThemeStore } from '@/stores/theme'

// Mock Heroicons
vi.mock('@heroicons/vue/24/outline', () => ({
  SunIcon: {
    template: '<svg data-testid="sun-icon"><path/></svg>'
  },
  MoonIcon: {
    template: '<svg data-testid="moon-icon"><path/></svg>'
  },
  ComputerDesktopIcon: {
    template: '<svg data-testid="computer-icon"><path/></svg>'
  },
  ChevronDownIcon: {
    template: '<svg data-testid="chevron-down-icon"><path/></svg>'
  },
  CheckIcon: {
    template: '<svg data-testid="check-icon"><path/></svg>'
  }
}))

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

describe('ThemeToggle Component', () => {
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
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Compact Variant', () => {
    it('should render compact toggle button', () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      expect(wrapper.find('[data-testid="theme-toggle-compact"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="light-mode-icon"]').exists()).toBe(true)
    })

    it('should show sun icon in light mode', async () => {
      await themeStore.setTheme('light')

      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      expect(wrapper.find('[data-testid="light-mode-icon"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="dark-mode-icon"]').exists()).toBe(false)
    })

    it('should show moon icon in dark mode', async () => {
      await themeStore.setTheme('dark')

      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      expect(wrapper.find('[data-testid="dark-mode-icon"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="light-mode-icon"]').exists()).toBe(false)
    })

    it('should toggle theme on click', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      const button = wrapper.find('[data-testid="theme-toggle-compact"]')
      await button.trigger('click')

      // Should toggle to dark
      expect(themeStore.theme).toBe('dark')
    })

    it('should have correct accessibility attributes', () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      const button = wrapper.find('[data-testid="theme-toggle-compact"]')
      expect(button.attributes('title')).toBeDefined()
      expect(button.attributes('aria-label')).toBeDefined()
    })

    it('should emit theme change events', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      const button = wrapper.find('[data-testid="theme-toggle-compact"]')
      await button.trigger('click')

      // Check if themeChange event was emitted
      expect(wrapper.emitted('themeChange')).toBeTruthy()
    })
  })

  describe('Dropdown Variant', () => {
    it('should render dropdown toggle', () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      expect(wrapper.find('[data-testid="theme-toggle-dropdown"]').exists()).toBe(true)
    })

    it('should show dropdown menu on click', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(true)
    })

    it('should hide dropdown menu on second click', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')

      // First click - show dropdown
      await trigger.trigger('click')
      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(true)

      // Second click - hide dropdown
      await trigger.trigger('click')
      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(false)
    })

    it('should render all theme options', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      expect(wrapper.find('[data-testid="theme-option-light"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="theme-option-dark"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="theme-option-system"]').exists()).toBe(true)
    })

    it('should select theme from dropdown', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      const darkOption = wrapper.find('[data-testid="theme-option-dark"]')
      await darkOption.trigger('click')

      expect(themeStore.theme).toBe('dark')
    })

    it('should show selected theme with check mark', async () => {
      await themeStore.setTheme('dark')

      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      // Should show check icon for selected theme
      const darkOption = wrapper.find('[data-testid="theme-option-dark"]')
      expect(darkOption.find('[data-testid="selected-theme-check"]').exists()).toBe(true)
    })

    it('should close dropdown after selection', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      const lightOption = wrapper.find('[data-testid="theme-option-light"]')
      await lightOption.trigger('click')

      // Dropdown should be closed
      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(false)
    })

    it('should show label when enabled', () => {
      const wrapper = mount(ThemeToggle, {
        props: {
          variant: 'dropdown',
          showLabel: true
        }
      })

      expect(wrapper.text()).toContain('System') // Default theme label
    })

    it('should have correct ARIA attributes', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      expect(trigger.attributes('aria-haspopup')).toBe('true')
      expect(trigger.attributes('aria-expanded')).toBe('false')

      await trigger.trigger('click')
      expect(trigger.attributes('aria-expanded')).toBe('true')
    })
  })

  describe('Switch Variant', () => {
    it('should render switch toggle', () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'switch' }
      })

      expect(wrapper.find('[data-testid="theme-toggle-switch"]').exists()).toBe(true)
    })

    it('should toggle between light and dark only', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'switch' }
      })

      // Start with light theme
      await themeStore.setTheme('light')

      const switchElement = wrapper.find('input[type="checkbox"]')
      await switchElement.setChecked(true)

      expect(themeStore.theme).toBe('dark')

      await switchElement.setChecked(false)
      expect(themeStore.theme).toBe('light')
    })

    it('should show correct switch state for light theme', async () => {
      await themeStore.setTheme('light')

      const wrapper = mount(ThemeToggle, {
        props: { variant: 'switch' }
      })

      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.element.checked).toBe(false)
    })

    it('should show correct switch state for dark theme', async () => {
      await themeStore.setTheme('dark')

      const wrapper = mount(ThemeToggle, {
        props: { variant: 'switch' }
      })

      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.element.checked).toBe(true)
    })

    it('should show label when enabled', () => {
      const wrapper = mount(ThemeToggle, {
        props: {
          variant: 'switch',
          showLabel: true
        }
      })

      expect(wrapper.text()).toContain('Theme')
    })

    it('should have correct accessibility label', () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'switch' }
      })

      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.attributes('aria-label')).toBeDefined()
    })
  })

  describe('Event Handling', () => {
    it('should handle keyboard navigation for dropdown', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      // Open dropdown
      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      // Simulate Escape key
      await wrapper.trigger('keydown', { key: 'Escape' })

      // Dropdown should close
      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(false)
    })

    it('should close dropdown on outside click', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      // Open dropdown
      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')
      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(true)

      // Simulate click outside
      document.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        target: document.body
      }))

      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(false)
    })
  })

  describe('Props and Variants', () => {
    it('should default to compact variant', () => {
      const wrapper = mount(ThemeToggle)

      expect(wrapper.find('[data-testid="theme-toggle-compact"]').exists()).toBe(true)
    })

    it('should accept different variants', () => {
      const compactWrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })
      expect(compactWrapper.find('[data-testid="theme-toggle-compact"]').exists()).toBe(true)

      const dropdownWrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })
      expect(dropdownWrapper.find('[data-testid="theme-toggle-dropdown"]').exists()).toBe(true)

      const switchWrapper = mount(ThemeToggle, {
        props: { variant: 'switch' }
      })
      expect(switchWrapper.find('[data-testid="theme-toggle-switch"]').exists()).toBe(true)
    })

    it('should handle showLabel prop', () => {
      const wrapper = mount(ThemeToggle, {
        props: {
          variant: 'dropdown',
          showLabel: true
        }
      })

      expect(wrapper.text()).toContain('System')
    })
  })

  describe('Error Handling', () => {
    it('should handle theme setting errors gracefully', async () => {
      // Mock theme store to throw error
      const originalSetTheme = themeStore.setTheme
      themeStore.setTheme = vi.fn().mockRejectedValue(new Error('Theme error'))

      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      const button = wrapper.find('[data-testid="theme-toggle-compact"]')

      // Should not throw
      await expect(button.trigger('click')).resolves.toBeUndefined()

      // Restore original method
      themeStore.setTheme = originalSetTheme
    })
  })

  describe('Component Lifecycle', () => {
    it('should cleanup event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalled()

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Theme Synchronization', () => {
    it('should update UI when theme changes externally', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      // Initially should show light icon
      expect(wrapper.find('[data-testid="light-mode-icon"]').exists()).toBe(true)

      // Change theme externally
      await themeStore.setTheme('dark')

      // Should update to show dark icon
      expect(wrapper.find('[data-testid="dark-mode-icon"]').exists()).toBe(true)
    })

    it('should update dropdown selection when theme changes', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      // Open dropdown
      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      // Change theme externally
      await themeStore.setTheme('dark')

      // Should show check mark on dark option
      const darkOption = wrapper.find('[data-testid="theme-option-dark"]')
      expect(darkOption.find('[data-testid="selected-theme-check"]').exists()).toBe(true)
    })
  })

  describe('Accessibility Compliance', () => {
    it('should support keyboard navigation', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      const button = wrapper.find('[data-testid="theme-toggle-compact"]')

      // Should be focusable
      await button.trigger('focus')
      expect(button.element).toBe(document.activeElement)

      // Should respond to Enter/Space
      await button.trigger('keydown', { key: 'Enter' })
      expect(themeStore.theme).toBe('dark')
    })

    it('should have proper focus management for dropdown', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'dropdown' }
      })

      const trigger = wrapper.find('[data-testid="theme-toggle-dropdown"]')
      await trigger.trigger('click')

      // Dropdown should be visible and keyboard navigable
      expect(wrapper.find('[data-testid="theme-dropdown-menu"]').exists()).toBe(true)
    })

    it('should maintain proper contrast ratios', async () => {
      const wrapper = mount(ThemeToggle, {
        props: { variant: 'compact' }
      })

      // Should apply appropriate theme classes for contrast
      const button = wrapper.find('[data-testid="theme-toggle-compact"]')
      expect(button.classes()).toContain('focus:ring-2')
      expect(button.classes()).toContain('focus:ring-blue-500')
    })
  })
})