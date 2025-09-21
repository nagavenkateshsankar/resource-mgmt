/**
 * Push Notification Service
 * Handles web push notifications and service worker communication
 */

class PushNotificationService {
    constructor(options = {}) {
        this.options = {
            vapidPublicKey: options.vapidPublicKey,
            serverEndpoint: '/api/v1/notifications',
            showNotifications: true,
            requestPermissionOnLoad: false,
            ...options
        };
        
        this.registration = null;
        this.subscription = null;
        this.permission = 'default';
        this.isSupported = this.checkSupport();
        
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Push notifications not supported');
            return;
        }

        try {
            // Get service worker registration
            this.registration = await navigator.serviceWorker.ready;
            
            // Check current permission
            this.permission = Notification.permission;
            
            // Get existing subscription
            this.subscription = await this.registration.pushManager.getSubscription();
            
            // Setup message listener
            this.setupMessageListener();
            
            // Auto-request permission if configured
            if (this.options.requestPermissionOnLoad && this.permission === 'default') {
                setTimeout(() => this.requestPermission(), 2000);
            }
            
            console.log('PushNotificationService initialized');
            this.emit('push:ready', { 
                supported: this.isSupported,
                permission: this.permission,
                subscribed: !!this.subscription
            });
            
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
            this.emit('push:error', error);
        }
    }

    checkSupport() {
        return 'serviceWorker' in navigator && 
               'PushManager' in window && 
               'Notification' in window;
    }

    // Permission management
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push notifications not supported');
        }

        if (this.permission === 'granted') {
            return 'granted';
        }

        try {
            // Request permission
            this.permission = await Notification.requestPermission();
            
            this.emit('push:permission-changed', this.permission);
            
            if (this.permission === 'granted') {
                // Auto-subscribe if permission granted
                await this.subscribe();
            } else if (this.permission === 'denied') {
                this.showPermissionDeniedGuidance();
            }
            
            return this.permission;
            
        } catch (error) {
            console.error('Failed to request permission:', error);
            throw error;
        }
    }

    showPermissionDeniedGuidance() {
        const notification = {
            title: 'Notifications Blocked',
            message: 'To receive important updates about your inspections, please enable notifications in your browser settings.',
            type: 'warning',
            persistent: true,
            actions: [
                {
                    text: 'Show Guide',
                    action: () => this.showNotificationGuide()
                }
            ]
        };
        
        this.emit('push:show-notification', notification);
    }

    showNotificationGuide() {
        const guide = {
            title: 'Enable Notifications',
            content: `
                <div class="notification-guide">
                    <h3>How to enable notifications:</h3>
                    <ol>
                        <li>Click the lock or info icon in your address bar</li>
                        <li>Select "Allow" for notifications</li>
                        <li>Refresh this page</li>
                    </ol>
                    <p>You can also enable them in your browser settings under Privacy & Security > Notifications.</p>
                </div>
            `,
            size: 'md'
        };
        
        this.emit('push:show-modal', guide);
    }

    // Subscription management
    async subscribe() {
        if (!this.isSupported || this.permission !== 'granted') {
            throw new Error('Cannot subscribe: permission not granted or not supported');
        }

        if (this.subscription) {
            console.log('Already subscribed to push notifications');
            return this.subscription;
        }

        try {
            // Subscribe to push manager
            this.subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.options.vapidPublicKey)
            });
            
            // Send subscription to server
            await this.sendSubscriptionToServer(this.subscription);
            
            this.emit('push:subscribed', this.subscription);
            
            // Show success notification
            this.showLocalNotification({
                title: 'Notifications Enabled',
                body: 'You will now receive important updates about your inspections.',
                icon: '/static/images/icon-192.png',
                tag: 'subscription-success'
            });
            
            return this.subscription;
            
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            
            // Handle specific errors
            if (error.name === 'NotAllowedError') {
                this.showPermissionDeniedGuidance();
            } else if (error.name === 'NotSupportedError') {
                this.showNotSupported();
            }
            
            throw error;
        }
    }

    async unsubscribe() {
        if (!this.subscription) {
            console.log('Not subscribed to push notifications');
            return true;
        }

        try {
            // Unsubscribe from push manager
            const success = await this.subscription.unsubscribe();
            
            if (success) {
                // Remove subscription from server
                await this.removeSubscriptionFromServer(this.subscription);
                
                this.subscription = null;
                this.emit('push:unsubscribed');
                
                console.log('Successfully unsubscribed from push notifications');
            }
            
            return success;
            
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            throw error;
        }
    }

    // Server communication
    async sendSubscriptionToServer(subscription) {
        const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
                auth: this.arrayBufferToBase64(subscription.getKey('auth'))
            },
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString()
        };

        try {
            const response = await fetch(`${this.options.serverEndpoint}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(subscriptionData)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Subscription sent to server:', result);
            
            return result;
            
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
            throw error;
        }
    }

    async removeSubscriptionFromServer(subscription) {
        try {
            const response = await fetch(`${this.options.serverEndpoint}/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            console.log('Subscription removed from server');
            
        } catch (error) {
            console.error('Failed to remove subscription from server:', error);
            // Don't throw - local unsubscribe can succeed even if server fails
        }
    }

    // Message handling
    setupMessageListener() {
        navigator.serviceWorker.addEventListener('message', (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'PUSH_NOTIFICATION_RECEIVED':
                    this.handlePushNotification(data);
                    break;
                case 'NOTIFICATION_CLICKED':
                    this.handleNotificationClick(data);
                    break;
                case 'NOTIFICATION_CLOSED':
                    this.handleNotificationClose(data);
                    break;
                default:
                    console.log('Unknown service worker message:', type, data);
            }
        });
    }

    handlePushNotification(data) {
        console.log('Push notification received:', data);
        
        this.emit('push:received', data);
        
        // Handle different notification types
        switch (data.type) {
            case 'inspection_assigned':
                this.handleInspectionAssigned(data);
                break;
            case 'inspection_due':
                this.handleInspectionDue(data);
                break;
            case 'inspection_overdue':
                this.handleInspectionOverdue(data);
                break;
            case 'system_update':
                this.handleSystemUpdate(data);
                break;
            default:
                this.handleGenericNotification(data);
        }
    }

    handleNotificationClick(data) {
        console.log('Notification clicked:', data);
        
        this.emit('push:clicked', data);
        
        // Navigate to relevant page based on notification data
        if (data.action) {
            this.executeNotificationAction(data.action, data);
        } else if (data.url) {
            window.focus();
            window.location.href = data.url;
        }
        
        // Track click
        this.trackNotificationInteraction('click', data);
    }

    handleNotificationClose(data) {
        console.log('Notification closed:', data);
        this.emit('push:closed', data);
        this.trackNotificationInteraction('close', data);
    }

    // Notification type handlers
    handleInspectionAssigned(data) {
        // Could show in-app notification or update UI
        this.emit('inspection:assigned', data);
        
        // Update local data if offline manager exists
        if (window.offlineManager) {
            this.syncInspectionData(data.inspection_id);
        }
    }

    handleInspectionDue(data) {
        this.emit('inspection:due', data);
        
        // Show urgent notification if app is active
        if (!document.hidden) {
            this.showLocalNotification({
                title: 'Inspection Due Soon',
                body: data.body,
                icon: '/static/images/icon-192.png',
                tag: `due-${data.inspection_id}`,
                requireInteraction: true
            });
        }
    }

    handleInspectionOverdue(data) {
        this.emit('inspection:overdue', data);
        
        // High priority notification
        this.showLocalNotification({
            title: 'Overdue Inspection',
            body: data.body,
            icon: '/static/images/icon-192.png',
            tag: `overdue-${data.inspection_id}`,
            requireInteraction: true,
            actions: [
                {
                    action: 'complete',
                    title: 'Complete Now'
                },
                {
                    action: 'reschedule',
                    title: 'Reschedule'
                }
            ]
        });
    }

    handleSystemUpdate(data) {
        this.emit('system:update', data);
        
        // Show system notification
        if (data.require_action) {
            this.showLocalNotification({
                title: data.title,
                body: data.body,
                icon: '/static/images/icon-192.png',
                tag: 'system-update',
                requireInteraction: true
            });
        }
    }

    handleGenericNotification(data) {
        this.emit('push:generic', data);
    }

    // Local notifications
    async showLocalNotification(options) {
        if (this.permission !== 'granted' || !this.options.showNotifications) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            
            const notificationOptions = {
                badge: '/static/images/icon-192.png',
                icon: '/static/images/icon-192.png',
                vibrate: [200, 100, 200],
                timestamp: Date.now(),
                ...options
            };

            await registration.showNotification(options.title, notificationOptions);
            
        } catch (error) {
            console.error('Failed to show local notification:', error);
        }
    }

    // Action handling
    executeNotificationAction(action, data) {
        switch (action) {
            case 'complete':
                this.navigateToInspection(data.inspection_id);
                break;
            case 'reschedule':
                this.showRescheduleModal(data.inspection_id);
                break;
            case 'view':
                this.navigateToInspection(data.inspection_id);
                break;
            default:
                console.log('Unknown notification action:', action);
        }
    }

    navigateToInspection(inspectionId) {
        const url = `/inspections/${inspectionId}`;
        
        if (window.app && window.app.router) {
            window.app.router.navigate(url);
        } else {
            window.location.href = url;
        }
    }

    showRescheduleModal(inspectionId) {
        this.emit('inspection:reschedule', { id: inspectionId });
    }

    // Utility methods
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    // Analytics and tracking
    trackNotificationInteraction(type, data) {
        // Send interaction data to analytics
        this.emit('push:interaction', {
            type,
            notification_id: data.id,
            timestamp: Date.now()
        });
    }

    async syncInspectionData(inspectionId) {
        if (window.offlineManager) {
            try {
                // Force sync of specific inspection
                await window.offlineManager.syncInspection(inspectionId);
            } catch (error) {
                console.error('Failed to sync inspection data:', error);
            }
        }
    }

    // Configuration
    updateOptions(options) {
        this.options = { ...this.options, ...options };
    }

    // Status methods
    getStatus() {
        return {
            supported: this.isSupported,
            permission: this.permission,
            subscribed: !!this.subscription,
            endpoint: this.subscription ? this.subscription.endpoint : null
        };
    }

    isSubscribed() {
        return !!this.subscription;
    }

    hasPermission() {
        return this.permission === 'granted';
    }

    // Event emitter
    emit(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Test notifications
    async sendTestNotification() {
        if (!this.subscription) {
            throw new Error('Not subscribed to push notifications');
        }

        try {
            const response = await fetch(`${this.options.serverEndpoint}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    title: 'Test Notification',
                    body: 'This is a test push notification.',
                    type: 'test'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to send test notification: ${response.status}`);
            }

            console.log('Test notification sent');
            return true;
            
        } catch (error) {
            console.error('Failed to send test notification:', error);
            throw error;
        }
    }

    // Cleanup
    destroy() {
        // Remove event listeners and clean up
        if (this.subscription) {
            this.unsubscribe().catch(console.error);
        }
    }

    // Static factory method
    static async create(options = {}) {
        const service = new PushNotificationService(options);
        return service;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PushNotificationService;
} else {
    window.PushNotificationService = PushNotificationService;
}