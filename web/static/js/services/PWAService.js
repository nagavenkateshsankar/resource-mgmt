/**
 * Progressive Web App Service
 * Handles advanced PWA features including installation, updates, and capabilities
 */

class PWAService {
    constructor(options = {}) {
        this.options = {
            checkUpdateInterval: 60000, // 1 minute
            enableInstallPrompt: true,
            enableUpdateNotifications: true,
            enableBackgroundSync: true,
            enablePeriodicSync: true,
            ...options
        };
        
        this.registration = null;
        this.installPromptEvent = null;
        this.isInstalled = this.checkInstalled();
        this.isStandalone = this.checkStandalone();
        this.updateCheckInterval = null;
        
        this.capabilities = {
            serviceWorker: 'serviceWorker' in navigator,
            manifest: 'getInstalledRelatedApps' in navigator,
            installPrompt: false,
            backgroundSync: false,
            periodicSync: false,
            webShare: 'share' in navigator,
            fileSystem: 'showOpenFilePicker' in window,
            clipboard: 'clipboard' in navigator,
            geolocation: 'geolocation' in navigator,
            camera: 'mediaDevices' in navigator,
            notifications: 'Notification' in window,
            storage: 'storage' in navigator,
            indexedDB: 'indexedDB' in window
        };
        
        this.init();
    }

    async init() {
        try {
            await this.detectCapabilities();
            await this.setupServiceWorker();
            this.setupInstallPrompt();
            this.setupUpdateChecking();
            this.setupEventListeners();
            
            console.log('PWAService initialized', {
                installed: this.isInstalled,
                standalone: this.isStandalone,
                capabilities: this.capabilities
            });
            
            this.emit('pwa:ready', {
                installed: this.isInstalled,
                standalone: this.isStandalone,
                capabilities: this.capabilities
            });
            
        } catch (error) {
            console.error('Failed to initialize PWA service:', error);
            this.emit('pwa:error', error);
        }
    }

    async detectCapabilities() {
        // Check for install prompt support
        this.capabilities.installPrompt = this.isInstallPromptSupported();
        
        // Check for background sync
        if (this.capabilities.serviceWorker) {
            try {
                const registration = await navigator.serviceWorker.ready;
                this.capabilities.backgroundSync = 'sync' in registration;
                this.capabilities.periodicSync = 'periodicSync' in registration;
            } catch (error) {
                console.warn('Failed to check sync capabilities:', error);
            }
        }
        
        // Test other capabilities
        this.capabilities.webShare = await this.testWebShare();
        this.capabilities.storage = await this.testStorageQuota();
    }

    async setupServiceWorker() {
        if (!this.capabilities.serviceWorker) {
            console.warn('Service Worker not supported');
            return;
        }

        try {
            // Wait for service worker to be ready
            this.registration = await navigator.serviceWorker.ready;
            
            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
            
            // Check for updates immediately
            await this.checkForUpdates();
            
        } catch (error) {
            console.error('Service Worker setup failed:', error);
        }
    }

    setupInstallPrompt() {
        if (!this.options.enableInstallPrompt) return;

        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('Install prompt available');
            
            // Prevent the default install prompt
            event.preventDefault();
            
            // Store the event for later use
            this.installPromptEvent = event;
            
            this.emit('pwa:install-available');
            
            // Show custom install UI after a delay
            if (!this.isInstalled && !this.isStandalone) {
                setTimeout(() => this.showInstallBanner(), 3000);
            }
        });

        // Listen for appinstalled event
        window.addEventListener('appinstalled', (event) => {
            console.log('PWA installed');
            this.isInstalled = true;
            this.installPromptEvent = null;
            
            this.emit('pwa:installed');
            this.hideInstallBanner();
            
            // Show success message
            this.showInstallSuccessMessage();
        });
    }

    setupUpdateChecking() {
        if (!this.options.enableUpdateNotifications) return;

        // Check for updates periodically
        this.updateCheckInterval = setInterval(() => {
            this.checkForUpdates();
        }, this.options.checkUpdateInterval);

        // Check for updates when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });
    }

    setupEventListeners() {
        // Handle online/offline events
        window.addEventListener('online', () => {
            this.emit('pwa:online');
            this.handleConnectivityChange(true);
        });

        window.addEventListener('offline', () => {
            this.emit('pwa:offline');
            this.handleConnectivityChange(false);
        });

        // Handle app state changes
        document.addEventListener('visibilitychange', () => {
            this.emit('pwa:visibility-change', {
                visible: !document.hidden,
                visibilityState: document.visibilityState
            });
        });

        // Handle fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.emit('pwa:fullscreen-change', {
                fullscreen: !!document.fullscreenElement
            });
        });
    }

    // Service Worker messaging
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'SW_UPDATED':
                this.handleServiceWorkerUpdate(data);
                break;
            case 'SW_CACHED':
                this.handleContentCached(data);
                break;
            case 'SW_OFFLINE_READY':
                this.handleOfflineReady();
                break;
            case 'BACKGROUND_SYNC_SUCCESS':
                this.handleBackgroundSyncSuccess(data);
                break;
            case 'BACKGROUND_SYNC_FAILED':
                this.handleBackgroundSyncFailed(data);
                break;
            default:
                console.log('Unknown service worker message:', type, data);
        }
    }

    handleServiceWorkerUpdate(data) {
        console.log('Service worker updated:', data);
        this.emit('pwa:update-available', data);
        
        if (this.options.enableUpdateNotifications) {
            this.showUpdateNotification(data);
        }
    }

    handleContentCached(data) {
        console.log('Content cached:', data);
        this.emit('pwa:content-cached', data);
    }

    handleOfflineReady() {
        console.log('App ready for offline use');
        this.emit('pwa:offline-ready');
        
        // Show offline ready notification
        this.showNotification({
            title: 'Ready for Offline Use',
            message: 'The app is now available offline.',
            type: 'success',
            duration: 5000
        });
    }

    // Installation
    async promptInstall() {
        if (!this.installPromptEvent) {
            console.warn('Install prompt not available');
            return false;
        }

        try {
            // Show the install prompt
            this.installPromptEvent.prompt();
            
            // Wait for user's choice
            const { outcome } = await this.installPromptEvent.userChoice;
            
            console.log('Install prompt outcome:', outcome);
            
            if (outcome === 'accepted') {
                this.emit('pwa:install-accepted');
            } else {
                this.emit('pwa:install-dismissed');
            }
            
            // Clear the prompt event
            this.installPromptEvent = null;
            
            return outcome === 'accepted';
            
        } catch (error) {
            console.error('Install prompt failed:', error);
            return false;
        }
    }

    showInstallBanner() {
        const banner = this.createInstallBanner();
        document.body.appendChild(banner);
        
        // Animate in
        setTimeout(() => banner.classList.add('visible'), 100);
        
        this.emit('pwa:install-banner-shown');
    }

    createInstallBanner() {
        const banner = document.createElement('div');
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="install-banner-content">
                <div class="install-banner-icon">📱</div>
                <div class="install-banner-text">
                    <h3>Install Site Inspection Manager</h3>
                    <p>Get the full app experience with offline access</p>
                </div>
                <div class="install-banner-actions">
                    <button class="btn btn-primary" data-action="install">Install</button>
                    <button class="btn btn-secondary" data-action="dismiss">Not Now</button>
                </div>
                <button class="install-banner-close" data-action="close">&times;</button>
            </div>
        `;

        // Handle banner interactions
        banner.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
            
            switch (action) {
                case 'install':
                    this.promptInstall();
                    this.hideInstallBanner();
                    break;
                case 'dismiss':
                case 'close':
                    this.hideInstallBanner();
                    this.trackInstallBannerDismissed();
                    break;
            }
        });

        return banner;
    }

    hideInstallBanner() {
        const banner = document.querySelector('.pwa-install-banner');
        if (banner) {
            banner.classList.add('hidden');
            setTimeout(() => banner.remove(), 300);
        }
    }

    showInstallSuccessMessage() {
        this.showNotification({
            title: 'App Installed!',
            message: 'Site Inspection Manager is now installed and ready to use offline.',
            type: 'success',
            duration: 8000
        });
    }

    // Updates
    async checkForUpdates() {
        if (!this.registration) return;

        try {
            await this.registration.update();
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    showUpdateNotification(data) {
        const notification = {
            title: 'App Update Available',
            message: `Version ${data.version || 'latest'} is ready to install.`,
            type: 'info',
            persistent: true,
            actions: [
                {
                    text: 'Update Now',
                    class: 'btn-primary',
                    action: () => this.applyUpdate()
                },
                {
                    text: 'Later',
                    class: 'btn-secondary',
                    action: () => this.postponeUpdate()
                }
            ]
        };

        this.showNotification(notification);
        this.emit('pwa:update-notification-shown', data);
    }

    async applyUpdate() {
        try {
            // Send message to service worker to skip waiting
            if (this.registration && this.registration.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Reload the page to activate the new service worker
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
            this.emit('pwa:update-applied');
            
        } catch (error) {
            console.error('Failed to apply update:', error);
            this.emit('pwa:update-failed', error);
        }
    }

    postponeUpdate() {
        console.log('Update postponed');
        this.emit('pwa:update-postponed');
    }

    // Background and Periodic Sync
    async requestBackgroundSync(tag) {
        if (!this.capabilities.backgroundSync) {
            console.warn('Background sync not supported');
            return false;
        }

        try {
            await this.registration.sync.register(tag);
            console.log('Background sync registered:', tag);
            return true;
        } catch (error) {
            console.error('Background sync registration failed:', error);
            return false;
        }
    }

    async requestPeriodicSync(tag, options = {}) {
        if (!this.capabilities.periodicSync) {
            console.warn('Periodic sync not supported');
            return false;
        }

        try {
            const status = await navigator.permissions.query({
                name: 'periodic-background-sync'
            });

            if (status.state !== 'granted') {
                console.warn('Periodic sync permission not granted');
                return false;
            }

            await this.registration.periodicSync.register(tag, {
                minInterval: 24 * 60 * 60 * 1000, // 24 hours
                ...options
            });

            console.log('Periodic sync registered:', tag);
            return true;
        } catch (error) {
            console.error('Periodic sync registration failed:', error);
            return false;
        }
    }

    handleBackgroundSyncSuccess(data) {
        console.log('Background sync completed:', data);
        this.emit('pwa:sync-success', data);
    }

    handleBackgroundSyncFailed(data) {
        console.error('Background sync failed:', data);
        this.emit('pwa:sync-failed', data);
    }

    // Connectivity handling
    handleConnectivityChange(isOnline) {
        if (isOnline) {
            // Trigger background sync when coming back online
            this.requestBackgroundSync('connectivity-sync');
        }
        
        // Update UI indicators
        this.updateConnectivityIndicators(isOnline);
    }

    updateConnectivityIndicators(isOnline) {
        document.body.classList.toggle('app-offline', !isOnline);
        document.body.classList.toggle('app-online', isOnline);
    }

    // Web Share API
    async share(data) {
        if (!this.capabilities.webShare) {
            // Fallback to custom share modal
            this.showCustomShareModal(data);
            return false;
        }

        try {
            await navigator.share(data);
            console.log('Content shared successfully');
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Share cancelled by user');
            } else {
                console.error('Share failed:', error);
                this.showCustomShareModal(data);
            }
            return false;
        }
    }

    showCustomShareModal(data) {
        this.emit('pwa:show-share-modal', data);
    }

    // Storage Management
    async getStorageEstimate() {
        if (!this.capabilities.storage) {
            return null;
        }

        try {
            const estimate = await navigator.storage.estimate();
            return {
                quota: estimate.quota,
                usage: estimate.usage,
                usagePercentage: Math.round((estimate.usage / estimate.quota) * 100),
                available: estimate.quota - estimate.usage
            };
        } catch (error) {
            console.error('Failed to get storage estimate:', error);
            return null;
        }
    }

    async requestPersistentStorage() {
        if (!this.capabilities.storage) {
            return false;
        }

        try {
            const granted = await navigator.storage.persist();
            console.log('Persistent storage:', granted ? 'granted' : 'denied');
            return granted;
        } catch (error) {
            console.error('Failed to request persistent storage:', error);
            return false;
        }
    }

    // Fullscreen API
    async requestFullscreen() {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
                return true;
            }
        } catch (error) {
            console.error('Fullscreen request failed:', error);
        }
        return false;
    }

    async exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
                return true;
            }
        } catch (error) {
            console.error('Exit fullscreen failed:', error);
        }
        return false;
    }

    isFullscreen() {
        return !!document.fullscreenElement;
    }

    // Utility methods
    checkInstalled() {
        // Check if running as installed PWA
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
    }

    checkStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches;
    }

    isInstallPromptSupported() {
        return 'BeforeInstallPromptEvent' in window;
    }

    async testWebShare() {
        return 'share' in navigator && 
               'canShare' in navigator && 
               navigator.canShare({ title: 'Test' });
    }

    async testStorageQuota() {
        return 'storage' in navigator && 'estimate' in navigator.storage;
    }

    trackInstallBannerDismissed() {
        // Track analytics
        this.emit('pwa:install-banner-dismissed');
    }

    // Notifications
    showNotification(options) {
        this.emit('pwa:show-notification', options);
    }

    // Event emitter
    emit(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Public API
    getStatus() {
        return {
            installed: this.isInstalled,
            standalone: this.isStandalone,
            installPromptAvailable: !!this.installPromptEvent,
            capabilities: this.capabilities,
            online: navigator.onLine
        };
    }

    getCapabilities() {
        return { ...this.capabilities };
    }

    // Cleanup
    destroy() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
        
        this.hideInstallBanner();
    }

    // Static factory method
    static async create(options = {}) {
        const service = new PWAService(options);
        return service;
    }
}

// Add PWA install banner styles
const pwaStyles = `
<style>
.pwa-install-banner {
    position: fixed;
    bottom: -100px;
    left: 1rem;
    right: 1rem;
    max-width: 500px;
    margin: 0 auto;
    background: var(--card-bg);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 10000;
    transform: translateY(0);
    transition: all 0.3s ease;
}

.pwa-install-banner.visible {
    bottom: 1rem;
}

.pwa-install-banner.hidden {
    transform: translateY(100%);
    opacity: 0;
}

.install-banner-content {
    display: flex;
    align-items: center;
    padding: 1rem;
    gap: 1rem;
    position: relative;
}

.install-banner-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.install-banner-text {
    flex: 1;
}

.install-banner-text h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    color: var(--text-primary);
}

.install-banner-text p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.install-banner-actions {
    display: flex;
    gap: 0.5rem;
}

.install-banner-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.install-banner-close:hover {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

@media (max-width: 768px) {
    .install-banner-content {
        flex-direction: column;
        text-align: center;
    }
    
    .install-banner-actions {
        width: 100%;
    }
    
    .install-banner-actions .btn {
        flex: 1;
    }
}
</style>
`;

// Inject styles
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', pwaStyles);
}

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Create design system documentation", "status": "completed"}, {"id": "2", "content": "Implement component library with examples", "status": "completed"}, {"id": "3", "content": "Create style guide and theme system", "status": "completed"}, {"id": "4", "content": "Refactor JavaScript into modular architecture", "status": "completed"}, {"id": "5", "content": "Create component JavaScript modules", "status": "completed"}, {"id": "6", "content": "Implement state management system", "status": "completed"}, {"id": "7", "content": "Create API service layer", "status": "completed"}, {"id": "8", "content": "Add offline sync capabilities", "status": "completed"}, {"id": "9", "content": "Implement push notifications", "status": "completed"}, {"id": "10", "content": "Add advanced PWA features", "status": "completed"}]