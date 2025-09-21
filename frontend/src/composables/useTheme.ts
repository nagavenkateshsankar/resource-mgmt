import { computed, onUnmounted } from 'vue'
import { useThemeStore, type Theme, type ResolvedTheme } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()

  // Reactive theme properties
  const theme = computed(() => themeStore.theme)
  const resolvedTheme = computed(() => themeStore.resolvedTheme)
  const isDark = computed(() => themeStore.isDark)
  const isLight = computed(() => themeStore.isLight)
  const isTransitioning = computed(() => themeStore.isTransitioning)
  const cssVariables = computed(() => themeStore.cssVariables)

  // Theme actions
  const setTheme = async (newTheme: Theme): Promise<void> => {
    await themeStore.setTheme(newTheme)
  }

  const toggleTheme = async (): Promise<void> => {
    await themeStore.toggleTheme()
  }

  const resetTheme = async (): Promise<void> => {
    await themeStore.resetTheme()
  }

  // Theme utilities
  const getThemeClass = themeStore.getThemeClass
  const getThemeColors = themeStore.getThemeColors
  const getThemeIcon = themeStore.getThemeIcon
  const getThemeLabel = themeStore.getThemeLabel

  // CSS classes helper for Tailwind - Modern Design Token Approach
  const themeClasses = computed(() => ({
    // Background classes using design tokens
    bg: {
      primary: 'bg-background',
      secondary: 'bg-muted',
      surface: 'bg-card',
      elevated: 'bg-popover',
    },
    // Text classes using design tokens
    text: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
      muted: 'text-muted-foreground',
      inverse: getThemeClass('text-white', 'text-gray-900'),
    },
    // Border classes using design tokens
    border: {
      primary: 'border-border',
      secondary: 'border-input',
      focus: 'border-ring',
    },
    // Interactive elements using design tokens
    button: {
      primary: 'btn btn-primary',
      secondary: 'btn btn-secondary',
      ghost: 'btn btn-ghost',
      destructive: 'btn btn-destructive',
      outline: 'btn btn-outline',
    },
    // Form elements using design tokens
    input: {
      base: 'form-input',
      focus: 'focus-visible:ring-ring',
    },
    // Navigation using semantic classes
    nav: {
      item: getThemeClass('text-gray-700 hover:text-primary hover:bg-accent', 'text-gray-300 hover:text-primary-foreground hover:bg-accent'),
      active: getThemeClass('text-primary bg-accent', 'text-primary-foreground bg-accent'),
    },
    // Cards and panels using design tokens
    card: {
      base: 'card',
      hover: 'hover:shadow-md',
    },
    // Status indicators using semantic design tokens
    status: {
      success: 'bg-success/10 text-success border-success/20',
      warning: 'bg-warning/10 text-warning-foreground border-warning/20',
      error: 'bg-destructive/10 text-destructive border-destructive/20',
      info: 'bg-info/10 text-info-foreground border-info/20',
    },
  }))

  // Color values for programmatic use
  const colors = computed(() => getThemeColors())

  // CSS custom properties helper
  const customCssVariables = computed(() => {
    const themeColors = getThemeColors()
    return {
      '--color-background': themeColors.background,
      '--color-surface': themeColors.surface,
      '--color-text': themeColors.text,
      '--color-text-secondary': themeColors.textSecondary,
      '--color-border': themeColors.border,
      '--color-primary': themeColors.primary,
      '--color-success': themeColors.success,
      '--color-warning': themeColors.warning,
      '--color-error': themeColors.error,
    }
  })

  // Theme transition helper
  const withThemeTransition = (callback: () => void, duration = 150) => {
    // Add transition class to document
    document.documentElement.style.setProperty('transition', `background-color ${duration}ms ease, color ${duration}ms ease`)

    // Execute callback
    callback()

    // Remove transition after completion
    setTimeout(() => {
      document.documentElement.style.removeProperty('transition')
    }, duration)
  }

  // Theme change listener
  let themeChangeListener: ((event: CustomEvent) => void) | null = null

  const onThemeChange = (callback: (theme: string, resolvedTheme: string) => void) => {
    themeChangeListener = (event: CustomEvent) => {
      callback(event.detail.theme, event.detail.resolvedTheme)
    }
    window.addEventListener('theme-changed', themeChangeListener)
  }

  const offThemeChange = () => {
    if (themeChangeListener) {
      window.removeEventListener('theme-changed', themeChangeListener)
      themeChangeListener = null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    offThemeChange()
  })

  // Media query helpers
  const prefersColorScheme = computed(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  const prefersReducedMotion = computed(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  // Accessibility helpers
  const getContrastRatio = (color1: string, color2: string) => {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color library
    const getLuminance = (color: string) => {
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) / 255
      const g = parseInt(hex.substr(2, 2), 16) / 255
      const b = parseInt(hex.substr(4, 2), 16) / 255

      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
    }

    const lum1 = getLuminance(color1)
    const lum2 = getLuminance(color2)
    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)
  }

  const meetsWCAGAA = (foreground: string, background: string) => {
    return getContrastRatio(foreground, background) >= 4.5
  }

  const meetsWCAGAAA = (foreground: string, background: string) => {
    return getContrastRatio(foreground, background) >= 7
  }

  return {
    // State
    theme,
    resolvedTheme,
    isDark,
    isLight,
    isTransitioning,

    // Actions
    setTheme,
    toggleTheme,
    resetTheme,

    // Utilities
    themeClasses,
    colors,
    cssVariables: customCssVariables,
    getThemeClass,
    getThemeColors,
    getThemeIcon,
    getThemeLabel,

    // Advanced features
    withThemeTransition,
    onThemeChange,
    offThemeChange,

    // Media queries
    prefersColorScheme,
    prefersReducedMotion,

    // Accessibility
    getContrastRatio,
    meetsWCAGAA,
    meetsWCAGAAA,
  }
}

// Type exports for better TypeScript support
export type UseThemeReturn = ReturnType<typeof useTheme>