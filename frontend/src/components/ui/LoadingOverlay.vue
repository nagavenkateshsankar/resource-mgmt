<template>
  <div class="loading-overlay">
    <div class="loading-content" :class="[themeClasses.card.base]">
      <div class="loading-spinner">
        <svg class="animate-spin" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
            fill="none"
            class="opacity-25"
          />
          <path
            fill="currentColor"
            class="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <p class="loading-text" :class="themeClasses.text.secondary">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

interface Props {
  message?: string
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...'
})

const { themeClasses } = useTheme()
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: background-color 0.3s ease;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  border-radius: 1rem;
  /* Card styling handled by themeClasses.card.base */
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  color: hsl(var(--primary)) !important;
  transition: color 0.3s ease;
}

.loading-text {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  /* Text color handled by themeClasses.text.secondary */
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Disable animation for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
}
</style>