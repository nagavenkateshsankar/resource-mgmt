/**
 * Client-side Router
 * Simple hash-based routing system
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.currentParams = null;
        this.listeners = [];
        this.middlewares = [];
        this.isStarted = false;
        
        // Bind methods
        this.handleHashChange = this.handleHashChange.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
    }

    // Route registration
    addRoute(path, handler) {
        if (typeof handler === 'string') {
            // Convert string handler to page name
            const pageName = handler;
            handler = (params) => this.showPage(pageName, params);
        }
        
        const route = {
            path,
            handler,
            regex: this.pathToRegex(path),
            paramNames: this.extractParamNames(path)
        };
        
        this.routes.set(path, route);
        return this;
    }

    // Middleware support
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }

    // Navigation
    navigate(path, params = {}) {
        if (typeof path !== 'string') {
            console.error('Router.navigate: path must be a string');
            return;
        }
        
        // Build path with parameters
        const fullPath = this.buildPath(path, params);
        
        // Update URL
        if (this.useHash) {
            window.location.hash = fullPath;
        } else {
            history.pushState({ path: fullPath, params }, '', fullPath);
            this.handleRoute(fullPath);
        }
        
        return this;
    }

    // Replace current route without adding to history
    replace(path, params = {}) {
        const fullPath = this.buildPath(path, params);
        
        if (this.useHash) {
            window.location.replace('#' + fullPath);
        } else {
            history.replaceState({ path: fullPath, params }, '', fullPath);
            this.handleRoute(fullPath);
        }
        
        return this;
    }

    // Go back in history
    back() {
        history.back();
        return this;
    }

    // Go forward in history
    forward() {
        history.forward();
        return this;
    }

    // Route change listeners
    onRouteChange(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    // Start the router
    start(useHash = true) {
        if (this.isStarted) {
            console.warn('Router is already started');
            return this;
        }
        
        this.useHash = useHash;
        this.isStarted = true;
        
        if (useHash) {
            window.addEventListener('hashchange', this.handleHashChange);
            // Handle initial route
            this.handleHashChange();
        } else {
            window.addEventListener('popstate', this.handlePopState);
            // Handle initial route
            this.handleRoute(window.location.pathname);
        }
        
        console.log('Router started');
        return this;
    }

    // Stop the router
    stop() {
        if (!this.isStarted) return this;
        
        if (this.useHash) {
            window.removeEventListener('hashchange', this.handleHashChange);
        } else {
            window.removeEventListener('popstate', this.handlePopState);
        }
        
        this.isStarted = false;
        console.log('Router stopped');
        return this;
    }

    // Event handlers
    handleHashChange() {
        const hash = window.location.hash.slice(1) || '/';
        this.handleRoute(hash);
    }

    handlePopState(event) {
        const path = event.state?.path || window.location.pathname;
        this.handleRoute(path);
    }

    async handleRoute(path) {
        try {
            // Find matching route
            const match = this.findRoute(path);
            
            if (!match) {
                console.warn(`No route found for: ${path}`);
                this.handle404(path);
                return;
            }
            
            // Extract parameters
            const params = this.extractParams(path, match.route);
            
            // Run middlewares
            const middlewareResult = await this.runMiddlewares(path, params);
            if (middlewareResult === false) {
                return; // Middleware blocked navigation
            }
            
            // Update current route info
            this.currentRoute = match.route.path;
            this.currentParams = params;
            
            // Call route handler
            await match.route.handler(params, path);
            
            // Notify listeners
            this.notifyListeners(match.route.path, params);
            
        } catch (error) {
            console.error('Route handling error:', error);
            this.handleRouteError(error, path);
        }
    }

    // Route matching
    findRoute(path) {
        for (const [routePath, route] of this.routes) {
            const match = path.match(route.regex);
            if (match) {
                return { route, match };
            }
        }
        return null;
    }

    pathToRegex(path) {
        // Convert path pattern to regex
        // /users/:id -> /^\/users\/([^\/]+)$/
        // /users/:id? -> /^\/users(?:\/([^\/]+))?$/
        
        const regexPattern = path
            .replace(/\//g, '\\/')
            .replace(/:([^\/\?]+)\?/g, '(?:\\/([^\\/]+))?') // Optional params
            .replace(/:([^\/]+)/g, '\\/([^\\/]+)') // Required params
            .replace(/\*/g, '.*'); // Wildcards
        
        return new RegExp(`^${regexPattern}$`);
    }

    extractParamNames(path) {
        const matches = path.match(/:([^\/\?]+)\??/g);
        if (!matches) return [];
        
        return matches.map(match => match.replace(':', '').replace('?', ''));
    }

    extractParams(path, route) {
        const match = path.match(route.regex);
        if (!match) return {};
        
        const params = {};
        route.paramNames.forEach((name, index) => {
            params[name] = match[index + 1];
        });
        
        return params;
    }

    buildPath(path, params) {
        let builtPath = path;
        
        // Replace parameters in path
        Object.entries(params).forEach(([key, value]) => {
            builtPath = builtPath.replace(`:${key}`, value);
        });
        
        // Add query parameters
        const queryParams = Object.entries(params)
            .filter(([key]) => !path.includes(`:${key}`))
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        if (queryParams) {
            builtPath += '?' + queryParams;
        }
        
        return builtPath;
    }

    // Middleware execution
    async runMiddlewares(path, params) {
        for (const middleware of this.middlewares) {
            try {
                const result = await middleware(path, params);
                if (result === false) {
                    return false; // Block navigation
                }
            } catch (error) {
                console.error('Middleware error:', error);
                return false;
            }
        }
        return true;
    }

    // Page management
    showPage(pageName, params) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show target page
        const pageElement = document.getElementById(`${pageName}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
            
            // Emit page change event
            const event = new CustomEvent('page:change', {
                detail: { page: pageName, params }
            });
            document.dispatchEvent(event);
        } else {
            console.error(`Page element not found: ${pageName}-page`);
        }
    }

    // Error handling
    handle404(path) {
        console.warn('404: Page not found:', path);
        
        // Try to show 404 page
        const notFoundPage = document.getElementById('not-found-page');
        if (notFoundPage) {
            this.showPage('not-found', { path });
        } else {
            // Fallback to home
            this.navigate('/');
        }
    }

    handleRouteError(error, path) {
        console.error('Route error:', error, 'for path:', path);
        
        // Show error page or redirect to safe route
        const errorPage = document.getElementById('error-page');
        if (errorPage) {
            this.showPage('error', { error: error.message, path });
        } else {
            this.navigate('/');
        }
    }

    // Listener management
    notifyListeners(route, params) {
        this.listeners.forEach(listener => {
            try {
                listener(route, params);
            } catch (error) {
                console.error('Route listener error:', error);
            }
        });
    }

    // Utility methods
    getCurrentRoute() {
        return this.currentRoute;
    }

    getCurrentParams() {
        return this.currentParams || {};
    }

    getCurrentPath() {
        if (this.useHash) {
            return window.location.hash.slice(1) || '/';
        } else {
            return window.location.pathname;
        }
    }

    isCurrentRoute(path) {
        return this.currentRoute === path;
    }

    // Query parameter utilities
    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    setQueryParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        
        if (this.useHash) {
            // Update hash with query params
            const hash = window.location.hash.split('?')[0];
            window.location.hash = hash + '?' + url.searchParams.toString();
        } else {
            history.replaceState(null, '', url.toString());
        }
    }

    // Route guards
    beforeEach(guard) {
        return this.use(async (path, params) => {
            return await guard(path, params);
        });
    }

    // Programmatic route checking
    hasRoute(path) {
        return this.routes.has(path) || this.findRoute(path) !== null;
    }

    getRoutes() {
        return Array.from(this.routes.keys());
    }

    // Debug methods
    debug() {
        return {
            routes: Array.from(this.routes.keys()),
            currentRoute: this.currentRoute,
            currentParams: this.currentParams,
            isStarted: this.isStarted,
            useHash: this.useHash
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
} else {
    window.Router = Router;
}