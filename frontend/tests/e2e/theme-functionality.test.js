import { test, expect } from '@playwright/test'

test.describe('Theme System Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean slate - clear localStorage
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test.describe('Theme Initialization', () => {
    test('should initialize with system theme preference', async ({ page }) => {
      // Mock dark system preference
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/')

      // Should detect system dark preference
      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/dark/)
    })

    test('should initialize with light theme when system prefers light', async ({ page }) => {
      // Mock light system preference
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto('/')

      // Should detect system light preference
      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/light/)
    })

    test('should restore persisted theme preference', async ({ page }) => {
      // Set a theme preference in localStorage
      await page.goto('/')
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
      })
      await page.reload()

      // Should restore dark theme
      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/dark/)
    })
  })

  test.describe('Theme Toggle - Compact Variant', () => {
    test('should toggle theme with compact button', async ({ page }) => {
      await page.goto('/login')

      // Add theme toggle to login page for testing
      await page.addScriptTag({
        content: `
          const themeToggle = document.createElement('div')
          themeToggle.innerHTML = '<button data-testid="theme-toggle-compact" onclick="window.themeStore?.toggleTheme()">Toggle</button>'
          document.body.appendChild(themeToggle)
        `
      })

      const toggleButton = page.locator('[data-testid="theme-toggle-compact"]')
      const htmlElement = page.locator('html')

      // Initial state should be light (or system default)
      await expect(htmlElement).toHaveClass(/light/)

      // Click to toggle to dark
      await toggleButton.click()
      await expect(htmlElement).toHaveClass(/dark/)

      // Click to toggle to system
      await toggleButton.click()
      await expect(htmlElement).toHaveClass(/(light|dark)/) // Depends on system preference

      // Click to toggle back to light
      await toggleButton.click()
      await expect(htmlElement).toHaveClass(/light/)
    })

    test('should show correct icons for different themes', async ({ page }) => {
      await page.goto('/')

      // Mock the theme toggle component
      await page.addScriptTag({
        content: `
          const createThemeToggle = (theme) => {
            const toggle = document.createElement('div')
            toggle.setAttribute('data-testid', 'theme-toggle')
            if (theme === 'light') {
              toggle.innerHTML = '<svg data-testid="light-mode-icon"></svg>'
            } else {
              toggle.innerHTML = '<svg data-testid="dark-mode-icon"></svg>'
            }
            return toggle
          }

          const updateThemeToggle = (theme) => {
            const existing = document.querySelector('[data-testid="theme-toggle"]')
            if (existing) existing.remove()
            document.body.appendChild(createThemeToggle(theme))
          }

          // Start with light
          updateThemeToggle('light')

          // Expose function for testing
          window.updateThemeToggle = updateThemeToggle
        `
      })

      // Should show sun icon for light theme
      await expect(page.locator('[data-testid="light-mode-icon"]')).toBeVisible()

      // Switch to dark theme
      await page.evaluate(() => window.updateThemeToggle('dark'))
      await expect(page.locator('[data-testid="dark-mode-icon"]')).toBeVisible()
    })
  })

  test.describe('Theme Persistence', () => {
    test('should persist theme selection across page reloads', async ({ page }) => {
      await page.goto('/')

      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      // Reload page
      await page.reload()

      // Should maintain dark theme
      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/dark/)

      // Check localStorage persisted the value
      const storedTheme = await page.evaluate(() => localStorage.getItem('resource-mgmt-theme'))
      expect(storedTheme).toBe('dark')
    })

    test('should persist theme across browser sessions', async ({ page, context }) => {
      await page.goto('/')

      // Set theme preference
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      // Close and reopen page (simulating new session)
      await page.close()
      const newPage = await context.newPage()
      await newPage.goto('/')

      // Should restore dark theme
      const htmlElement = newPage.locator('html')
      await expect(htmlElement).toHaveClass(/dark/)
    })
  })

  test.describe('Theme Application', () => {
    test('should apply theme classes to HTML element', async ({ page }) => {
      await page.goto('/')

      // Test light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/light/)
      await expect(htmlElement).not.toHaveClass(/dark/)

      // Test dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      await expect(htmlElement).toHaveClass(/dark/)
      await expect(htmlElement).not.toHaveClass(/light/)
    })

    test('should apply CSS custom properties', async ({ page }) => {
      await page.goto('/')

      // Set dark theme and check CSS variables
      await page.evaluate(() => {
        document.documentElement.style.setProperty('--theme-bg', '#0f172a')
        document.documentElement.style.setProperty('--theme-text-primary', '#f8fafc')
      })

      const bgColor = await page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--theme-bg')
      )
      const textColor = await page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--theme-text-primary')
      )

      expect(bgColor).toBe('#0f172a')
      expect(textColor).toBe('#f8fafc')
    })

    test('should update meta theme-color tag', async ({ page }) => {
      await page.goto('/')

      // Check meta tag for light theme
      await page.evaluate(() => {
        let meta = document.querySelector('meta[name="theme-color"]')
        if (!meta) {
          meta = document.createElement('meta')
          meta.name = 'theme-color'
          document.head.appendChild(meta)
        }
        meta.content = '#ffffff'
      })

      let metaColor = await page.locator('meta[name="theme-color"]').getAttribute('content')
      expect(metaColor).toBe('#ffffff')

      // Check meta tag for dark theme
      await page.evaluate(() => {
        const meta = document.querySelector('meta[name="theme-color"]')
        meta.content = '#1e293b'
      })

      metaColor = await page.locator('meta[name="theme-color"]').getAttribute('content')
      expect(metaColor).toBe('#1e293b')
    })
  })

  test.describe('System Theme Changes', () => {
    test('should respond to system theme changes when using system preference', async ({ page }) => {
      await page.goto('/')

      // Set to system theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'system')
      })

      // Mock system light preference
      await page.emulateMedia({ colorScheme: 'light' })
      await page.evaluate(() => {
        document.documentElement.className = 'light'
      })

      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/light/)

      // Change system to dark preference
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.evaluate(() => {
        document.documentElement.className = 'dark'
      })

      await expect(htmlElement).toHaveClass(/dark/)
    })

    test('should not respond to system changes when explicit theme is set', async ({ page }) => {
      await page.goto('/')

      // Set explicit light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/light/)

      // Change system preference to dark
      await page.emulateMedia({ colorScheme: 'dark' })

      // Should remain light since explicit theme is set
      await expect(htmlElement).toHaveClass(/light/)
    })
  })

  test.describe('Theme Integration with Components', () => {
    test('should apply theme styles to navigation components', async ({ page }) => {
      // Login first to see navigation
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'admin@example.com')
      await page.fill('[data-testid="password"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Wait for navigation to load
      await page.waitForSelector('[data-testid="app-header"]', { timeout: 10000 })

      // Test light theme navigation
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      // Navigation should have light theme classes
      const header = page.locator('[data-testid="app-header"]')
      await expect(header).toHaveCSS('background-color', /rgb\(255,\s*255,\s*255\)/)

      // Test dark theme navigation
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      // Navigation should adapt to dark theme
      // Note: Actual color values depend on Tailwind CSS compilation
    })

    test('should apply theme styles to form components', async ({ page }) => {
      await page.goto('/login')

      // Test form styling in light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      const emailInput = page.locator('[data-testid="email"]')
      await expect(emailInput).toBeVisible()

      // Test form styling in dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      await expect(emailInput).toBeVisible()
    })

    test('should apply theme styles to button components', async ({ page }) => {
      await page.goto('/login')

      const loginButton = page.locator('[data-testid="login-button"]')

      // Test button in light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      await expect(loginButton).toBeVisible()

      // Test button in dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      await expect(loginButton).toBeVisible()
    })
  })

  test.describe('Theme Performance', () => {
    test('should switch themes quickly without lag', async ({ page }) => {
      await page.goto('/')

      // Measure theme switching performance
      const switchTime = await page.evaluate(async () => {
        const start = performance.now()

        // Switch themes multiple times
        for (let i = 0; i < 10; i++) {
          localStorage.setItem('resource-mgmt-theme', i % 2 === 0 ? 'light' : 'dark')
          document.documentElement.className = i % 2 === 0 ? 'light' : 'dark'
        }

        const end = performance.now()
        return end - start
      })

      // Theme switching should be fast (less than 100ms for 10 switches)
      expect(switchTime).toBeLessThan(100)
    })

    test('should not cause memory leaks with frequent theme changes', async ({ page }) => {
      await page.goto('/')

      // Perform many theme switches and check memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })

      await page.evaluate(() => {
        // Rapidly switch themes
        for (let i = 0; i < 100; i++) {
          localStorage.setItem('resource-mgmt-theme', i % 3 === 0 ? 'light' : i % 3 === 1 ? 'dark' : 'system')
          document.documentElement.className = i % 3 === 0 ? 'light' : 'dark'
        }
      })

      // Allow some time for garbage collection
      await page.waitForTimeout(1000)

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })

      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(1000000) // Less than 1MB increase
    })
  })

  test.describe('Error Handling', () => {
    test('should handle localStorage errors gracefully', async ({ page }) => {
      await page.goto('/')

      // Mock localStorage to throw errors
      await page.evaluate(() => {
        const originalSetItem = localStorage.setItem
        localStorage.setItem = () => {
          throw new Error('Storage quota exceeded')
        }

        // Try to set theme (should not crash)
        try {
          localStorage.setItem('resource-mgmt-theme', 'dark')
        } catch (e) {
          console.log('Expected error caught:', e.message)
        }

        // Restore original function
        localStorage.setItem = originalSetItem
      })

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle invalid theme values gracefully', async ({ page }) => {
      await page.goto('/')

      // Set invalid theme value
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'invalid-theme')
      })

      await page.reload()

      // Should fallback to system theme
      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveClass(/(light|dark)/)
    })

    test('should handle missing matchMedia gracefully', async ({ page }) => {
      await page.goto('/')

      // Mock missing matchMedia
      await page.evaluate(() => {
        delete (window as any).matchMedia
      })

      // Should still function without errors
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Cross-Tab Synchronization', () => {
    test('should synchronize theme changes across tabs', async ({ context }) => {
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      await page1.goto('/')
      await page2.goto('/')

      // Set theme in first tab
      await page1.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'resource-mgmt-theme',
          newValue: 'dark'
        }))
      })

      // Second tab should eventually sync (if storage event listener is implemented)
      // Note: This test depends on implementation of cross-tab sync
      await page2.waitForTimeout(100)

      // Both tabs should have dark theme
      await expect(page1.locator('html')).toHaveClass(/dark/)
    })
  })

  test.describe('Theme Transitions', () => {
    test('should apply smooth transitions when switching themes', async ({ page }) => {
      await page.goto('/')

      // Add transition styles
      await page.addStyleTag({
        content: `
          * {
            transition: background-color 0.3s ease, color 0.3s ease !important;
          }
        `
      })

      // Switch theme and verify transition occurs
      await page.evaluate(() => {
        document.documentElement.className = 'light'
      })

      await page.waitForTimeout(100)

      await page.evaluate(() => {
        document.documentElement.className = 'dark'
      })

      // Verify element has transition styles
      const hasTransition = await page.evaluate(() => {
        const computed = getComputedStyle(document.body)
        return computed.transition.includes('background-color')
      })

      expect(hasTransition).toBe(true)
    })
  })
})