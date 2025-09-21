import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(false)
  const isOnline = ref(navigator.onLine)
  const installPrompt = ref<any>(null)
  const notifications = ref<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timeout?: number
  }>>([])

  // Device detection
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile = ref(
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
    window.innerWidth <= 768
  )
  const isIOS = ref(/iphone|ipad|ipod/.test(userAgent))
  const isAndroid = ref(/android/.test(userAgent))
  const isStandalone = ref(
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )

  // PWA Installation
  const canInstall = computed(() => !!installPrompt.value)
  const isInstalled = computed(() => isStandalone.value)

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setOnlineStatus = (online: boolean) => {
    isOnline.value = online
  }

  const setInstallPrompt = (prompt: any) => {
    installPrompt.value = prompt
  }

  const installPWA = async () => {
    if (!installPrompt.value) return false

    try {
      await installPrompt.value.prompt()
      const result = await installPrompt.value.userChoice

      if (result.outcome === 'accepted') {
        installPrompt.value = null
        addNotification({
          type: 'success',
          title: 'App Installed',
          message: 'Site Inspection Manager has been installed successfully!'
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }

  const addNotification = (notification: Omit<typeof notifications.value[0], 'id'>) => {
    const id = Date.now().toString()
    const newNotification = {
      id,
      timeout: 5000,
      ...notification
    }

    notifications.value.push(newNotification)

    // Auto remove notification after timeout
    if (newNotification.timeout && newNotification.timeout > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.timeout)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  // Initialize app state and listeners
  const initializeApp = () => {
    // Listen for online/offline events
    window.addEventListener('online', () => setOnlineStatus(true))
    window.addEventListener('offline', () => setOnlineStatus(false))

    // Listen for window resize to update mobile detection
    window.addEventListener('resize', () => {
      isMobile.value = window.innerWidth <= 768
    })

    // Handle PWA display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', (e) => {
      isStandalone.value = e.matches
    })

    // Handle app visibility changes (for background sync)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !isOnline.value && navigator.onLine) {
        setOnlineStatus(true)
        addNotification({
          type: 'success',
          title: 'Back Online',
          message: 'Connection restored. Syncing data...'
        })
      }
    })
  }

  // Utility functions for common app operations
  const showSuccessMessage = (message: string, title = 'Success') => {
    addNotification({ type: 'success', title, message })
  }

  const showErrorMessage = (message: string, title = 'Error') => {
    addNotification({ type: 'error', title, message })
  }

  const showWarningMessage = (message: string, title = 'Warning') => {
    addNotification({ type: 'warning', title, message })
  }

  const showInfoMessage = (message: string, title = 'Info') => {
    addNotification({ type: 'info', title, message })
  }

  // Storage utilities for offline data
  const getStoredData = (key: string) => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return null
    }
  }

  const setStoredData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error('Error writing to localStorage:', error)
      return false
    }
  }

  const removeStoredData = (key: string) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('Error removing from localStorage:', error)
      return false
    }
  }

  return {
    // State
    isLoading,
    isOnline,
    installPrompt,
    notifications,
    isMobile,
    isIOS,
    isAndroid,
    isStandalone,

    // Getters
    canInstall,
    isInstalled,

    // Actions
    setLoading,
    setOnlineStatus,
    setInstallPrompt,
    installPWA,
    addNotification,
    removeNotification,
    clearNotifications,
    initializeApp,
    showSuccessMessage,
    showErrorMessage,
    showWarningMessage,
    showInfoMessage,
    getStoredData,
    setStoredData,
    removeStoredData
  }
})