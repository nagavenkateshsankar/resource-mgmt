<template>
  <div class="pwa-install-banner">
    <div class="banner-content">
      <div class="banner-info">
        <div class="banner-icon">
          <ArrowDownTrayIcon class="icon-md" />
        </div>
        <div class="banner-text">
          <h3>Install Site Inspector</h3>
          <p>Get quick access and work offline</p>
        </div>
      </div>
      <div class="banner-actions">
        <button @click="installApp" class="install-btn" :disabled="isInstalling">
          {{ isInstalling ? 'Installing...' : 'Install' }}
        </button>
        <button @click="dismiss" class="dismiss-btn">
          <XMarkIcon class="icon-sm" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const emit = defineEmits<{
  dismiss: []
}>()

const appStore = useAppStore()
const isInstalling = ref(false)

const installApp = async () => {
  isInstalling.value = true
  try {
    const success = await appStore.installPWA()
    if (success) {
      emit('dismiss')
    }
  } catch (error) {
    console.error('Installation failed:', error)
  } finally {
    isInstalling.value = false
  }
}

const dismiss = () => {
  emit('dismiss')
}
</script>

<style scoped>
.pwa-install-banner {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
  color: hsl(var(--primary-foreground));
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow);
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  gap: 1rem;
}

.banner-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.banner-icon {
  background: hsl(var(--primary-foreground) / 0.2);
  border-radius: 50%;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-text h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  margin-bottom: 0.25rem;
}

.banner-text p {
  font-size: 0.875rem;
  margin: 0;
  opacity: 0.9;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.install-btn {
  background: hsl(var(--background));
  color: hsl(var(--primary));
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.install-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.install-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.dismiss-btn {
  background: hsl(var(--primary-foreground) / 0.2);
  border: none;
  border-radius: 50%;
  padding: 0.5rem;
  color: hsl(var(--primary-foreground));
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dismiss-btn:hover {
  background: hsl(var(--primary-foreground) / 0.3);
}

@media (max-width: 640px) {
  .pwa-install-banner {
    padding: 0.75rem;
  }

  .banner-content {
    gap: 0.75rem;
  }

  .banner-info {
    gap: 0.75rem;
  }

  .banner-icon {
    padding: 0.5rem;
  }

  .banner-text h3 {
    font-size: 1rem;
  }

  .banner-text p {
    font-size: 0.75rem;
  }

  .install-btn {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }

  .banner-actions {
    gap: 0.5rem;
  }
}
</style>