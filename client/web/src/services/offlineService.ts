/**
 * Offline Service for PWA Capabilities
 * Handles offline data storage, synchronization, and background sync
 */

interface OfflineData {
  id: string
  type: 'inspection' | 'template' | 'user'
  data: any
  timestamp: number
  synced: boolean
  action: 'create' | 'update' | 'delete'
}

interface SyncQueue {
  items: OfflineData[]
  lastSync: number
}

class OfflineService {
  private readonly STORAGE_KEYS = {
    SYNC_QUEUE: 'pwa_sync_queue',
    OFFLINE_DATA: 'pwa_offline_data',
    LAST_SYNC: 'pwa_last_sync'
  }

  private syncQueue: OfflineData[] = []
  private isOnline = navigator.onLine
  private listeners: Array<(isOnline: boolean) => void> = []

  constructor() {
    this.initializeService()
  }

  private initializeService() {
    // Load existing sync queue
    this.loadSyncQueue()

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Listen for visibility changes to trigger sync
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.registerBackgroundSync()
    }
  }

  /**
   * Add data to offline storage and sync queue
   */
  async storeOfflineData(type: OfflineData['type'], action: OfflineData['action'], data: any): Promise<string> {
    const id = this.generateId()
    const offlineItem: OfflineData = {
      id,
      type,
      data,
      timestamp: Date.now(),
      synced: false,
      action
    }

    // Add to sync queue
    this.syncQueue.push(offlineItem)
    await this.saveSyncQueue()

    // Store in offline cache
    await this.saveToOfflineStorage(offlineItem)

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncData()
    }

    return id
  }

  /**
   * Get offline data by type
   */
  async getOfflineData(type?: OfflineData['type']): Promise<OfflineData[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.OFFLINE_DATA)
      if (!stored) return []

      const allData: OfflineData[] = JSON.parse(stored)
      return type ? allData.filter(item => item.type === type) : allData
    } catch (error) {
      console.error('Error loading offline data:', error)
      return []
    }
  }

  /**
   * Get pending sync items
   */
  getPendingSyncItems(): OfflineData[] {
    return this.syncQueue.filter(item => !item.synced)
  }

  /**
   * Manually trigger sync
   */
  async syncData(): Promise<boolean> {
    if (!this.isOnline) {
      console.log('Cannot sync: offline')
      return false
    }

    const pendingItems = this.getPendingSyncItems()
    if (pendingItems.length === 0) {
      console.log('No pending items to sync')
      return true
    }

    console.log(`Syncing ${pendingItems.length} items...`)

    let successCount = 0
    for (const item of pendingItems) {
      try {
        const success = await this.syncItem(item)
        if (success) {
          item.synced = true
          successCount++
        }
      } catch (error) {
        console.error('Error syncing item:', error)
      }
    }

    // Update sync queue and storage
    await this.saveSyncQueue()
    await this.cleanupSyncedItems()

    console.log(`Synced ${successCount}/${pendingItems.length} items`)
    return successCount === pendingItems.length
  }

  /**
   * Check if app is online
   */
  isAppOnline(): boolean {
    return this.isOnline
  }

  /**
   * Add listener for online/offline state changes
   */
  addNetworkListener(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{ used: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: estimate.quota ? Math.round(((estimate.usage || 0) / estimate.quota) * 100) : 0
        }
      } catch (error) {
        console.error('Error getting storage estimate:', error)
      }
    }

    return { used: 0, quota: 0, percentage: 0 }
  }

  /**
   * Clear offline data and sync queue
   */
  async clearOfflineData(): Promise<void> {
    this.syncQueue = []
    localStorage.removeItem(this.STORAGE_KEYS.SYNC_QUEUE)
    localStorage.removeItem(this.STORAGE_KEYS.OFFLINE_DATA)
    localStorage.removeItem(this.STORAGE_KEYS.LAST_SYNC)
  }

  // Private methods

  private async syncItem(item: OfflineData): Promise<boolean> {
    // Mock API sync - in real app, this would call the actual API
    console.log(`Syncing ${item.action} ${item.type} with ID: ${item.id}`)

    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 100))

    // For demo purposes, always return success
    // In real app, implement actual API calls based on item type and action
    return Math.random() > 0.1 // 90% success rate for demo
  }

  private handleOnline() {
    console.log('App is online')
    this.isOnline = true
    this.notifyListeners(true)

    // Trigger sync when coming online
    setTimeout(() => this.syncData(), 1000)
  }

  private handleOffline() {
    console.log('App is offline')
    this.isOnline = false
    this.notifyListeners(false)
  }

  private handleVisibilityChange() {
    if (!document.hidden && this.isOnline) {
      // App became visible and we're online - try to sync
      this.syncData()
    }
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline)
      } catch (error) {
        console.error('Error notifying network listener:', error)
      }
    })
  }

  private async registerBackgroundSync() {
    try {
      const registration = await navigator.serviceWorker.ready
      if ('sync' in registration) {
        console.log('Background sync registered')
        // Register background sync event
        await registration.sync.register('background-sync')
      }
    } catch (error) {
      console.error('Error registering background sync:', error)
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.SYNC_QUEUE)
      if (stored) {
        const syncData: SyncQueue = JSON.parse(stored)
        this.syncQueue = syncData.items || []
      }
    } catch (error) {
      console.error('Error loading sync queue:', error)
      this.syncQueue = []
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      const syncData: SyncQueue = {
        items: this.syncQueue,
        lastSync: Date.now()
      }
      localStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(syncData))
    } catch (error) {
      console.error('Error saving sync queue:', error)
    }
  }

  private async saveToOfflineStorage(item: OfflineData): Promise<void> {
    try {
      const existing = await this.getOfflineData()
      const updated = [...existing.filter(i => i.id !== item.id), item]
      localStorage.setItem(this.STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(updated))
    } catch (error) {
      console.error('Error saving to offline storage:', error)
    }
  }

  private async cleanupSyncedItems(): Promise<void> {
    // Remove synced items older than 7 days
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    this.syncQueue = this.syncQueue.filter(item =>
      !item.synced || item.timestamp > weekAgo
    )

    // Also cleanup offline storage
    const offlineData = await this.getOfflineData()
    const cleanedData = offlineData.filter(item =>
      !item.synced || item.timestamp > weekAgo
    )
    localStorage.setItem(this.STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(cleanedData))
  }
}

// Export singleton instance
export const offlineService = new OfflineService()

export default OfflineService