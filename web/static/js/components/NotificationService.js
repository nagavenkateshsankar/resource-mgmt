/**
 * Notification Service
 * Handles toast notifications and in-page notifications
 */

class NotificationService {
    constructor(options = {}) {
        this.options = {
            position: 'top-right',
            duration: 5000,
            maxNotifications: 5,
            showProgress: true,
            pauseOnHover: true,
            ...options
        };
        
        this.notifications = new Map();
        this.container = null;
        this.idCounter = 0;
        
        this.init();
    }

    init() {
        this.createContainer();
        this.setupStyles();
        console.log('NotificationService initialized');
    }

    createContainer() {
        // Remove existing container
        const existing = document.querySelector('.toast-container');
        if (existing) existing.remove();
        
        // Create new container
        this.container = document.createElement('div');
        this.container.className = `toast-container ${this.options.position}`;
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        
        document.body.appendChild(this.container);
    }

    setupStyles() {
        // Ensure notification styles are loaded
        if (!document.querySelector('#notification-styles')) {
            const link = document.createElement('link');
            link.id = 'notification-styles';
            link.rel = 'stylesheet';
            link.href = '/static/css/components/notifications.css';
            document.head.appendChild(link);
        }
    }

    // Main notification methods
    show(message, type = 'info', options = {}) {
        const config = {
            id: this.generateId(),
            message,
            type,
            title: options.title,
            duration: options.duration ?? this.options.duration,
            showProgress: options.showProgress ?? this.options.showProgress,
            actions: options.actions || [],
            data: options.data || {},
            persistent: options.persistent || false,
            ...options
        };

        // Clean up old notifications if at limit
        this.enforceLimit();

        // Create notification element
        const element = this.createElement(config);
        
        // Store notification
        this.notifications.set(config.id, {
            ...config,
            element,
            timer: null,
            startTime: Date.now()
        });

        // Add to container
        this.container.appendChild(element);

        // Trigger animation
        requestAnimationFrame(() => {
            element.classList.add('toast-show');
        });

        // Setup auto-hide
        if (!config.persistent && config.duration > 0) {
            this.setupAutoHide(config.id);
        }

        // Setup progress bar
        if (config.showProgress && config.duration > 0) {
            this.setupProgressBar(config.id);
        }

        // Emit event
        this.emit('notification:show', config);

        return config.id;
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', {
            title: 'Success',
            ...options
        });
    }

    error(message, options = {}) {
        return this.show(message, 'error', {
            title: 'Error',
            duration: 8000, // Longer for errors
            ...options
        });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', {
            title: 'Warning',
            duration: 6000,
            ...options
        });
    }

    info(message, options = {}) {
        return this.show(message, 'info', {
            title: 'Info',
            ...options
        });
    }

    // Hide notifications
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return false;

        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Animate out
        notification.element.classList.add('toast-hiding');
        notification.element.classList.remove('toast-show');

        // Remove after animation
        setTimeout(() => {
            if (notification.element && notification.element.parentNode) {
                notification.element.remove();
            }
            this.notifications.delete(id);
            this.emit('notification:hide', { id, notification });
        }, 300);

        return true;
    }

    hideAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.hide(id));
    }

    // Element creation
    createElement(config) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${config.type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('data-notification-id', config.id);

        const header = this.createHeader(config);
        const body = this.createBody(config);

        toast.appendChild(header);
        toast.appendChild(body);

        // Add progress bar if enabled
        if (config.showProgress && config.duration > 0) {
            const progress = this.createProgressBar(config);
            toast.appendChild(progress);
        }

        // Setup event listeners
        this.setupElementListeners(toast, config);

        return toast;
    }

    createHeader(config) {
        const header = document.createElement('div');
        header.className = 'toast-header';

        const icon = this.getIcon(config.type);
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = icon;

        const title = document.createElement('strong');
        title.className = 'toast-title';
        title.textContent = config.title || this.getDefaultTitle(config.type);

        const timestamp = document.createElement('small');
        timestamp.className = 'toast-timestamp';
        timestamp.textContent = this.formatTime(new Date());

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'toast-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '<span>&times;</span>';
        closeBtn.addEventListener('click', () => this.hide(config.id));

        header.appendChild(iconSpan);
        header.appendChild(title);
        header.appendChild(timestamp);
        header.appendChild(closeBtn);

        return header;
    }

    createBody(config) {
        const body = document.createElement('div');
        body.className = 'toast-body';
        body.textContent = config.message;

        // Add actions if provided
        if (config.actions && config.actions.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'toast-actions';

            config.actions.forEach(action => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `btn btn-sm ${action.class || 'btn-primary'}`;
                button.textContent = action.text;

                if (action.action) {
                    button.addEventListener('click', (event) => {
                        action.action(event, config);
                        if (action.dismiss !== false) {
                            this.hide(config.id);
                        }
                    });
                }

                actionsDiv.appendChild(button);
            });

            body.appendChild(actionsDiv);
        }

        return body;
    }

    createProgressBar(config) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'toast-progress';

        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress-bar';
        progressBar.style.width = '100%';

        progressContainer.appendChild(progressBar);
        return progressContainer;
    }

    setupElementListeners(element, config) {
        if (this.options.pauseOnHover) {
            element.addEventListener('mouseenter', () => {
                this.pauseNotification(config.id);
            });

            element.addEventListener('mouseleave', () => {
                this.resumeNotification(config.id);
            });
        }

        // Handle clicks on notification
        element.addEventListener('click', (event) => {
            if (!event.target.closest('.toast-close') && !event.target.closest('.toast-actions')) {
                this.emit('notification:click', { id: config.id, config, event });
            }
        });
    }

    // Timer management
    setupAutoHide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.timer = setTimeout(() => {
            this.hide(id);
        }, notification.duration);
    }

    setupProgressBar(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const progressBar = notification.element.querySelector('.toast-progress-bar');
        if (!progressBar) return;

        let startTime = Date.now();
        const duration = notification.duration;

        const updateProgress = () => {
            if (!this.notifications.has(id)) return;

            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const progress = (remaining / duration) * 100;

            progressBar.style.width = `${progress}%`;

            if (remaining > 0) {
                requestAnimationFrame(updateProgress);
            }
        };

        notification.progressUpdate = updateProgress;
        requestAnimationFrame(updateProgress);
    }

    pauseNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification || !notification.timer) return;

        clearTimeout(notification.timer);
        notification.pausedAt = Date.now();
        notification.timer = null;
    }

    resumeNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification || notification.timer) return;

        const elapsed = notification.pausedAt - notification.startTime;
        const remaining = notification.duration - elapsed;

        if (remaining > 0) {
            notification.startTime = Date.now() - elapsed;
            notification.timer = setTimeout(() => {
                this.hide(id);
            }, remaining);
        }
    }

    // Utility methods
    generateId() {
        return `notification-${++this.idCounter}-${Date.now()}`;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || '📢';
    }

    getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || 'Notification';
    }

    formatTime(date) {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    enforceLimit() {
        const notifications = Array.from(this.notifications.values());
        if (notifications.length >= this.options.maxNotifications) {
            // Remove oldest non-persistent notifications
            const oldestRemovable = notifications
                .filter(n => !n.persistent)
                .sort((a, b) => a.startTime - b.startTime);

            if (oldestRemovable.length > 0) {
                this.hide(oldestRemovable[0].id);
            }
        }
    }

    // Event emitter
    emit(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Configuration
    configure(options) {
        this.options = { ...this.options, ...options };
        
        // Recreate container if position changed
        if (options.position) {
            this.createContainer();
        }
    }

    // Get notifications
    getAll() {
        return Array.from(this.notifications.values());
    }

    getById(id) {
        return this.notifications.get(id);
    }

    count() {
        return this.notifications.size;
    }

    // Clear all notifications
    clear() {
        this.hideAll();
    }

    // Cleanup
    destroy() {
        this.hideAll();
        if (this.container) {
            this.container.remove();
        }
        this.notifications.clear();
    }

    // Static factory methods
    static create(options = {}) {
        return new NotificationService(options);
    }

    static success(message, options = {}) {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance.success(message, options);
    }

    static error(message, options = {}) {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance.error(message, options);
    }

    static warning(message, options = {}) {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance.warning(message, options);
    }

    static info(message, options = {}) {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance.info(message, options);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
} else {
    window.NotificationService = NotificationService;
}