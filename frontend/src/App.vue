<template>
  <div
    id="app"
    class="min-h-screen transition-colors duration-300"
    :class="[
      themeClasses.bg.primary,
      themeClasses.text.primary
    ]"
  >
    <!-- PWA Install Banner -->
    <PWAInstallBanner v-if="showInstallBanner" @dismiss="showInstallBanner = false" />

    <!-- Main App Layout -->
    <div class="app-container">
      <!-- Navigation Header -->
      <AppHeader v-if="isAuthenticated" />

      <!-- Main Content -->
      <main
        class="main-content transition-colors duration-300"
        :class="{ 'with-nav': isAuthenticated }"
      >
        <RouterView />
      </main>

      <!-- Bottom Navigation (Mobile Only) -->
      <AppNavigation v-if="isAuthenticated && isMobile" />
    </div>

    <!-- Global Loading Overlay -->
    <LoadingOverlay v-if="isLoading" />

    <!-- Offline Indicator -->
    <OfflineIndicator v-if="!isOnline" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useOnline } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useThemeStore } from '@/stores/theme'
import { useTheme } from '@/composables/useTheme'

// Components
import AppHeader from '@/components/layout/AppHeader.vue'
import AppNavigation from '@/components/layout/AppNavigation.vue'
import PWAInstallBanner from '@/components/layout/PWAInstallBanner.vue'
import LoadingOverlay from '@/components/ui/LoadingOverlay.vue'
import OfflineIndicator from '@/components/ui/OfflineIndicator.vue'

// Stores
const authStore = useAuthStore()
const appStore = useAppStore()
const themeStore = useThemeStore()

// Theme composable
const { themeClasses, isDark, isLight } = useTheme()

// Reactive state
const showInstallBanner = ref(false)
const isOnline = useOnline()

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isLoading = computed(() => appStore.isLoading)
const isMobile = computed(() => appStore.isMobile)

// PWA Install Banner Logic
onMounted(() => {
  // Initialize theme system first (before other initialization)
  themeStore.initializeTheme()

  // Check if app can be installed
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    showInstallBanner.value = true
    appStore.setInstallPrompt(e)
  })

  // Initialize app state
  appStore.initializeApp()
  authStore.initializeAuth()
})

// Cleanup theme system
onUnmounted(() => {
  themeStore.cleanup()
})
</script>

<style>
/* Global Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.5;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Theme-aware body styles */
body {
  background-color: white !important;
  color: #111827 !important;
}

.dark body {
  background-color: #111827 !important;
  color: #f9fafb !important;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* Space for bottom navigation on mobile devices only */
@media (max-width: 768px) {
  .main-content.with-nav {
    padding-bottom: 5rem; /* Space for bottom navigation */
  }
}

/* PWA specific styles */
@media (display-mode: standalone) {
  body {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
}

/* Loading and offline states with theme support */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: background-color 0.3s ease;
}

.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #ef4444 !important;
  color: white;
  text-align: center;
  padding: 0.5rem;
  font-size: 0.875rem;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Custom scrollbar styles for better dark mode support */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background-color: #f3f4f6 !important;
}

::-webkit-scrollbar-thumb {
  background-color: #d1d5db !important;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af !important;
}

/* Selection colors */
::selection {
  background-color: #dbeafe !important;
  color: #1e3a8a !important;
}

/* Focus outline improvements */
:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

:focus-visible {
  outline-color: #3b82f6 !important;
  outline-width: 2px;
  outline-style: solid;
}

/* Improved transition for theme changes */
*,
*::before,
*::after {
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Disable transitions for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High contrast mode adjustments */
@media (prefers-contrast: high) {
  .loading-overlay {
    backdrop-filter: none;
    background-color: white !important;
  }
}

/* Print styles */
@media print {
  * {
    background: transparent !important;
    color: black !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  .loading-overlay,
  .offline-indicator {
    display: none !important;
  }
}
</style>