<template>
  <div class="pwa-settings" :class="{ 'embedded': embedded }">
    <div v-if="!embedded" class="settings-header">
      <h3>System Info</h3>
      <button @click="$emit('close')" class="close-btn">
        <XMarkIcon class="icon-sm" />
      </button>
    </div>

    <div class="settings-content">
      <!-- Connection Status -->
      <div class="setting-section">
        <div class="section-header">
          <WifiIcon class="icon-sm" :class="isOnline ? 'text-success' : 'text-destructive'" />
          <h4>Connection</h4>
        </div>
        <div class="connection-status">
          <span :class="isOnline ? 'text-success' : 'text-destructive'">
            {{ isOnline ? 'Online' : 'Offline' }}
          </span>
          <button
            v-if="pendingSyncItems.length > 0 && isOnline"
            @click="syncNow"
            class="sync-btn"
            :disabled="isSyncing"
          >
            <ArrowPathIcon class="icon-sm" :class="{ 'animate-spin': isSyncing }" />
            {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
          </button>
        </div>
      </div>

      <!-- Offline Data -->
      <div class="setting-section">
        <div class="section-header">
          <CloudArrowDownIcon class="icon-sm text-primary" />
          <h4>Offline Data</h4>
        </div>
        <div class="offline-stats">
          <div class="stat-item">
            <span class="stat-label">Pending Sync:</span>
            <span class="stat-value">{{ pendingSyncItems.length }} items</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Last Sync:</span>
            <span class="stat-value">{{ lastSyncTime }}</span>
          </div>
        </div>
      </div>

      <!-- Storage Info -->
      <div class="setting-section">
        <div class="section-header">
          <CircleStackIcon class="icon-sm text-secondary" />
          <h4>Storage</h4>
        </div>
        <div class="storage-info">
          <div class="storage-bar">
            <div
              class="storage-fill"
              :style="{ width: `${storageInfo.percentage}%` }"
            ></div>
          </div>
          <div class="storage-text">
            <span>{{ formatBytes(storageInfo.used) }} / {{ formatBytes(storageInfo.quota) }}</span>
            <span>{{ storageInfo.percentage }}% used</span>
          </div>
        </div>
      </div>

      <!-- PWA Features -->
      <div class="setting-section">
        <div class="section-header">
          <DevicePhoneMobileIcon class="icon-sm text-accent" />
          <h4>App Features</h4>
        </div>
        <div class="feature-list">
          <div class="feature-item">
            <span>Installed as App:</span>
            <span :class="isInstalled ? 'text-success' : 'text-muted-foreground'">
              {{ isInstalled ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="feature-item">
            <span>Offline Support:</span>
            <span class="text-success">Enabled</span>
          </div>
          <div class="feature-item">
            <span>Push Notifications:</span>
            <span class="text-muted-foreground">Coming Soon</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="settings-actions">
        <button
          v-if="!isInstalled && canInstall"
          @click="installApp"
          class="btn btn-primary"
          :disabled="isInstalling"
        >
          <ArrowDownTrayIcon class="icon-sm" />
          {{ isInstalling ? 'Installing...' : 'Install App' }}
        </button>

        <button
          @click="clearOfflineData"
          class="btn btn-secondary"
          :disabled="isClearing"
        >
          <TrashIcon class="icon-sm" />
          {{ isClearing ? 'Clearing...' : 'Clear Offline Data' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { offlineService } from '@/services/offlineService'
import {
  XMarkIcon,
  WifiIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  CircleStackIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

interface Props {
  embedded?: boolean
}

interface Emits {
  (event: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false
})

const emit = defineEmits<Emits>()

const appStore = useAppStore()

// Reactive state
const isOnline = ref(offlineService.isAppOnline())
const isSyncing = ref(false)
const isInstalling = ref(false)
const isClearing = ref(false)
const pendingSyncItems = ref<any[]>([])
const storageInfo = ref({ used: 0, quota: 0, percentage: 0 })

// Computed
const isInstalled = computed(() => appStore.isInstalled)
const canInstall = computed(() => appStore.canInstall)

const lastSyncTime = computed(() => {
  const lastSync = appStore.getStoredData('pwa_last_sync')
  if (!lastSync) return 'Never'

  const date = new Date(lastSync)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  return date.toLocaleDateString()
})

// Methods
const syncNow = async () => {
  if (!isOnline.value || isSyncing.value) return

  try {
    isSyncing.value = true
    await offlineService.syncData()
    updatePendingItems()
    appStore.showSuccessMessage('Data synced successfully!')
  } catch (error) {
    appStore.showErrorMessage('Failed to sync data')
    console.error('Sync error:', error)
  } finally {
    isSyncing.value = false
  }
}

const installApp = async () => {
  if (!canInstall.value || isInstalling.value) return

  try {
    isInstalling.value = true
    const success = await appStore.installPWA()
    if (success) {
      appStore.showSuccessMessage('App installed successfully!')
      emit('close')
    }
  } catch (error) {
    appStore.showErrorMessage('Failed to install app')
    console.error('Install error:', error)
  } finally {
    isInstalling.value = false
  }
}

const clearOfflineData = async () => {
  if (isClearing.value) return

  if (!confirm('Are you sure you want to clear all offline data? This will remove unsaved changes.')) {
    return
  }

  try {
    isClearing.value = true
    await offlineService.clearOfflineData()
    updatePendingItems()
    updateStorageInfo()
    appStore.showSuccessMessage('Offline data cleared!')
  } catch (error) {
    appStore.showErrorMessage('Failed to clear offline data')
    console.error('Clear data error:', error)
  } finally {
    isClearing.value = false
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const updatePendingItems = () => {
  pendingSyncItems.value = offlineService.getPendingSyncItems()
}

const updateStorageInfo = async () => {
  storageInfo.value = await offlineService.getStorageInfo()
}

// Lifecycle
let networkListener: (() => void) | null = null

onMounted(async () => {
  updatePendingItems()
  await updateStorageInfo()

  // Listen for network changes
  networkListener = offlineService.addNetworkListener((online) => {
    isOnline.value = online
  })
})

onUnmounted(() => {
  if (networkListener) {
    networkListener()
  }
})
</script>

<style scoped>
.pwa-settings {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 600px;
  min-width: 450px;
  max-height: 85vh;
  overflow: hidden;
  border: 1px solid var(--color-gray-200);
}

.pwa-settings.embedded {
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  max-width: none;
  min-width: auto;
  max-height: none;
  border: none;
}


.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.settings-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-gray-900);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-500);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  transition: var(--transition);
}

.close-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.settings-content {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

/* Remove height constraints and padding when embedded */
.pwa-settings.embedded .settings-content {
  padding: 0;
  overflow-y: visible;
  max-height: none;
}

.setting-section {
  margin-bottom: 2rem;
}

.setting-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.section-header h4 {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-gray-800);
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.sync-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition);
}

.sync-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.offline-stats,
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat-item,
.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.stat-label {
  color: var(--color-gray-600);
}

.stat-value {
  color: var(--color-gray-800);
  font-weight: 500;
}

.storage-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.storage-bar {
  width: 100%;
  height: 0.5rem;
  background: var(--color-gray-200);
  border-radius: 9999px;
  overflow: hidden;
}

.storage-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.storage-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-gray-600);
}

.settings-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-gray-200);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .pwa-settings {
    max-width: 95vw;
    min-width: auto;
    max-height: 90vh;
    margin: 0 1rem;
  }

  .settings-header,
  .settings-content {
    padding: 1.25rem;
  }

  .connection-status {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .sync-btn {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .pwa-settings {
    max-width: 100vw;
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }

  .settings-header,
  .settings-content {
    padding: 1rem;
  }

  .setting-section {
    margin-bottom: 1.5rem;
  }
}
</style>