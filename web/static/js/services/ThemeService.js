/**
 * Theme Service
 * Handles theme switching and management
 */

class ThemeService {
    constructor() {
        this.themes = new Map();
        this.currentTheme = null;
        this.defaultTheme = 'light';
        this.storageKey = 'app-theme';
        this.systemPreference = null;
        
        this.init();
    }

    init() {
        // Register default themes
        this.registerDefaultThemes();
        
        // Set up system preference detection
        this.setupSystemPreferenceDetection();
        
        // Load saved theme or use system preference
        const savedTheme = this.getSavedTheme();
        const initialTheme = savedTheme || this.getSystemPreference() || this.defaultTheme;
        
        this.setTheme(initialTheme);
        
        console.log('ThemeService initialized with theme:', initialTheme);
    }

    registerDefaultThemes() {
        // Light theme
        this.registerTheme('light', {
            name: 'Light',
            colors: {
                primary: '#2563eb',
                secondary: '#64748b',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#1e293b',
                textSecondary: '#64748b'
            },
            properties: {
                '--color-primary': '#2563eb',
                '--color-secondary': '#64748b',
                '--color-success': '#10b981',
                '--color-warning': '#f59e0b',
                '--color-error': '#ef4444',
                '--color-background': '#ffffff',
                '--color-surface': '#f8fafc',
                '--color-text': '#1e293b',
                '--color-text-secondary': '#64748b',
                '--border-color': '#e2e8f0',
                '--shadow': '0 1px 3px rgba(0, 0, 0, 0.1)'
            }
        });

        // Dark theme
        this.registerTheme('dark', {
            name: 'Dark',
            colors: {
                primary: '#3b82f6',
                secondary: '#94a3b8',
                success: '#22c55e',
                warning: '#fbbf24',
                error: '#f87171',
                background: '#0f172a',
                surface: '#1e293b',
                text: '#f8fafc',
                textSecondary: '#94a3b8'
            },
            properties: {
                '--color-primary': '#3b82f6',
                '--color-secondary': '#94a3b8',
                '--color-success': '#22c55e',
                '--color-warning': '#fbbf24',
                '--color-error': '#f87171',
                '--color-background': '#0f172a',
                '--color-surface': '#1e293b',
                '--color-text': '#f8fafc',
                '--color-text-secondary': '#94a3b8',
                '--border-color': '#334155',
                '--shadow': '0 1px 3px rgba(0, 0, 0, 0.3)'
            }
        });

        // High contrast theme
        this.registerTheme('high-contrast', {
            name: 'High Contrast',
            colors: {
                primary: '#000000',
                secondary: '#666666',
                success: '#008000',
                warning: '#ff8c00',
                error: '#ff0000',
                background: '#ffffff',
                surface: '#ffffff',
                text: '#000000',
                textSecondary: '#333333'
            },
            properties: {
                '--color-primary': '#000000',
                '--color-secondary': '#666666',
                '--color-success': '#008000',
                '--color-warning': '#ff8c00',
                '--color-error': '#ff0000',
                '--color-background': '#ffffff',
                '--color-surface': '#ffffff',
                '--color-text': '#000000',
                '--color-text-secondary': '#333333',
                '--border-color': '#000000',
                '--shadow': '0 2px 4px rgba(0, 0, 0, 0.5)'
            }
        });
    }

    setupSystemPreferenceDetection() {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Set initial preference
            this.systemPreference = darkModeQuery.matches ? 'dark' : 'light';
            
            // Listen for changes
            darkModeQuery.addEventListener('change', (e) => {
                this.systemPreference = e.matches ? 'dark' : 'light';
                this.emit('theme:system-preference-changed', this.systemPreference);
                
                // Auto-switch if user hasn't set a preference
                if (!this.getSavedTheme()) {
                    this.setTheme(this.systemPreference);
                }
            });
        }
    }

    // Register a custom theme
    registerTheme(id, theme) {
        if (!theme.name || !theme.properties) {
            throw new Error('Theme must have name and properties');
        }

        this.themes.set(id, {
            id,
            ...theme,
            isCustom: !['light', 'dark', 'high-contrast'].includes(id)
        });

        this.emit('theme:registered', { id, theme });
    }

    // Set active theme
    setTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) {
            console.warn(`Theme '${themeId}' not found, using default`);
            return this.setTheme(this.defaultTheme);
        }

        // Store previous theme for transition effects
        const previousTheme = this.currentTheme;
        this.currentTheme = themeId;

        // Apply theme properties to CSS
        this.applyThemeProperties(theme);
        
        // Update document attributes
        document.documentElement.setAttribute('data-theme', themeId);
        document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` theme-${themeId}`;

        // Save to storage
        this.saveTheme(themeId);

        // Emit events
        this.emit('theme:changed', { 
            current: themeId, 
            previous: previousTheme,
            theme 
        });

        // Apply transition class temporarily
        document.documentElement.classList.add('theme-transitioning');
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 300);

        return theme;
    }

    applyThemeProperties(theme) {
        const root = document.documentElement;
        
        // Apply CSS custom properties
        Object.entries(theme.properties).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Apply additional styles if provided
        if (theme.styles) {
            this.applyThemeStyles(theme.styles);
        }
    }

    applyThemeStyles(styles) {
        // Remove existing theme styles
        const existingStyle = document.getElementById('dynamic-theme-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Create new style element
        const styleElement = document.createElement('style');
        styleElement.id = 'dynamic-theme-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    // Get available themes
    getThemes() {
        return Array.from(this.themes.values());
    }

    getTheme(themeId) {
        return this.themes.get(themeId);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getCurrentThemeData() {
        return this.themes.get(this.currentTheme);
    }

    // Check if theme exists
    hasTheme(themeId) {
        return this.themes.has(themeId);
    }

    // Toggle between light and dark
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        return this.setTheme(newTheme);
    }

    // Cycle through available themes
    cycleTheme() {
        const themes = Array.from(this.themes.keys());
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        return this.setTheme(themes[nextIndex]);
    }

    // System preference handling
    getSystemPreference() {
        return this.systemPreference;
    }

    useSystemTheme() {
        const systemTheme = this.getSystemPreference();
        if (systemTheme) {
            this.setTheme(systemTheme);
            // Clear saved preference to track system
            localStorage.removeItem(this.storageKey);
        }
    }

    // Storage management
    saveTheme(themeId) {
        try {
            localStorage.setItem(this.storageKey, themeId);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
        }
    }

    getSavedTheme() {
        try {
            return localStorage.getItem(this.storageKey);
        } catch (error) {
            console.warn('Failed to load theme preference:', error);
            return null;
        }
    }

    clearSavedTheme() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Failed to clear theme preference:', error);
        }
    }

    // Theme customization
    updateThemeProperty(property, value) {
        const currentTheme = this.getCurrentThemeData();
        if (!currentTheme) return;

        // Update the theme data
        currentTheme.properties[property] = value;

        // Apply immediately if this is the active theme
        if (this.currentTheme === currentTheme.id) {
            document.documentElement.style.setProperty(property, value);
        }

        this.emit('theme:property-updated', { property, value, theme: currentTheme });
    }

    // Create theme from current properties
    createThemeFromCurrent(id, name) {
        const root = document.documentElement;
        const computedStyles = getComputedStyle(root);
        
        const properties = {};
        
        // Extract CSS custom properties
        Array.from(document.styleSheets).forEach(sheet => {
            try {
                Array.from(sheet.cssRules).forEach(rule => {
                    if (rule.style) {
                        Array.from(rule.style).forEach(prop => {
                            if (prop.startsWith('--')) {
                                properties[prop] = computedStyles.getPropertyValue(prop).trim();
                            }
                        });
                    }
                });
            } catch (error) {
                // Ignore CORS errors
            }
        });

        this.registerTheme(id, {
            name,
            properties,
            isCustom: true,
            createdAt: new Date().toISOString()
        });

        return this.getTheme(id);
    }

    // Remove custom theme
    removeTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) return false;

        if (!theme.isCustom) {
            console.warn('Cannot remove built-in theme:', themeId);
            return false;
        }

        this.themes.delete(themeId);
        
        // Switch to default if removing current theme
        if (this.currentTheme === themeId) {
            this.setTheme(this.defaultTheme);
        }

        this.emit('theme:removed', { id: themeId, theme });
        return true;
    }

    // Accessibility helpers
    isHighContrast() {
        return this.currentTheme === 'high-contrast';
    }

    isDarkMode() {
        const theme = this.getCurrentThemeData();
        return theme && (theme.id === 'dark' || theme.colors.background === '#0f172a');
    }

    getContrastRatio(color1, color2) {
        // Simple contrast ratio calculation
        const luminance1 = this.getLuminance(color1);
        const luminance2 = this.getLuminance(color2);
        
        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }

    getLuminance(hex) {
        // Convert hex to RGB
        const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255);
        
        // Apply gamma correction
        const [r, g, b] = rgb.map(c => 
            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        
        // Calculate relative luminance
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    // Event emitter
    emit(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Import/Export themes
    exportTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) return null;

        return JSON.stringify({
            version: '1.0',
            theme: {
                ...theme,
                exportedAt: new Date().toISOString()
            }
        }, null, 2);
    }

    importTheme(themeData) {
        try {
            const parsed = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;
            
            if (!parsed.theme || !parsed.theme.id) {
                throw new Error('Invalid theme data');
            }

            const theme = parsed.theme;
            this.registerTheme(theme.id, theme);
            
            this.emit('theme:imported', theme);
            return theme.id;
            
        } catch (error) {
            console.error('Failed to import theme:', error);
            throw error;
        }
    }

    // Cleanup
    destroy() {
        this.themes.clear();
        this.currentTheme = null;
        
        // Remove dynamic styles
        const dynamicStyles = document.getElementById('dynamic-theme-styles');
        if (dynamicStyles) {
            dynamicStyles.remove();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeService;
} else {
    window.ThemeService = ThemeService;
}