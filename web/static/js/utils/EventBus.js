/**
 * Event Bus
 * Simple publish-subscribe event system for app-wide communication
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.maxListeners = 50;
    }

    // Subscribe to events
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        const listeners = this.events.get(eventName);
        
        // Check max listeners
        if (listeners.size >= this.maxListeners) {
            console.warn(`Maximum listeners (${this.maxListeners}) reached for event: ${eventName}`);
        }

        listeners.add(callback);

        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    // Subscribe to events (one-time only)
    once(eventName, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.onceEvents.has(eventName)) {
            this.onceEvents.set(eventName, new Set());
        }

        this.onceEvents.get(eventName).add(callback);

        // Return unsubscribe function
        return () => this.offOnce(eventName, callback);
    }

    // Unsubscribe from events
    off(eventName, callback) {
        const listeners = this.events.get(eventName);
        if (listeners) {
            listeners.delete(callback);
            
            // Clean up empty event entries
            if (listeners.size === 0) {
                this.events.delete(eventName);
            }
        }
    }

    // Unsubscribe from once events
    offOnce(eventName, callback) {
        const listeners = this.onceEvents.get(eventName);
        if (listeners) {
            listeners.delete(callback);
            
            // Clean up empty event entries
            if (listeners.size === 0) {
                this.onceEvents.delete(eventName);
            }
        }
    }

    // Emit events
    emit(eventName, ...args) {
        let listenersNotified = 0;

        // Handle regular listeners
        const listeners = this.events.get(eventName);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(...args);
                    listenersNotified++;
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                }
            }
        }

        // Handle once listeners
        const onceListeners = this.onceEvents.get(eventName);
        if (onceListeners) {
            const listenersToCall = Array.from(onceListeners);
            
            // Clear once listeners before calling them
            this.onceEvents.delete(eventName);
            
            for (const callback of listenersToCall) {
                try {
                    callback(...args);
                    listenersNotified++;
                } catch (error) {
                    console.error(`Error in once event listener for "${eventName}":`, error);
                }
            }
        }

        return listenersNotified;
    }

    // Remove all listeners for an event
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
            this.onceEvents.delete(eventName);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
    }

    // Get listener count
    listenerCount(eventName) {
        const regularCount = this.events.get(eventName)?.size || 0;
        const onceCount = this.onceEvents.get(eventName)?.size || 0;
        return regularCount + onceCount;
    }

    // Get all event names
    eventNames() {
        const regularEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceEvents.keys());
        return Array.from(new Set([...regularEvents, ...onceEvents]));
    }

    // Set max listeners
    setMaxListeners(n) {
        this.maxListeners = n;
    }

    // Alias methods for compatibility
    addEventListener(eventName, callback) {
        return this.on(eventName, callback);
    }

    removeEventListener(eventName, callback) {
        return this.off(eventName, callback);
    }

    dispatchEvent(eventName, ...args) {
        return this.emit(eventName, ...args);
    }

    // Debugging
    debug() {
        const regularEvents = {};
        const onceEvents = {};

        for (const [eventName, listeners] of this.events.entries()) {
            regularEvents[eventName] = listeners.size;
        }

        for (const [eventName, listeners] of this.onceEvents.entries()) {
            onceEvents[eventName] = listeners.size;
        }

        return {
            regularEvents,
            onceEvents,
            totalEvents: this.eventNames().length,
            maxListeners: this.maxListeners
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
} else {
    window.EventBus = EventBus;
}