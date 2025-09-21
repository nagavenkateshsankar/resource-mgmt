/**
 * Offline Manager
 * Handles offline data synchronization and storage
 */

class OfflineManager {
    constructor(apiClient) {
        this.api = apiClient;
        this.dbName = 'SiteInspectionDB';
        this.dbVersion = 1;
        this.db = null;
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncInterval = null;
        this.retryAttempts = 3;
        this.retryDelay = 5000;
        
        this.stores = {
            inspections: 'inspections',
            templates: 'templates',
            attachments: 'attachments',
            syncQueue: 'sync_queue',
            settings: 'settings'
        };
        
        this.init();
    }

    async init() {
        try {
            await this.initDatabase();
            this.setupEventListeners();
            this.startSyncInterval();
            
            // Initial sync if online
            if (this.isOnline) {
                setTimeout(() => this.syncAll(), 1000);
            }
            
            console.log('OfflineManager initialized');
        } catch (error) {
            console.error('Failed to initialize OfflineManager:', error);
        }
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create inspections store
                if (!db.objectStoreNames.contains(this.stores.inspections)) {
                    const inspectionStore = db.createObjectStore(this.stores.inspections, {
                        keyPath: 'id'
                    });
                    inspectionStore.createIndex('status', 'status', { unique: false });
                    inspectionStore.createIndex('updated_at', 'updated_at', { unique: false });
                    inspectionStore.createIndex('sync_status', 'sync_status', { unique: false });
                }
                
                // Create templates store
                if (!db.objectStoreNames.contains(this.stores.templates)) {
                    const templateStore = db.createObjectStore(this.stores.templates, {
                        keyPath: 'id'
                    });
                    templateStore.createIndex('category', 'category', { unique: false });
                }
                
                // Create attachments store
                if (!db.objectStoreNames.contains(this.stores.attachments)) {
                    const attachmentStore = db.createObjectStore(this.stores.attachments, {
                        keyPath: 'id'
                    });
                    attachmentStore.createIndex('inspection_id', 'inspection_id', { unique: false });
                    attachmentStore.createIndex('sync_status', 'sync_status', { unique: false });
                }
                
                // Create sync queue store
                if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
                    const syncStore = db.createObjectStore(this.stores.syncQueue, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    syncStore.createIndex('priority', 'priority', { unique: false });
                    syncStore.createIndex('created_at', 'created_at', { unique: false });
                }
                
                // Create settings store
                if (!db.objectStoreNames.contains(this.stores.settings)) {
                    db.createObjectStore(this.stores.settings, {
                        keyPath: 'key'
                    });
                }
            };
        });
    }

    setupEventListeners() {
        // Online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.emit('offline:status-change', true);
            this.syncAll();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.emit('offline:status-change', false);
        });
        
        // Beforeunload - try to sync pending changes
        window.addEventListener('beforeunload', () => {
            if (!this.isOnline) return;
            
            // Quick sync attempt
            this.syncPendingChanges();
        });
        
        // Page visibility - sync when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.syncAll();
            }
        });
    }

    // Data storage methods
    async store(storeName, data, syncStatus = 'synced') {
        try {
            const dataWithMeta = {
                ...data,
                sync_status: syncStatus,
                local_updated_at: new Date().toISOString()
            };
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await this.promisifyRequest(store.put(dataWithMeta));
            
            // If not synced, add to sync queue
            if (syncStatus !== 'synced') {
                await this.addToSyncQueue({
                    action: 'update',
                    store: storeName,
                    data: dataWithMeta,
                    priority: this.getSyncPriority(storeName)
                });
            }
            
            this.emit('offline:stored', { store: storeName, data: dataWithMeta });
            return dataWithMeta;
            
        } catch (error) {
            console.error('Failed to store data:', error);
            throw error;
        }
    }

    async get(storeName, id) {
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            return await this.promisifyRequest(store.get(id));
        } catch (error) {
            console.error('Failed to get data:', error);
            throw error;
        }
    }

    async getAll(storeName, options = {}) {
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            
            if (options.index) {
                const index = store.index(options.index);
                request = options.value ? index.getAll(options.value) : index.getAll();
            } else {
                request = store.getAll();
            }
            
            const results = await this.promisifyRequest(request);
            
            // Apply filters
            if (options.filter) {
                return results.filter(options.filter);
            }
            
            // Apply sorting
            if (options.sort) {
                return results.sort(options.sort);
            }
            
            return results;
        } catch (error) {
            console.error('Failed to get all data:', error);
            throw error;
        }
    }

    async delete(storeName, id) {
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await this.promisifyRequest(store.delete(id));
            
            // Add deletion to sync queue
            await this.addToSyncQueue({
                action: 'delete',
                store: storeName,
                id: id,
                priority: this.getSyncPriority(storeName)
            });
            
            this.emit('offline:deleted', { store: storeName, id });
            
        } catch (error) {
            console.error('Failed to delete data:', error);
            throw error;
        }
    }

    // Sync queue management
    async addToSyncQueue(syncItem) {
        try {
            const item = {
                ...syncItem,
                created_at: new Date().toISOString(),
                attempts: 0,
                status: 'pending'
            };
            
            const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
            const store = transaction.objectStore(this.stores.syncQueue);
            
            await this.promisifyRequest(store.add(item));
            
            // Try immediate sync if online
            if (this.isOnline && !this.isSyncing) {
                setTimeout(() => this.processSyncQueue(), 100);
            }
            
        } catch (error) {
            console.error('Failed to add to sync queue:', error);
        }
    }

    async getSyncQueue() {
        try {
            const transaction = this.db.transaction([this.stores.syncQueue], 'readonly');
            const store = transaction.objectStore(this.stores.syncQueue);
            const index = store.index('priority');
            
            return await this.promisifyRequest(index.getAll());
        } catch (error) {
            console.error('Failed to get sync queue:', error);
            return [];
        }
    }

    async removeSyncQueueItem(id) {
        try {
            const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
            const store = transaction.objectStore(this.stores.syncQueue);
            
            await this.promisifyRequest(store.delete(id));
        } catch (error) {
            console.error('Failed to remove sync queue item:', error);
        }
    }

    // Sync operations
    async syncAll() {
        if (!this.isOnline || this.isSyncing) return;
        
        this.isSyncing = true;
        this.emit('offline:sync-start');
        
        try {
            // Sync from server first
            await this.syncFromServer();
            
            // Then sync local changes to server
            await this.processSyncQueue();
            
            this.emit('offline:sync-complete');
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.emit('offline:sync-error', error);
        } finally {
            this.isSyncing = false;
        }
    }

    async syncFromServer() {
        try {
            // Get last sync timestamp
            const lastSync = await this.getLastSyncTime();
            
            // Sync inspections
            await this.syncInspectionsFromServer(lastSync);
            
            // Sync templates
            await this.syncTemplatesFromServer(lastSync);
            
            // Update last sync time
            await this.setLastSyncTime(new Date().toISOString());
            
        } catch (error) {
            console.error('Failed to sync from server:', error);
            throw error;
        }
    }

    async syncInspectionsFromServer(lastSync) {
        try {
            const params = lastSync ? { updated_since: lastSync } : {};
            const response = await this.api.get('/inspections', { params });
            const inspections = response.data.inspections || response.data;
            
            for (const inspection of inspections) {
                await this.store(this.stores.inspections, inspection, 'synced');
            }
            
            console.log(`Synced ${inspections.length} inspections from server`);
            
        } catch (error) {
            console.error('Failed to sync inspections from server:', error);
        }
    }

    async syncTemplatesFromServer(lastSync) {
        try {
            const params = lastSync ? { updated_since: lastSync } : {};
            const response = await this.api.get('/templates', { params });
            const templates = response.data.templates || response.data;
            
            for (const template of templates) {
                await this.store(this.stores.templates, template, 'synced');
            }
            
            console.log(`Synced ${templates.length} templates from server`);
            
        } catch (error) {
            console.error('Failed to sync templates from server:', error);
        }
    }

    async processSyncQueue() {
        if (!this.isOnline) return;
        
        const queue = await this.getSyncQueue();
        const pendingItems = queue.filter(item => item.status === 'pending');
        
        console.log(`Processing ${pendingItems.length} sync queue items`);
        
        for (const item of pendingItems) {
            try {
                await this.syncItem(item);
                await this.removeSyncQueueItem(item.id);
                
            } catch (error) {
                console.error('Failed to sync item:', error);
                await this.updateSyncQueueItemStatus(item.id, 'failed', error.message);
                
                // Retry logic
                if (item.attempts < this.retryAttempts) {
                    setTimeout(() => {
                        this.retrySyncItem(item.id);
                    }, this.retryDelay * (item.attempts + 1));
                }
            }
        }
    }

    async syncItem(item) {
        switch (item.action) {
            case 'create':
                await this.syncCreateItem(item);
                break;
            case 'update':
                await this.syncUpdateItem(item);
                break;
            case 'delete':
                await this.syncDeleteItem(item);
                break;
            default:
                console.warn('Unknown sync action:', item.action);
        }
    }

    async syncCreateItem(item) {
        const endpoint = this.getEndpoint(item.store);
        const response = await this.api.post(endpoint, item.data);
        
        // Update local data with server ID
        if (response.data && response.data.id) {
            item.data.id = response.data.id;
            await this.store(item.store, item.data, 'synced');
        }
    }

    async syncUpdateItem(item) {
        const endpoint = `${this.getEndpoint(item.store)}/${item.data.id}`;
        await this.api.put(endpoint, item.data);
        
        // Mark as synced
        await this.store(item.store, { ...item.data, sync_status: 'synced' });
    }

    async syncDeleteItem(item) {
        const endpoint = `${this.getEndpoint(item.store)}/${item.id}`;
        await this.api.delete(endpoint);
    }

    // Conflict resolution
    async handleSyncConflict(localData, serverData) {
        // Simple last-write-wins strategy
        const localTime = new Date(localData.local_updated_at || localData.updated_at);
        const serverTime = new Date(serverData.updated_at);
        
        if (serverTime > localTime) {
            // Server wins
            return serverData;
        } else {
            // Local wins - need to sync to server
            await this.addToSyncQueue({
                action: 'update',
                store: this.getStoreFromData(localData),
                data: localData,
                priority: 1
            });
            return localData;
        }
    }

    // Utility methods
    async promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getSyncPriority(storeName) {
        const priorities = {
            [this.stores.inspections]: 1,
            [this.stores.attachments]: 2,
            [this.stores.templates]: 3,
            [this.stores.settings]: 4
        };
        return priorities[storeName] || 5;
    }

    getEndpoint(storeName) {
        const endpoints = {
            [this.stores.inspections]: '/inspections',
            [this.stores.templates]: '/templates',
            [this.stores.attachments]: '/attachments'
        };
        return endpoints[storeName];
    }

    getStoreFromData(data) {
        // Simple heuristic based on data properties
        if (data.template_id) return this.stores.inspections;
        if (data.fields) return this.stores.templates;
        if (data.file_path) return this.stores.attachments;
        return this.stores.inspections; // default
    }

    // Settings management
    async getLastSyncTime() {
        try {
            const setting = await this.get(this.stores.settings, 'last_sync');
            return setting ? setting.value : null;
        } catch (error) {
            return null;
        }
    }

    async setLastSyncTime(timestamp) {
        try {
            const transaction = this.db.transaction([this.stores.settings], 'readwrite');
            const store = transaction.objectStore(this.stores.settings);
            
            await this.promisifyRequest(store.put({
                key: 'last_sync',
                value: timestamp,
                updated_at: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Failed to set last sync time:', error);
        }
    }

    // Manual sync operations
    async manualSync() {
        if (this.isSyncing) {
            console.warn('Sync already in progress');
            return;
        }
        
        this.emit('offline:manual-sync-start');
        await this.syncAll();
    }

    async syncPendingChanges() {
        if (!this.isOnline) return;
        
        try {
            await this.processSyncQueue();
        } catch (error) {
            console.error('Failed to sync pending changes:', error);
        }
    }

    // Background sync
    startSyncInterval() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Sync every 5 minutes when online
        this.syncInterval = setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.syncAll();
            }
        }, 5 * 60 * 1000);
    }

    stopSyncInterval() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Status and statistics
    async getSyncStatus() {
        const queue = await this.getSyncQueue();
        const pending = queue.filter(item => item.status === 'pending').length;
        const failed = queue.filter(item => item.status === 'failed').length;
        
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            pendingItems: pending,
            failedItems: failed,
            lastSync: await this.getLastSyncTime()
        };
    }

    async getStorageStats() {
        const stats = {};
        
        for (const [key, storeName] of Object.entries(this.stores)) {
            try {
                const items = await this.getAll(storeName);
                stats[key] = {
                    total: items.length,
                    synced: items.filter(item => item.sync_status === 'synced').length,
                    pending: items.filter(item => item.sync_status === 'pending').length
                };
            } catch (error) {
                stats[key] = { error: error.message };
            }
        }
        
        return stats;
    }

    // Event emitter
    emit(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Cleanup
    async clearAll() {
        const transaction = this.db.transaction(Object.values(this.stores), 'readwrite');
        
        for (const storeName of Object.values(this.stores)) {
            const store = transaction.objectStore(storeName);
            await this.promisifyRequest(store.clear());
        }
        
        this.emit('offline:cleared');
    }

    destroy() {
        this.stopSyncInterval();
        
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineManager;
} else {
    window.OfflineManager = OfflineManager;
}