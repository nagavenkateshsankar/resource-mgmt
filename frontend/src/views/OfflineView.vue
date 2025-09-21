<template>
  <div class="offline-page">
    <div class="offline-container">
      <div class="offline-icon">
        <WifiIcon class="icon-xl text-gray-400" />
        <div class="offline-badge">
          <XMarkIcon class="icon-md text-white" />
        </div>
      </div>

      <h1 class="offline-title">You're Offline</h1>

      <p class="offline-description">
        It looks like you've lost your internet connection. Don't worry - you can still view
        previously loaded content and any data you've saved locally.
      </p>

      <div class="offline-features">
        <div class="feature-item">
          <CheckCircleIcon class="icon-sm text-green-500" />
          <span>View saved inspections</span>
        </div>
        <div class="feature-item">
          <CheckCircleIcon class="icon-sm text-green-500" />
          <span>Create new inspections</span>
        </div>
        <div class="feature-item">
          <CheckCircleIcon class="icon-sm text-green-500" />
          <span>Take photos and notes</span>
        </div>
        <div class="feature-item">
          <XCircleIcon class="icon-sm text-red-500" />
          <span>Sync data to server</span>
        </div>
        <div class="feature-item">
          <XCircleIcon class="icon-sm text-red-500" />
          <span>Download new templates</span>
        </div>
      </div>

      <div class="offline-actions">
        <button @click="checkConnection" class="btn btn-primary" :disabled="isChecking">
          <ArrowPathIcon v-if="!isChecking" class="icon-sm" />
          <svg
            v-else
            class="animate-spin icon-sm"
            viewBox="0 0 24 24"
          >
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
          {{ isChecking ? 'Checking...' : 'Try Again' }}
        </button>

        <router-link to="/dashboard" class="btn btn-secondary">
          Continue Offline
        </router-link>
      </div>

      <div class="sync-info">
        <InformationCircleIcon class="icon-sm text-blue-500" />
        <span>
          Your data will automatically sync when you're back online
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

// Icons
import {
  WifiIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const appStore = useAppStore()

const isChecking = ref(false)

const checkConnection = async () => {
  isChecking.value = true

  try {
    // Check if navigator.onLine is true
    if (!navigator.onLine) {
      appStore.showWarningMessage('Still offline. Please check your internet connection.')
      return
    }

    // Try to make a simple network request
    const response = await fetch('/api/v1/health', {
      method: 'GET',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    })

    if (response.ok) {
      appStore.showSuccessMessage('Connection restored!')
      router.push('/dashboard')
    } else {
      appStore.showErrorMessage('Server is not responding. Please try again later.')
    }
  } catch (error) {
    appStore.showWarningMessage('Still unable to connect. Please try again later.')
  } finally {
    isChecking.value = false
  }
}
</script>

<style scoped>
.offline-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  padding: 2rem 1rem;
}

.offline-container {
  max-width: 500px;
  width: 100%;
  text-align: center;
  background: white;
  border-radius: 1rem;
  padding: 3rem 2rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.offline-icon {
  position: relative;
  display: inline-flex;
  margin-bottom: 2rem;
}

.offline-badge {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: #ef4444;
  border-radius: 50%;
  padding: 0.5rem;
  border: 3px solid white;
}

.offline-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.offline-description {
  font-size: 1.125rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.offline-features {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.75rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.offline-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.sync-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  background: #eff6ff;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #bfdbfe;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@media (max-width: 640px) {
  .offline-container {
    padding: 2rem 1.5rem;
  }

  .offline-title {
    font-size: 2rem;
  }

  .offline-description {
    font-size: 1rem;
  }

  .offline-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>