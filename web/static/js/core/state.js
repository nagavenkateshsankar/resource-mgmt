/**
 * Application State Management
 * Simple state management system with reactivity
 */

class AppState {
    constructor() {
        this.state = {
            user: null,
            currentPage: null,
            isLoading: false,
            isOffline: false,
            theme: this.getStoredTheme(),
            unsavedChanges: false,
            inspections: [],
            templates: [],
            notifications: []
        };
        
        this.listeners = new Map();
        this.history = [];
        this.maxHistorySize = 50;
        
        this.init();
    }

    init() {
        // Initialize theme
        this.applyTheme(this.state.theme);
        
        // Setup online/offline detection
        this.setupConnectivityDetection();
        
        console.log('AppState initialized:', this.state);
    }

    // Core state methods
    get(key) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }

    set(key, value) {
        const oldValue = this.state[key];
        
        // Save to history before changing
        this.saveToHistory(key, oldValue, value);
        
        // Update state
        this.state[key] = value;
        
        // Notify listeners
        this.notifyListeners(key, value, oldValue);
        
        // Auto-persist certain state
        this.autoPersist(key, value);
    }

    update(updates) {
        const changes = {};
        
        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.state[key];
            if (oldValue !== value) {
                changes[key] = { oldValue, newValue: value };
                this.saveToHistory(key, oldValue, value);
                this.state[key] = value;
            }
        });
        
        // Notify listeners for all changes
        Object.entries(changes).forEach(([key, { newValue, oldValue }]) => {
            this.notifyListeners(key, newValue, oldValue);
            this.autoPersist(key, newValue);
        });
        
        return changes;
    }

    // Reactive subscriptions
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
                if (keyListeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    unsubscribe(key, callback) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.delete(callback);
            if (keyListeners.size === 0) {
                this.listeners.delete(key);
            }
        }
    }

    notifyListeners(key, newValue, oldValue) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }
    }

    // User management
    setUser(user) {
        this.set('user', user);
    }

    getUser() {
        return this.state.user;
    }

    clearUser() {
        this.set('user', null);
    }

    isAuthenticated() {
        return !!this.state.user;
    }

    // Page management
    setCurrentPage(page) {
        this.set('currentPage', page);
    }

    getCurrentPage() {
        return this.state.currentPage;
    }

    // Loading state
    setLoading(isLoading) {
        this.set('isLoading', isLoading);
    }

    isLoading() {
        return this.state.isLoading;
    }

    // Offline state
    setOffline(isOffline) {
        this.set('isOffline', isOffline);
        
        // Update UI indicators
        this.updateConnectionIndicator(!isOffline);
    }

    isOffline() {
        return this.state.isOffline;
    }

    updateConnectionIndicator(isOnline) {
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');
        
        if (indicator && text) {
            if (isOnline) {
                indicator.className = 'status-indicator online';
                text.textContent = 'Online';
            } else {
                indicator.className = 'status-indicator offline';
                text.textContent = 'Offline';
            }
        }
    }

    // Theme management
    setTheme(theme) {
        this.set('theme', theme);
        this.applyTheme(theme);
    }

    getTheme() {
        return this.state.theme;
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('preferred-theme', theme);
    }

    getStoredTheme() {
        const stored = localStorage.getItem('preferred-theme');
        if (stored) return stored;
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }

    // Unsaved changes tracking
    setUnsavedChanges(hasChanges) {
        this.set('unsavedChanges', hasChanges);
    }

    hasUnsavedChanges() {
        return this.state.unsavedChanges;
    }

    // Data management
    setInspections(inspections) {
        this.set('inspections', inspections);
    }

    getInspections() {
        return this.state.inspections;
    }

    addInspection(inspection) {
        const inspections = [...this.state.inspections, inspection];
        this.set('inspections', inspections);
    }

    updateInspection(id, updates) {
        const inspections = this.state.inspections.map(inspection => 
            inspection.id === id ? { ...inspection, ...updates } : inspection
        );
        this.set('inspections', inspections);
    }

    removeInspection(id) {
        const inspections = this.state.inspections.filter(inspection => inspection.id !== id);
        this.set('inspections', inspections);
    }

    // Templates management
    setTemplates(templates) {
        this.set('templates', templates);
    }

    getTemplates() {
        return this.state.templates;
    }

    // Notifications management
    addNotification(notification) {
        const notifications = [...this.state.notifications, {
            ...notification,
            id: Date.now() + Math.random(),
            timestamp: new Date()
        }];
        this.set('notifications', notifications);
    }

    removeNotification(id) {
        const notifications = this.state.notifications.filter(n => n.id !== id);
        this.set('notifications', notifications);
    }

    clearNotifications() {
        this.set('notifications', []);
    }

    // History management
    saveToHistory(key, oldValue, newValue) {
        if (this.history.length >= this.maxHistorySize) {
            this.history.shift();
        }
        
        this.history.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue
        });
    }

    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    canUndo() {
        return this.history.length > 0;
    }

    undo() {
        if (this.history.length === 0) return false;
        
        const lastChange = this.history.pop();
        this.state[lastChange.key] = lastChange.oldValue;
        this.notifyListeners(lastChange.key, lastChange.oldValue, lastChange.newValue);
        
        return true;
    }

    // Persistence
    autoPersist(key, value) {
        const persistKeys = ['theme', 'user'];
        
        if (persistKeys.includes(key)) {
            try {
                localStorage.setItem(`app-state-${key}`, JSON.stringify(value));
            } catch (error) {
                console.warn('Failed to persist state:', error);
            }
        }
    }

    loadPersistedState() {
        const persistKeys = ['theme', 'user'];
        
        persistKeys.forEach(key => {
            try {
                const stored = localStorage.getItem(`app-state-${key}`);
                if (stored) {
                    const value = JSON.parse(stored);
                    this.state[key] = value;
                }
            } catch (error) {
                console.warn(`Failed to load persisted state for ${key}:`, error);
            }
        });
    }

    // Utilities
    setupConnectivityDetection() {
        // Initial state
        this.setOffline(!navigator.onLine);
        
        // Listen for connectivity changes
        window.addEventListener('online', () => {
            this.setOffline(false);
        });
        
        window.addEventListener('offline', () => {
            this.setOffline(true);
        });
    }

    // Development helpers
    debug() {
        return {
            state: this.state,
            listeners: Array.from(this.listeners.keys()),
            history: this.getHistory()
        };
    }

    reset() {
        const initialState = {
            user: null,
            currentPage: null,
            isLoading: false,
            isOffline: false,
            theme: 'light',
            unsavedChanges: false,
            inspections: [],
            templates: [],
            notifications: []
        };
        
        Object.entries(initialState).forEach(([key, value]) => {
            this.set(key, value);
        });
        
        this.history = [];
    }

    // Batch operations
    batchUpdate(updates) {
        const oldNotifyListeners = this.notifyListeners;
        const pendingNotifications = [];
        
        // Temporarily override notification
        this.notifyListeners = (key, newValue, oldValue) => {
            pendingNotifications.push({ key, newValue, oldValue });
        };
        
        // Perform all updates
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
        
        // Restore notification function
        this.notifyListeners = oldNotifyListeners;
        
        // Send all notifications
        pendingNotifications.forEach(({ key, newValue, oldValue }) => {
            this.notifyListeners(key, newValue, oldValue);
        });
    }

    // Computed properties
    createComputed(key, computeFn, dependencies = []) {
        const compute = () => {
            try {
                const value = computeFn(this.state);
                this.set(key, value);
            } catch (error) {
                console.error(`Error computing ${key}:`, error);
            }
        };
        
        // Initial computation
        compute();
        
        // Subscribe to dependencies
        const unsubscribers = dependencies.map(dep => 
            this.subscribe(dep, compute)
        );
        
        // Return cleanup function
        return () => {
            unsubscribers.forEach(unsub => unsub());
            this.unsubscribe(key);
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
} else {
    window.AppState = AppState;
}