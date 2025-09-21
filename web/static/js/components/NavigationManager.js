/**
 * Navigation Manager
 * Handles navigation menu state and interactions
 */

class NavigationManager {
    constructor(router) {
        this.router = router;
        this.activeRoute = null;
        this.isCollapsed = false;
        this.isMobile = false;
        this.navigationItems = [];
        
        this.init();
    }

    init() {
        this.detectViewport();
        this.setupEventListeners();
        this.initializeNavigation();
        
        console.log('NavigationManager initialized');
    }

    detectViewport() {
        this.isMobile = window.innerWidth < 768;
        
        // Update on resize
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            
            if (wasMobile !== this.isMobile) {
                this.handleViewportChange();
            }
        });
    }

    handleViewportChange() {
        const navDrawer = document.getElementById('nav-drawer');
        const overlay = document.getElementById('nav-overlay');
        
        if (this.isMobile) {
            // Mobile view - collapse navigation
            if (navDrawer) {
                navDrawer.classList.add('collapsed');
                navDrawer.classList.remove('open');
            }
            if (overlay) {
                overlay.classList.remove('show');
            }
            this.isCollapsed = true;
        } else {
            // Desktop view - expand navigation
            if (navDrawer) {
                navDrawer.classList.remove('collapsed', 'open');
            }
            if (overlay) {
                overlay.classList.remove('show');
            }
            this.isCollapsed = false;
        }
        
        this.emit('navigation:viewport-changed', { isMobile: this.isMobile });
    }

    setupEventListeners() {
        // Navigation toggle
        const navToggle = document.getElementById('nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => this.toggle());
        }

        // Overlay click
        const overlay = document.getElementById('nav-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }

        // Navigation links
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink && navLink.dataset.page) {
                e.preventDefault();
                this.navigateToPage(navLink.dataset.page);
            }
        });

        // Close mobile nav when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMobile && !this.isCollapsed) {
                const navDrawer = document.getElementById('nav-drawer');
                const navToggle = document.getElementById('nav-toggle');
                
                if (navDrawer && !navDrawer.contains(e.target) && 
                    navToggle && !navToggle.contains(e.target)) {
                    this.close();
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isCollapsed) {
                this.close();
            }
        });
    }

    initializeNavigation() {
        // Define navigation items
        this.navigationItems = [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: '📊',
                route: '/',
                page: 'dashboard'
            },
            {
                id: 'inspections',
                label: 'Inspections',
                icon: '📋',
                route: '/inspections',
                page: 'inspections'
            },
            {
                id: 'templates',
                label: 'Templates',
                icon: '📝',
                route: '/templates',
                page: 'templates'
            },
            {
                id: 'reports',
                label: 'Reports',
                icon: '📈',
                route: '/reports',
                page: 'reports'
            },
            {
                id: 'settings',
                label: 'Settings',
                icon: '⚙️',
                route: '/settings',
                page: 'settings'
            }
        ];

        // Render navigation
        this.renderNavigation();
        
        // Set initial active state
        this.setActiveRoute(this.router?.getCurrentRoute() || 'dashboard');
    }

    renderNavigation() {
        const navList = document.querySelector('.nav-list');
        if (!navList) return;

        navList.innerHTML = this.navigationItems.map(item => `
            <li class="nav-item">
                <a href="${item.route}" class="nav-link" data-page="${item.page}" data-route="${item.id}">
                    <span class="nav-icon">${item.icon}</span>
                    <span class="nav-label">${item.label}</span>
                </a>
            </li>
        `).join('');
    }

    // Navigation state management
    toggle() {
        if (this.isCollapsed) {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        const navDrawer = document.getElementById('nav-drawer');
        const navToggle = document.getElementById('nav-toggle');
        const mainContent = document.querySelector('.main-content');
        const overlay = document.getElementById('nav-overlay');

        this.isCollapsed = false;

        if (this.isMobile) {
            // Mobile: Show with overlay
            if (navDrawer) {
                navDrawer.classList.remove('collapsed');
                navDrawer.classList.add('open');
            }
            if (overlay) {
                overlay.classList.add('show');
            }
        } else {
            // Desktop: Expand sidebar
            if (navDrawer) {
                navDrawer.classList.remove('collapsed');
            }
            if (mainContent) {
                mainContent.classList.remove('nav-collapsed');
            }
        }

        if (navToggle) {
            navToggle.classList.remove('active');
        }

        this.emit('navigation:opened');
    }

    close() {
        const navDrawer = document.getElementById('nav-drawer');
        const navToggle = document.getElementById('nav-toggle');
        const mainContent = document.querySelector('.main-content');
        const overlay = document.getElementById('nav-overlay');

        this.isCollapsed = true;

        if (this.isMobile) {
            // Mobile: Hide completely
            if (navDrawer) {
                navDrawer.classList.add('collapsed');
                navDrawer.classList.remove('open');
            }
            if (overlay) {
                overlay.classList.remove('show');
            }
        } else {
            // Desktop: Collapse to icons
            if (navDrawer) {
                navDrawer.classList.add('collapsed');
            }
            if (mainContent) {
                mainContent.classList.add('nav-collapsed');
            }
        }

        if (navToggle) {
            navToggle.classList.add('active');
        }

        this.emit('navigation:closed');
    }

    // Route management
    setActiveRoute(route) {
        this.activeRoute = route;

        // Update navigation active states
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.route === route || link.dataset.page === route) {
                link.classList.add('active');
            }
        });

        this.emit('navigation:route-changed', { route });
    }

    navigateToPage(page) {
        if (this.router) {
            // Use router if available
            const navItem = this.navigationItems.find(item => item.page === page);
            if (navItem) {
                this.router.navigate(navItem.route);
            }
        } else {
            // Fallback to direct page switching
            this.showPage(page);
        }

        // Close mobile navigation after navigation
        if (this.isMobile) {
            setTimeout(() => this.close(), 100);
        }
    }

    showPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });

        // Show target page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
            this.setActiveRoute(page);
        }

        this.emit('navigation:page-changed', { page });
    }

    // Navigation items management
    addNavigationItem(item) {
        const existingIndex = this.navigationItems.findIndex(nav => nav.id === item.id);
        
        if (existingIndex >= 0) {
            this.navigationItems[existingIndex] = { ...this.navigationItems[existingIndex], ...item };
        } else {
            this.navigationItems.push(item);
        }

        this.renderNavigation();
    }

    removeNavigationItem(id) {
        this.navigationItems = this.navigationItems.filter(item => item.id !== id);
        this.renderNavigation();
    }

    updateNavigationItem(id, updates) {
        const item = this.navigationItems.find(nav => nav.id === id);
        if (item) {
            Object.assign(item, updates);
            this.renderNavigation();
        }
    }

    // Badge and notification support
    setBadge(itemId, badge) {
        const navLink = document.querySelector(`[data-route="${itemId}"]`);
        if (!navLink) return;

        // Remove existing badge
        const existingBadge = navLink.querySelector('.nav-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Add new badge if provided
        if (badge && (badge.count > 0 || badge.text)) {
            const badgeElement = document.createElement('span');
            badgeElement.className = `nav-badge ${badge.type || 'default'}`;
            badgeElement.textContent = badge.text || badge.count;
            
            if (badge.title) {
                badgeElement.setAttribute('title', badge.title);
            }

            navLink.appendChild(badgeElement);
        }
    }

    clearBadge(itemId) {
        this.setBadge(itemId, null);
    }

    // State getters
    getActiveRoute() {
        return this.activeRoute;
    }

    isNavigationOpen() {
        return !this.isCollapsed;
    }

    isMobileView() {
        return this.isMobile;
    }

    getNavigationItems() {
        return [...this.navigationItems];
    }

    // Breadcrumb support
    updateBreadcrumb(items) {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = items.map((item, index) => {
            const isLast = index === items.length - 1;
            return `
                <span class="breadcrumb-item ${isLast ? 'active' : ''}">
                    ${isLast ? item.label : `<a href="${item.route || '#'}">${item.label}</a>`}
                </span>
            `;
        }).join('<span class="breadcrumb-separator">/</span>');
    }

    // User menu support
    setupUserMenu() {
        const userMenuToggle = document.getElementById('user-menu-toggle');
        const userMenu = document.getElementById('user-menu');

        if (userMenuToggle && userMenu) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('show');
            });

            // Close user menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenu.contains(e.target) && !userMenuToggle.contains(e.target)) {
                    userMenu.classList.remove('show');
                }
            });
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

    // Accessibility helpers
    announceRouteChange(route) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `Navigated to ${route} page`;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Cleanup
    destroy() {
        // Remove event listeners if needed
        this.navigationItems = [];
        this.activeRoute = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
} else {
    window.NavigationManager = NavigationManager;
}