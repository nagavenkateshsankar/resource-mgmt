/**
 * Site Inspection Manager - Core Application Module
 * Modular JavaScript Architecture
 */

class SiteInspectionApp {
    constructor() {
        console.log('🚀 SiteInspectionApp CONSTRUCTOR - UPDATED VERSION');
        this.state = new AppState();
        this.router = new Router();
        this.api = new APIClient();
        this.components = new Map();
        this.services = new Map();
        this.eventBus = new EventBus();

        // Make API client globally available for auth system
        window.apiClient = this.api;

        this.init();
    }

    async init() {
        try {
            // Initialize core services
            await this.initializeServices();
            
            // Setup event listeners
            this.setupGlobalEventListeners();
            
            // Initialize components
            this.initializeComponents();
            
            // Initialize Template Builder
            this.initializeTemplateBuilder();
            
            // Setup routing
            this.setupRouting();
            
            // Check authentication - loading screen will be hidden by auth handlers
            await this.checkAuthentication();
            
            console.log('SiteInspectionApp initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeServices() {
        // Initialize API client
        this.api.setBaseURL('/api/v1');
        
        // Initialize offline manager
        this.services.set('offline', new OfflineManager(this.api));
        
        // Initialize notification service
        this.services.set('notifications', new NotificationService());
        
        // Initialize form service
        this.services.set('forms', new FormService());
        
        // Initialize theme service
        this.services.set('theme', new ThemeService());
        
        // Initialize PWA service (optional)
        if (typeof PWAService !== 'undefined') {
            this.services.set('pwa', new PWAService());
        } else {
            console.warn('PWAService not available, skipping PWA initialization');
        }
    }

    initializeComponents() {
        // Register core components
        this.components.set('modal', new ModalManager());
        this.components.set('navigation', new NavigationManager(this.router));
        this.components.set('header', new HeaderManager());
        this.components.set('dataTable', new DataTableManager());
        this.components.set('forms', new FormManager());
        
        // Initialize all components
        this.components.forEach(component => {
            if (typeof component.init === 'function') {
                component.init();
            }
        });
    }

    initializeTemplateBuilder() {
        // Initialize Template Builder if the class is available
        if (typeof TemplateBuilder !== 'undefined') {
            this.templateBuilder = new TemplateBuilder();
            window.templateBuilder = this.templateBuilder; // Make globally available
            console.log('Template Builder initialized');
        } else {
            console.warn('TemplateBuilder class not found');
        }
    }

    setupGlobalEventListeners() {
        // Handle authentication events
        this.eventBus.on('auth:login', this.handleLogin.bind(this));
        this.eventBus.on('auth:logout', this.handleLogout.bind(this));
        this.eventBus.on('auth:authenticated', this.handleAuthenticated.bind(this));
        this.eventBus.on('auth:unauthenticated', this.handleUnauthenticated.bind(this));
        
        // Handle navigation events
        this.eventBus.on('nav:change', this.handleNavigation.bind(this));
        
        // Handle error events
        this.eventBus.on('error:global', this.handleGlobalError.bind(this));
        
        // Handle offline events
        this.eventBus.on('offline:status', this.handleOfflineStatus.bind(this));
        
        // Handle theme changes
        this.eventBus.on('theme:change', this.handleThemeChange.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('online', () => this.eventBus.emit('offline:status', true));
        window.addEventListener('offline', () => this.eventBus.emit('offline:status', false));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    setupRouting() {
        this.router.addRoute('/', 'dashboard');
        this.router.addRoute('/inspections', 'inspections');
        this.router.addRoute('/templates', 'templates');
        this.router.addRoute('/reports', 'reports');
        this.router.addRoute('/settings', 'settings');
        
        this.router.onRouteChange((route, params) => {
            this.handleRouteChange(route, params);
        });
        
        // Don't start router yet - wait for authentication
    }

    async checkAuthentication() {
        try {
            // Refresh token from localStorage in case it was updated after login
            this.api.refreshTokenFromStorage();

            console.log('=== AUTHENTICATION CHECK STARTED ===');
            console.log('Checking authentication with base URL:', this.api.options.baseURL);
            console.log('Token available:', !!this.api.auth.token);
            console.log('Token value:', this.api.auth.token?.substring(0, 20) + '...');
            console.log('About to call api.get("auth/profile")');
            console.log('buildURL result:', this.api.buildURL('auth/profile'));
            console.log('=== MAKING API CALL ===');

            const user = await this.api.get('auth/profile');
            console.log('Profile API call successful:', !!user);
            this.state.setUser(user.data);
            this.eventBus.emit('auth:authenticated', user.data);
        } catch (error) {
            console.warn('User not authenticated:', error);
            this.eventBus.emit('auth:unauthenticated');
        }
    }

    handleRouteChange(route, params) {
        // Update navigation state
        this.components.get('navigation').setActiveRoute(route);
        
        // Load page content
        this.loadPage(route, params);
        
        // Update page title
        this.updatePageTitle(route);
        
        // Emit route change event
        this.eventBus.emit('nav:change', { route, params });
    }

    async loadPage(route, params) {
        try {
            // Show loading state
            this.showPageLoading();
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show target page
            const pageElement = document.getElementById(`${route}-page`);
            if (pageElement) {
                pageElement.classList.add('active');
                
                // Initialize page-specific functionality
                await this.initializePage(route, params);
            } else {
                throw new Error(`Page not found: ${route}`);
            }
            
            // Hide loading state
            this.hidePageLoading();
            
        } catch (error) {
            console.error('Failed to load page:', error);
            this.handlePageLoadError(error);
        }
    }

    async initializePage(route, params) {
        switch (route) {
            case 'dashboard':
                await this.initializeDashboard(params);
                break;
            case 'inspections':
                await this.initializeInspections(params);
                break;
            case 'templates':
                await this.initializeTemplates(params);
                break;
            case 'reports':
                await this.initializeReports(params);
                break;
            case 'settings':
                await this.initializeSettings(params);
                break;
        }
    }

    async initializeDashboard(params) {
        try {
            // Load dashboard stats
            const stats = await this.api.get('/stats/inspections');
            this.updateDashboardStats(stats.data);
            
            // Load recent inspections
            const inspections = await this.api.get('/inspections?limit=5&sort=-updated_at');
            this.updateRecentInspections(inspections.data);
            
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.services.get('notifications').error('Failed to load dashboard data');
        }
    }

    async initializeInspections(params) {
        try {
            // Initialize data table
            const dataTable = this.components.get('dataTable');
            await dataTable.initialize('inspections-table', {
                endpoint: '/inspections',
                columns: [
                    { key: 'title', title: 'Title', sortable: true },
                    { key: 'location', title: 'Location', sortable: true },
                    { key: 'status', title: 'Status', sortable: true },
                    { key: 'assignee', title: 'Assignee', sortable: true },
                    { key: 'due_date', title: 'Due Date', sortable: true }
                ],
                actions: ['view', 'edit', 'delete']
            });
            
        } catch (error) {
            console.error('Failed to load inspections:', error);
            this.services.get('notifications').error('Failed to load inspections data');
        }
    }

    async loadInitialData() {
        try {
            console.log('Loading initial application data...');
            // You can add any initial data loading here
            // For now, just log that it's complete
            console.log('Initial data loaded successfully');
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.services.get('notifications').error('Failed to load application data');
        }
    }

    // Event handlers
    handleLogin(user) {
        this.state.setUser(user);
        this.router.navigate('/');
        this.services.get('notifications').success('Successfully logged in');
    }

    handleLogout() {
        this.state.clearUser();
        this.router.navigate('/login');
        this.services.get('notifications').info('You have been logged out');
    }

    handleAuthenticated(user) {
        console.log('User authenticated:', user);
        this.state.setUser(user);
        // Start router now that user is authenticated
        this.router.start();
        // Load initial data now that user is authenticated
        this.loadInitialData();
        // Hide loading screen and emit app ready
        this.hideLoadingScreen();
        // Ensure dashboard page is visible after authentication
        setTimeout(() => {
            const dashboardPage = document.getElementById('dashboard-page');
            if (dashboardPage) {
                dashboardPage.classList.add('active');
                console.log('Dashboard page made visible after authentication');
            }
        }, 100);
        this.eventBus.emit('app:ready');
    }

    handleUnauthenticated() {
        console.log('User not authenticated, redirecting to login');
        this.state.clearUser();
        // Redirect to login page
        window.location.href = '/login';
    }

    handleNavigation({ route, params }) {
        // Update browser history
        history.pushState({ route, params }, '', route);
    }

    handleGlobalError(error) {
        console.error('Global error:', error);
        this.services.get('notifications').error(error.message || 'An unexpected error occurred');
    }

    handleOfflineStatus(isOnline) {
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

    handleThemeChange(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('preferred-theme', theme);
    }

    handleKeyboardShortcuts(event) {
        // Global keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    this.openGlobalSearch();
                    break;
                case 'n':
                    event.preventDefault();
                    this.createNewInspection();
                    break;
            }
        }
        
        // Escape key handling
        if (event.key === 'Escape') {
            this.components.get('modal').closeAll();
        }
    }

    handleBeforeUnload(event) {
        // Check for unsaved changes
        const hasUnsavedChanges = this.state.hasUnsavedChanges();
        if (hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    // Utility methods
    showPageLoading() {
        const loader = document.querySelector('.page-loader');
        if (loader) loader.style.display = 'flex';
    }

    hidePageLoading() {
        const loader = document.querySelector('.page-loader');
        if (loader) loader.style.display = 'none';
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app');
        
        if (loadingScreen && appContainer) {
            loadingScreen.style.display = 'none';
            appContainer.style.display = 'block';
        }
    }

    updatePageTitle(route) {
        const titles = {
            'dashboard': 'Dashboard',
            'inspections': 'Inspections',
            'templates': 'Templates',
            'reports': 'Reports',
            'settings': 'Settings'
        };
        
        document.title = `${titles[route] || 'Page'} - Site Inspection Manager`;
    }

    updateDashboardStats(stats) {
        const elements = {
            'total-inspections': stats.total || 0,
            'completed-inspections': stats.completed || 0,
            'pending-inspections': stats.pending || 0,
            'overdue-inspections': stats.overdue || 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    updateRecentInspections(inspections) {
        const container = document.getElementById('recent-inspections');
        if (!container) return;
        
        if (inspections.length === 0) {
            container.innerHTML = '<p class="text-secondary">No recent inspections</p>';
            return;
        }
        
        container.innerHTML = inspections.map(inspection => `
            <div class="inspection-item" data-id="${inspection.id}">
                <h4>${inspection.title}</h4>
                <p>${inspection.location}</p>
                <span class="badge status-${inspection.status}">${inspection.status}</span>
            </div>
        `).join('');
    }

    // Public API methods
    getState() {
        return this.state;
    }

    getComponent(name) {
        return this.components.get(name);
    }

    getService(name) {
        return this.services.get(name);
    }

    createNewInspection() {
        this.components.get('modal').show('template-selection-modal');
    }

    openGlobalSearch() {
        // Implementation for global search
        console.log('Global search opened');
    }

    // Error handling
    handleInitializationError(error) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'initialization-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h2>Application Failed to Load</h2>
                <p>There was an error initializing the application:</p>
                <pre>${error.message}</pre>
                <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
            </div>
        `;
        document.body.appendChild(errorContainer);
    }

    handlePageLoadError(error) {
        this.services.get('notifications').error(`Failed to load page: ${error.message}`);
        this.router.navigate('/');
    }

    // Cleanup
    destroy() {
        // Cleanup components
        this.components.forEach(component => {
            if (typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // Cleanup services
        this.services.forEach(service => {
            if (typeof service.destroy === 'function') {
                service.destroy();
            }
        });
        
        // Remove event listeners
        this.eventBus.removeAllListeners();
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SiteInspectionApp();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiteInspectionApp;
}