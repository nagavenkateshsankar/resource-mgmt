/**
 * API Client
 * Handles HTTP requests with authentication, error handling, and retries
 */

class APIClient {
    constructor(options = {}) {
        this.options = {
            baseURL: '/api/v1',
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            ...options
        };
        
        this.interceptors = {
            request: [],
            response: []
        };
        
        this.auth = {
            token: this.getStoredToken(),
            refreshToken: this.getStoredRefreshToken(),
            isRefreshing: false,
            failedRequests: []
        };
        
        this.init();
    }

    init() {
        // Setup default request interceptors
        this.addRequestInterceptor(this.addAuthHeader.bind(this));
        this.addRequestInterceptor(this.addTimestamp.bind(this));
        
        // Setup default response interceptors
        this.addResponseInterceptor(this.handleAuthErrors.bind(this));
        this.addResponseInterceptor(this.handleGlobalErrors.bind(this));
        
        console.log('APIClient initialized');
    }

    // Configuration
    setBaseURL(url) {
        this.options.baseURL = url.replace(/\/$/, '');
    }

    setTimeout(timeout) {
        this.options.timeout = timeout;
    }

    setHeaders(headers) {
        this.options.headers = { ...this.options.headers, ...headers };
    }

    // Authentication
    setToken(token, refreshToken = null) {
        this.auth.token = token;
        this.auth.refreshToken = refreshToken;
        
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
        
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
    }

    getStoredToken() {
        return localStorage.getItem('auth_token');
    }

    getStoredRefreshToken() {
        return localStorage.getItem('refresh_token');
    }

    clearAuth() {
        this.auth.token = null;
        this.auth.refreshToken = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
    }

    // Refresh token from localStorage
    refreshTokenFromStorage() {
        this.auth.token = this.getStoredToken();
        this.auth.refreshToken = this.getStoredRefreshToken();
    }

    // HTTP Methods
    async get(url, config = {}) {
        return this.request({ method: 'GET', url, ...config });
    }

    async post(url, data, config = {}) {
        return this.request({ method: 'POST', url, data, ...config });
    }

    async put(url, data, config = {}) {
        return this.request({ method: 'PUT', url, data, ...config });
    }

    async patch(url, data, config = {}) {
        return this.request({ method: 'PATCH', url, data, ...config });
    }

    async delete(url, config = {}) {
        return this.request({ method: 'DELETE', url, ...config });
    }

    // Main request method
    async request(config) {
        const requestConfig = this.buildRequestConfig(config);
        
        try {
            // Apply request interceptors
            const processedConfig = await this.applyRequestInterceptors(requestConfig);
            
            // Make request with retries
            const response = await this.makeRequestWithRetries(processedConfig);
            
            // Apply response interceptors
            const processedResponse = await this.applyResponseInterceptors(response);
            
            return processedResponse;
            
        } catch (error) {
            // Handle and transform errors
            throw this.transformError(error);
        }
    }

    buildRequestConfig(config) {
        const fullURL = this.buildURL(config.url);
        
        return {
            method: config.method || 'GET',
            url: fullURL,
            headers: {
                ...this.options.headers,
                ...config.headers
            },
            data: config.data,
            params: config.params,
            timeout: config.timeout || this.options.timeout,
            responseType: config.responseType || 'json',
            ...config
        };
    }

    buildURL(path) {
        if (path.startsWith('http')) {
            return path;
        }
        
        const baseURL = this.options.baseURL;
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        
        // Ensure baseURL ends with no trailing slash and cleanPath starts with no leading slash
        const finalBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
        const finalURL = `${finalBaseURL}/${cleanPath}`;
        
        return finalURL;
    }

    async makeRequestWithRetries(config, attempt = 1) {
        try {
            const response = await this.makeRequest(config);
            return response;
            
        } catch (error) {
            if (this.shouldRetry(error, attempt)) {
                console.warn(`Request failed (attempt ${attempt}), retrying...`, error);
                
                // Wait before retrying
                await this.delay(this.options.retryDelay * attempt);
                
                return this.makeRequestWithRetries(config, attempt + 1);
            }
            
            throw error;
        }
    }

    async makeRequest(config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        try {
            // Build fetch options
            const fetchOptions = {
                method: config.method,
                headers: config.headers,
                signal: controller.signal
            };
            
            // Add body for non-GET requests
            if (config.data && config.method !== 'GET') {
                if (config.data instanceof FormData) {
                    fetchOptions.body = config.data;
                    // Remove Content-Type for FormData (browser sets it)
                    delete fetchOptions.headers['Content-Type'];
                } else {
                    fetchOptions.body = JSON.stringify(config.data);
                }
            }
            
            // Add query parameters
            let url = config.url;
            if (config.params) {
                const searchParams = new URLSearchParams(config.params);
                url += '?' + searchParams.toString();
            }
            
            // Make request
            console.log('APIClient making fetch call to:', url);
            const fetchResponse = await fetch(url, fetchOptions);
            
            // Clear timeout
            clearTimeout(timeoutId);
            
            // Process response
            const response = await this.processResponse(fetchResponse, config);
            
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 'TIMEOUT', config);
            }
            
            throw error;
        }
    }

    async processResponse(fetchResponse, config) {
        const response = {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: this.parseHeaders(fetchResponse.headers),
            config,
            url: fetchResponse.url
        };

        // Handle empty responses
        if (fetchResponse.status === 204 || config.method === 'HEAD') {
            response.data = null;
            return response;
        }

        // Parse response body
        try {
            const contentType = fetchResponse.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                response.data = await fetchResponse.json();
            } else if (contentType.includes('text/')) {
                response.data = await fetchResponse.text();
            } else {
                response.data = await fetchResponse.blob();
            }
        } catch (parseError) {
            console.warn('Failed to parse response:', parseError);
            response.data = null;
        }

        // Check for HTTP errors
        if (!fetchResponse.ok) {
            throw new APIError(
                response.data?.message || fetchResponse.statusText || 'Request failed',
                response.data?.code || 'HTTP_ERROR',
                config,
                response
            );
        }

        return response;
    }

    parseHeaders(headers) {
        const parsed = {};
        for (const [key, value] of headers.entries()) {
            parsed[key] = value;
        }
        return parsed;
    }

    // Interceptors
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }

    async applyRequestInterceptors(config) {
        let processedConfig = config;
        
        for (const interceptor of this.interceptors.request) {
            try {
                const result = await interceptor(processedConfig);
                if (result) processedConfig = result;
            } catch (error) {
                console.error('Request interceptor error:', error);
            }
        }
        
        return processedConfig;
    }

    async applyResponseInterceptors(response) {
        let processedResponse = response;
        
        for (const interceptor of this.interceptors.response) {
            try {
                const result = await interceptor(processedResponse);
                if (result) processedResponse = result;
            } catch (error) {
                console.error('Response interceptor error:', error);
            }
        }
        
        return processedResponse;
    }

    // Default interceptors
    addAuthHeader(config) {
        if (this.auth.token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${this.auth.token}`;
        }
        return config;
    }

    addTimestamp(config) {
        if (!config.headers['X-Request-Time']) {
            config.headers['X-Request-Time'] = new Date().toISOString();
        }
        return config;
    }

    async handleAuthErrors(response) {
        if (response.status === 401 && this.auth.token) {
            // Token might be expired, try to refresh
            if (this.auth.refreshToken && !this.auth.isRefreshing) {
                try {
                    await this.refreshAuthToken();
                    
                    // Retry the original request
                    return this.request(response.config);
                    
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    this.clearAuth();
                    this.emit('auth:logout');
                    throw new APIError('Authentication expired', 'AUTH_EXPIRED', response.config);
                }
            } else {
                this.clearAuth();
                this.emit('auth:logout');
                throw new APIError('Authentication required', 'AUTH_REQUIRED', response.config);
            }
        }
        
        return response;
    }

    async handleGlobalErrors(response) {
        // Handle specific error codes globally
        if (response.status >= 500) {
            this.emit('api:server-error', response);
        } else if (response.status === 403) {
            this.emit('api:forbidden', response);
        } else if (response.status === 429) {
            this.emit('api:rate-limited', response);
        }
        
        return response;
    }

    // Token refresh
    async refreshAuthToken() {
        if (this.auth.isRefreshing) {
            // Wait for current refresh to complete
            return new Promise((resolve, reject) => {
                this.auth.failedRequests.push({ resolve, reject });
            });
        }
        
        this.auth.isRefreshing = true;
        
        try {
            const response = await fetch(`${this.options.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.auth.refreshToken
                })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            this.setToken(data.access_token, data.refresh_token || this.auth.refreshToken);
            
            // Resolve failed requests
            this.auth.failedRequests.forEach(({ resolve }) => resolve());
            this.auth.failedRequests = [];
            
        } catch (error) {
            // Reject failed requests
            this.auth.failedRequests.forEach(({ reject }) => reject(error));
            this.auth.failedRequests = [];
            
            throw error;
            
        } finally {
            this.auth.isRefreshing = false;
        }
    }

    // Utility methods
    shouldRetry(error, attempt) {
        if (attempt >= this.options.retries) return false;
        
        // Retry on network errors or 5xx status codes
        if (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR') {
            return true;
        }
        
        if (error.response && error.response.status >= 500) {
            return true;
        }
        
        return false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    transformError(error) {
        if (error instanceof APIError) {
            return error;
        }
        
        // Transform fetch errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return new APIError('Network error', 'NETWORK_ERROR', null, null, error);
        }
        
        return new APIError(error.message, 'UNKNOWN_ERROR', null, null, error);
    }

    // Event emitter
    emit(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Convenience methods
    async upload(url, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        if (options.fields) {
            Object.entries(options.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }
        
        return this.post(url, formData, {
            ...options,
            headers: {
                ...options.headers
                // Don't set Content-Type for FormData
            }
        });
    }

    async download(url, filename, options = {}) {
        const response = await this.get(url, {
            ...options,
            responseType: 'blob'
        });
        
        // Create download link
        const blob = response.data;
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        
        return response;
    }

    // Batch requests
    async batch(requests) {
        const promises = requests.map(config => this.request(config));
        return Promise.all(promises);
    }

    // Cancel requests
    createCancelToken() {
        const controller = new AbortController();
        return {
            token: controller.signal,
            cancel: (reason) => controller.abort(reason)
        };
    }

    // Debug information
    debug() {
        return {
            baseURL: this.options.baseURL,
            hasToken: !!this.auth.token,
            requestInterceptors: this.interceptors.request.length,
            responseInterceptors: this.interceptors.response.length
        };
    }
}

// API Error class
class APIError extends Error {
    constructor(message, code, config, response, originalError) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.config = config;
        this.response = response;
        this.originalError = originalError;
        this.timestamp = new Date();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            status: this.response?.status,
            timestamp: this.timestamp
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, APIError };
} else {
    window.APIClient = APIClient;
    window.APIError = APIError;
}