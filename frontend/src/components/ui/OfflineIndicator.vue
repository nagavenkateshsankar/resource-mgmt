<template>
  <div class="offline-indicator">
    <div class="offline-content">
      <WifiIcon class="offline-icon" />
      <span class="offline-text">You're offline</span>
      <div class="offline-pulse"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WifiIcon } from '@heroicons/vue/24/outline'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.9));
  color: white;
  text-align: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  transition: all 0.3s ease;
}

.dark .offline-indicator {
  background: linear-gradient(135deg, hsl(var(--destructive) / 0.9), hsl(var(--destructive) / 0.8));
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
}

.offline-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.offline-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2;
}

.offline-text {
  font-weight: 500;
}

.offline-pulse {
  position: absolute;
  right: 1rem;
  width: 0.5rem;
  height: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

@media (max-width: 640px) {
  .offline-indicator {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .offline-icon {
    width: 1rem;
    height: 1rem;
  }

  .offline-content {
    gap: 0.375rem;
  }

  .offline-pulse {
    right: 0.75rem;
    width: 0.375rem;
    height: 0.375rem;
  }
}
</style>