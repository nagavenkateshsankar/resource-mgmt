/**
 * Header Manager
 * Manages the application header, user info, and top navigation
 */

class HeaderManager {
    constructor() {
        this.userInfo = null;
        this.notifications = [];
        this.searchVisible = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeHeader();
        
        console.log('HeaderManager initialized');
    }

    setupEventListeners() {
        // User menu toggle
        const userMenuToggle = document.getElementById('user-menu-toggle');
        const userMenu = document.getElementById('user-menu');
        
        if (userMenuToggle && userMenu) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('user-menu');
            const userMenuToggle = document.getElementById('user-menu-toggle');
            
            if (userMenu && userMenuToggle && 
                !userMenu.contains(e.target) && 
                !userMenuToggle.contains(e.target)) {
                this.closeUserMenu();
            }
        });

        // Search functionality
        const searchToggle = document.getElementById('search-toggle');
        const searchInput = document.getElementById('global-search');
        
        if (searchToggle) {
            searchToggle.addEventListener('click', () => this.toggleSearch());
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeSearch();
                }
            });
        }

        // Notification bell
        const notificationToggle = document.getElementById('notification-toggle');
        if (notificationToggle) {
            notificationToggle.addEventListener('click', () => this.toggleNotifications());
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Settings button
        const settingsButton = document.getElementById('settings-btn');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.openSettings());
        }

        // Profile button
        const profileButton = document.getElementById('profile-btn');
        if (profileButton) {
            profileButton.addEventListener('click', () => this.openProfile());
        }

        // Logout button
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }
    }

    initializeHeader() {
        this.updateConnectionStatus(navigator.onLine);
        this.setupConnectionStatusListener();
    }

    // User menu management
    toggleUserMenu() {
        const userMenu = document.getElementById('user-menu');
        if (userMenu) {
            const isVisible = userMenu.classList.contains('show');
            if (isVisible) {
                this.closeUserMenu();
            } else {
                this.openUserMenu();
            }
        }
    }

    openUserMenu() {
        const userMenu = document.getElementById('user-menu');
        if (userMenu) {
            userMenu.classList.add('show');
            this.emit('header:user-menu-opened');
        }
    }

    closeUserMenu() {
        const userMenu = document.getElementById('user-menu');
        if (userMenu) {
            userMenu.classList.remove('show');
            this.emit('header:user-menu-closed');
        }
    }

    // User information display
    updateUserInfo(user) {
        this.userInfo = user;

        // Update user name
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = user.name || 'User';
        }

        // Update user role
        const userRole = document.getElementById('user-role');
        if (userRole) {
            userRole.textContent = user.role ? 
                user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
        }

        // Update user avatar
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            if (user.avatar) {
                userAvatar.src = user.avatar;
            } else {
                // Generate initials avatar
                const initials = user.name ? 
                    user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
                userAvatar.alt = initials;
                userAvatar.style.backgroundImage = 'none';
                userAvatar.textContent = initials;
            }
        }

        this.emit('header:user-updated', user);
    }

    // Search functionality
    toggleSearch() {
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('global-search');
        
        if (searchContainer) {
            this.searchVisible = !this.searchVisible;
            
            if (this.searchVisible) {
                searchContainer.classList.add('active');
                if (searchInput) {
                    searchInput.focus();
                }
                this.emit('header:search-opened');
            } else {
                searchContainer.classList.remove('active');
                if (searchInput) {
                    searchInput.value = '';
                }
                this.emit('header:search-closed');
            }
        }
    }

    closeSearch() {
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('global-search');
        
        if (searchContainer && this.searchVisible) {
            this.searchVisible = false;
            searchContainer.classList.remove('active');
            if (searchInput) {
                searchInput.value = '';
            }
            this.emit('header:search-closed');
        }
    }

    handleSearch(query) {
        if (query.length >= 2) {
            this.emit('header:search-query', { query });
            // Debounced search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        }
    }

    performSearch(query) {
        // This would typically call a search service
        console.log('Searching for:', query);
        this.emit('header:search-perform', { query });
    }

    // Notification management
    toggleNotifications() {
        const notificationPanel = document.getElementById('notification-panel');
        if (notificationPanel) {
            const isVisible = notificationPanel.classList.contains('show');
            if (isVisible) {
                this.closeNotifications();
            } else {
                this.openNotifications();
            }
        }
    }

    openNotifications() {
        const notificationPanel = document.getElementById('notification-panel');
        if (notificationPanel) {
            notificationPanel.classList.add('show');
            this.markNotificationsAsRead();
            this.emit('header:notifications-opened');
        }
    }

    closeNotifications() {
        const notificationPanel = document.getElementById('notification-panel');
        if (notificationPanel) {
            notificationPanel.classList.remove('show');
            this.emit('header:notifications-closed');
        }
    }

    updateNotificationCount(count) {
        const notificationBadge = document.getElementById('notification-badge');
        if (notificationBadge) {
            if (count > 0) {
                notificationBadge.textContent = count > 99 ? '99+' : count.toString();
                notificationBadge.style.display = 'block';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
    }

    addNotification(notification) {
        this.notifications.unshift({
            id: Date.now(),
            timestamp: new Date(),
            read: false,
            ...notification
        });

        // Keep only recent notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        this.updateNotificationCount(this.getUnreadCount());
        this.renderNotifications();
    }

    markNotificationsAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.updateNotificationCount(0);
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    renderNotifications() {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;

        if (this.notifications.length === 0) {
            notificationList.innerHTML = '<div class="no-notifications">No notifications</div>';
            return;
        }

        notificationList.innerHTML = this.notifications.slice(0, 10).map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                <div class="notification-icon">
                    ${this.getNotificationIcon(notification.type)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">
                        ${this.formatNotificationTime(notification.timestamp)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            inspection: '📋',
            system: '⚙️'
        };
        return icons[type] || '📢';
    }

    formatNotificationTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    // Connection status
    setupConnectionStatusListener() {
        window.addEventListener('online', () => this.updateConnectionStatus(true));
        window.addEventListener('offline', () => this.updateConnectionStatus(false));
    }

    updateConnectionStatus(isOnline) {
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');

        if (indicator && text) {
            indicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
            text.textContent = isOnline ? 'Online' : 'Offline';
        }

        this.emit('header:connection-changed', { isOnline });
    }

    // Theme management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        this.setTheme(newTheme);
        this.emit('header:theme-changed', { theme: newTheme });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('preferred-theme', theme);
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    // Navigation actions
    openSettings() {
        this.emit('header:open-settings');
    }

    openProfile() {
        this.emit('header:open-profile');
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.emit('header:logout');
        }
    }

    // Page title management
    updatePageTitle(title) {
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = title;
        }
        
        // Also update browser title
        document.title = `${title} - Site Inspection Manager`;
    }

    // Breadcrumb management
    updateBreadcrumb(items) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = items.map((item, index) => {
            const isLast = index === items.length - 1;
            return `
                <span class="breadcrumb-item ${isLast ? 'active' : ''}">
                    ${isLast || !item.href ? item.label : `<a href="${item.href}">${item.label}</a>`}
                </span>
            `;
        }).join('<span class="breadcrumb-separator">/</span>');
    }

    // Progress indicator
    showProgress() {
        const progressBar = document.getElementById('header-progress');
        if (progressBar) {
            progressBar.style.display = 'block';
            progressBar.classList.add('indeterminate');
        }
    }

    hideProgress() {
        const progressBar = document.getElementById('header-progress');
        if (progressBar) {
            progressBar.style.display = 'none';
            progressBar.classList.remove('indeterminate');
        }
    }

    setProgress(percentage) {
        const progressBar = document.getElementById('header-progress');
        if (progressBar) {
            progressBar.style.display = 'block';
            progressBar.classList.remove('indeterminate');
            progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }

    // Quick actions
    addQuickAction(action) {
        const quickActions = document.getElementById('quick-actions');
        if (!quickActions) return;

        const actionElement = document.createElement('button');
        actionElement.className = `quick-action ${action.className || ''}`;
        actionElement.innerHTML = `
            ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
            <span class="action-label">${action.label}</span>
        `;
        
        if (action.onClick) {
            actionElement.addEventListener('click', action.onClick);
        }

        quickActions.appendChild(actionElement);
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
    getUserInfo() {
        return this.userInfo;
    }

    getNotifications() {
        return this.notifications;
    }

    isSearchVisible() {
        return this.searchVisible;
    }

    // Cleanup
    destroy() {
        clearTimeout(this.searchTimeout);
        this.userInfo = null;
        this.notifications = [];
        this.searchVisible = false;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderManager;
} else {
    window.HeaderManager = HeaderManager;
}