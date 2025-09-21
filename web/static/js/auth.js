// Authentication Module
class Auth {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('auth_user') || 'null');
        this.apiBase = '/api/v1';
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Get auth token
    getToken() {
        return this.token;
    }

    // Login user
    async login(email, password) {
        // Security: Validate inputs before sending
        if (!email || !password) {
            return { success: false, error: 'Email and password are required' };
        }

        // Security: Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Security: Add CSRF protection headers if available
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ 
                    email: email.toLowerCase().trim(), 
                    password: password 
                }),
                // Security: Ensure credentials are never cached
                cache: 'no-store'
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                
                return { success: true, user: this.user };
            } else {
                return { success: false, error: data.error || 'Invalid email or password' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Unable to connect. Please try again.' };
        }
    }

    // Register user
    async register(userData) {
        try {
            const response = await fetch(`${this.apiBase}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                
                return { success: true, user: this.user };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Logout user
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Redirect to login
        window.location.reload();
    }

    // Refresh token
    async refreshToken() {
        if (!this.token) return false;

        try {
            const response = await fetch(`${this.apiBase}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    // Make authenticated API request
    async apiRequest(url, options = {}) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);

            // Handle token expiration
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry with new token
                    config.headers['Authorization'] = `Bearer ${this.token}`;
                    return fetch(url, config);
                } else {
                    throw new Error('Authentication failed');
                }
            }

            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Check if user has permission
    hasPermission(permission) {
        if (!this.user || !this.user.permissions) return false;
        if (this.user.role === 'admin') return true;
        
        return this.user.permissions[permission] === true;
    }

    // Check if user has role
    hasRole(role) {
        if (!this.user) return false;
        return this.user.role === role;
    }

    // Get user's permissions
    getPermissions() {
        return this.user ? this.user.permissions : {};
    }

    // Update profile
    async updateProfile(profileData) {
        try {
            const response = await this.apiRequest(`${this.apiBase}/auth/profile`, {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (response.ok) {
                this.user = data;
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                return { success: true, user: this.user };
            } else {
                return { success: false, error: data.error || 'Update failed' };
            }
        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await this.apiRequest(`${this.apiBase}/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Password change failed' };
            }
        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, error: 'Network error' };
        }
    }
}

// Create global auth instance
window.auth = new Auth();

// Handle login form and OAuth buttons
document.addEventListener('DOMContentLoaded', function() {
    // Handle login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            if (!email || !password) {
                showLoginMessage('Please enter both email and password', 'error');
                return;
            }
            
            // Update button state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Signing In...';
            submitBtn.disabled = true;
            
            try {
                const result = await window.auth.login(email, password);
                
                if (result.success) {
                    showLoginMessage('Login successful! Redirecting...', 'success');
                    // Clear form
                    loginForm.reset();
                    
                    // Notify any global API client about the new token
                    if (window.apiClient && typeof window.apiClient.setToken === 'function') {
                        window.apiClient.setToken(localStorage.getItem('auth_token'));
                    }

                    console.log('=== LOGIN SUCCESS - REDIRECTING ===');
                    console.log('Token stored:', localStorage.getItem('auth_token')?.substring(0, 20) + '...');

                    // Redirect to main app after short delay
                    setTimeout(() => {
                        console.log('=== REDIRECTING TO / ===');
                        window.location.href = '/';
                    }, 500);
                } else {
                    showLoginMessage(result.error || 'Login failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showLoginMessage('Login failed. Please try again.', 'error');
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Microsoft OAuth login button event
    const msBtn = document.getElementById('microsoft-login-btn');
    if (msBtn) {
        msBtn.addEventListener('click', function() {
            window.location.href = '/api/v1/auth/microsoft/login';
        });
    }
});

// Helper function to show login messages
function showLoginMessage(message, type = 'info') {
    // Remove any existing messages
    const existingMessage = document.querySelector('.login-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message element
    const messageEl = document.createElement('div');
    messageEl.className = `login-message ${type}`;
    messageEl.textContent = message;
    
    // Insert after form
    const form = document.getElementById('login-form');
    if (form) {
        form.parentNode.insertBefore(messageEl, form.nextSibling);
        
        // Auto-remove error messages after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }
    }
}