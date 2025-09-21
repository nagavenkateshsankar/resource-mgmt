import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  // State
  const theme = ref<Theme>('system')
  const systemPreference = ref<ResolvedTheme>('light')
  const isTransitioning = ref<boolean>(false)

  // Constants
  const STORAGE_KEY = 'resource-mgmt-theme'
  const MEDIA_QUERY = '(prefers-color-scheme: dark)'

  // Computed
  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (theme.value === 'system') {
      return systemPreference.value
    }
    return theme.value as ResolvedTheme
  })

  const isDark = computed(() => resolvedTheme.value === 'dark')
  const isLight = computed(() => resolvedTheme.value === 'light')

  // CSS Custom Properties for theme variables
  const cssVariables = computed(() => {
    if (isDark.value) {
      return {
        '--theme-bg': '#0f172a',
        '--theme-surface': '#1e293b',
        '--theme-card': '#334155',
        '--theme-text-primary': '#f8fafc',
        '--theme-text-secondary': '#e2e8f0',
        '--theme-text-muted': '#94a3b8',
        '--theme-border': '#475569',
        '--theme-border-light': '#334155',
        '--theme-accent': '#3b82f6',
        '--theme-accent-hover': '#2563eb',
        '--theme-success': '#10b981',
        '--theme-warning': '#f59e0b',
        '--theme-error': '#ef4444',
        '--theme-info': '#06b6d4',
      }
    } else {
      return {
        '--theme-bg': '#ffffff',
        '--theme-surface': '#f8fafc',
        '--theme-card': '#ffffff',
        '--theme-text-primary': '#1e293b',
        '--theme-text-secondary': '#475569',
        '--theme-text-muted': '#64748b',
        '--theme-border': '#e2e8f0',
        '--theme-border-light': '#f1f5f9',
        '--theme-accent': '#3b82f6',
        '--theme-accent-hover': '#2563eb',
        '--theme-success': '#10b981',
        '--theme-warning': '#f59e0b',
        '--theme-error': '#ef4444',
        '--theme-info': '#06b6d4',
      }
    }
  })

  // MediaQuery listener reference
  let mediaQueryListener: MediaQueryList | null = null

  // Actions
  const setTheme = async (newTheme: Theme): Promise<void> => {
    if (theme.value === newTheme) return

    // Enable transition during theme change
    isTransitioning.value = true

    try {
      theme.value = newTheme
      persistTheme(newTheme)

      // Add smooth transition
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease'

      await applyTheme()

      // Remove transition after animation
      setTimeout(() => {
        isTransitioning.value = false
        document.body.style.transition = ''
      }, 300)
    } catch (error) {
      console.error('Failed to set theme:', error)
      isTransitioning.value = false
    }
  }

  const toggleTheme = async (): Promise<void> => {
    const currentTheme = theme.value
    let nextTheme: Theme

    switch (currentTheme) {
      case 'light':
        nextTheme = 'dark'
        break
      case 'dark':
        nextTheme = 'system'
        break
      case 'system':
        nextTheme = 'light'
        break
      default:
        nextTheme = 'light'
    }

    await setTheme(nextTheme)
  }

  const applyTheme = async (): Promise<void> => {
    const htmlElement = document.documentElement

    // Remove existing theme classes
    htmlElement.classList.remove('light', 'dark')

    // Apply resolved theme class
    htmlElement.classList.add(resolvedTheme.value)

    // Apply CSS custom properties
    const variables = cssVariables.value
    Object.entries(variables).forEach(([property, value]) => {
      htmlElement.style.setProperty(property, value)
    })

    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(resolvedTheme.value)

    // Dispatch custom event for components that need to react to theme changes
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: {
        theme: theme.value,
        resolvedTheme: resolvedTheme.value,
        isDark: isDark.value,
        isLight: isLight.value
      }
    }))
  }

  const updateMetaThemeColor = (currentTheme: ResolvedTheme): void => {
    try {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta')
        metaThemeColor.setAttribute('name', 'theme-color')
        document.head.appendChild(metaThemeColor)
      }

      const themeColor = currentTheme === 'dark' ? '#1e293b' : '#ffffff'
      metaThemeColor.setAttribute('content', themeColor)
    } catch (error) {
      console.warn('Failed to update theme-color meta tag:', error)
    }
  }

  const persistTheme = (themeValue: Theme): void => {
    try {
      localStorage.setItem(STORAGE_KEY, themeValue)
    } catch (error) {
      console.warn('Failed to persist theme preference:', error)
    }
  }

  const loadPersistedTheme = (): Theme => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved as Theme
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error)
    }
    return 'system'
  }

  const detectSystemPreference = (): void => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQueryListener = window.matchMedia(MEDIA_QUERY)
      systemPreference.value = mediaQueryListener.matches ? 'dark' : 'light'

      // Listen for system preference changes
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        systemPreference.value = e.matches ? 'dark' : 'light'

        // If using system theme, update immediately
        if (theme.value === 'system') {
          applyTheme()
        }
      }

      mediaQueryListener.addEventListener('change', handleSystemThemeChange)
    }
  }

  const initializeTheme = (): void => {
    try {
      // Detect system preference first
      detectSystemPreference()

      // Load persisted theme
      const persistedTheme = loadPersistedTheme()
      theme.value = persistedTheme

      // Apply theme immediately
      applyTheme()
    } catch (error) {
      console.warn('Failed to initialize theme:', error)
      // Fallback to light theme
      theme.value = 'light'
      applyTheme()
    }
  }

  const resetTheme = async (): Promise<void> => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      await setTheme('system')
    } catch (error) {
      console.error('Failed to reset theme:', error)
    }
  }

  const cleanup = (): void => {
    if (mediaQueryListener) {
      mediaQueryListener.removeEventListener('change', () => {})
      mediaQueryListener = null
    }
  }

  // Utilities for components
  const getThemeClass = (lightClass: string, darkClass: string): string => {
    return isDark.value ? darkClass : lightClass
  }

  const getThemeColors = () => {
    if (isDark.value) {
      return {
        background: '#0f172a',
        surface: '#1e293b',
        card: '#334155',
        text: '#f8fafc',
        textSecondary: '#e2e8f0',
        textMuted: '#94a3b8',
        border: '#475569',
        borderLight: '#334155',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4'
      }
    } else {
      return {
        background: '#ffffff',
        surface: '#f8fafc',
        card: '#ffffff',
        text: '#1e293b',
        textSecondary: '#475569',
        textMuted: '#64748b',
        border: '#e2e8f0',
        borderLight: '#f1f5f9',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4'
      }
    }
  }

  const getThemeIcon = (): string => {
    switch (theme.value) {
      case 'light':
        return 'sun'
      case 'dark':
        return 'moon'
      case 'system':
        return 'computer-desktop'
      default:
        return 'sun'
    }
  }

  const getThemeLabel = (): string => {
    switch (theme.value) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
      default:
        return 'Light'
    }
  }

  // Watch for resolved theme changes to trigger side effects
  watch(resolvedTheme, () => {
    applyTheme()
  }, { immediate: false })

  // Watch for system preference changes
  watch(systemPreference, () => {
    if (theme.value === 'system') {
      applyTheme()
    }
  })

  return {
    // State
    theme: computed(() => theme.value),
    systemPreference: computed(() => systemPreference.value),
    isTransitioning: computed(() => isTransitioning.value),

    // Computed
    resolvedTheme,
    isDark,
    isLight,
    cssVariables,

    // Actions
    setTheme,
    toggleTheme,
    initializeTheme,
    applyTheme,
    resetTheme,
    cleanup,

    // Utilities
    getThemeClass,
    getThemeColors,
    getThemeIcon,
    getThemeLabel
  }
})