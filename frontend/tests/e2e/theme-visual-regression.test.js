import { test, expect } from '@playwright/test'

test.describe('Theme Visual Regression Tests', () => {
  // Use consistent viewport for visual comparisons
  test.use({
    viewport: { width: 1280, height: 720 }
  })

  test.beforeEach(async ({ page }) => {
    // Ensure consistent font rendering
    await page.addStyleTag({
      content: `
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "kern";
        }
      `
    })
  })

  test.describe('Full Page Screenshots', () => {
    test('should match login page in light theme', async ({ page }) => {
      await page.goto('/login')

      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      // Wait for any animations to complete
      await page.waitForTimeout(500)

      // Take screenshot
      await expect(page).toHaveScreenshot('login-page-light.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    test('should match login page in dark theme', async ({ page }) => {
      await page.goto('/login')

      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      // Wait for theme application
      await page.waitForTimeout(500)

      // Take screenshot
      await expect(page).toHaveScreenshot('login-page-dark.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    test('should match dashboard page in light theme', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'admin@example.com')
      await page.fill('[data-testid="password"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Wait for dashboard to load
      await page.waitForURL('/dashboard')
      await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 })

      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      await page.waitForTimeout(500)

      // Take screenshot
      await expect(page).toHaveScreenshot('dashboard-page-light.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    test('should match dashboard page in dark theme', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'admin@example.com')
      await page.fill('[data-testid="password"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Wait for dashboard to load
      await page.waitForURL('/dashboard')
      await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 })

      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      await page.waitForTimeout(500)

      // Take screenshot
      await expect(page).toHaveScreenshot('dashboard-page-dark.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test.describe('Component Screenshots', () => {
    test('should match navigation header in both themes', async ({ page }) => {
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'admin@example.com')
      await page.fill('[data-testid="password"]', 'password123')
      await page.click('[data-testid="login-button"]')

      await page.waitForSelector('[data-testid="app-header"]')

      // Light theme header
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(page.locator('[data-testid="app-header"]')).toHaveScreenshot('header-light.png')

      // Dark theme header
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(page.locator('[data-testid="app-header"]')).toHaveScreenshot('header-dark.png')
    })

    test('should match form components in both themes', async ({ page }) => {
      await page.goto('/login')

      // Light theme form
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      const form = page.locator('form')
      await expect(form).toHaveScreenshot('login-form-light.png')

      // Dark theme form
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(form).toHaveScreenshot('login-form-dark.png')
    })

    test('should match theme toggle component variations', async ({ page }) => {
      await page.goto('/')

      // Add theme toggle components for testing
      await page.addScriptTag({
        content: `
          const container = document.createElement('div')
          container.style.padding = '20px'
          container.style.display = 'flex'
          container.style.flexDirection = 'column'
          container.style.gap = '20px'
          container.id = 'theme-toggle-showcase'

          // Compact variant
          const compactToggle = document.createElement('div')
          compactToggle.innerHTML = \`
            <h3>Compact Toggle</h3>
            <button class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
              <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 18.5A6.5 6.5 0 1 1 12 5.5a6.5 6.5 0 0 1 0 13Z"/>
              </svg>
            </button>
          \`

          // Dropdown variant
          const dropdownToggle = document.createElement('div')
          dropdownToggle.innerHTML = \`
            <h3>Dropdown Toggle</h3>
            <div class="relative">
              <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 18.5A6.5 6.5 0 1 1 12 5.5a6.5 6.5 0 0 1 0 13Z"/>
                </svg>
                <span>Light</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </div>
          \`

          // Switch variant
          const switchToggle = document.createElement('div')
          switchToggle.innerHTML = \`
            <h3>Switch Toggle</h3>
            <label class="flex items-center gap-3">
              <span>Theme</span>
              <div class="relative">
                <div class="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full transition-colors">
                  <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform flex items-center justify-center">
                    <svg class="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 18.5A6.5 6.5 0 1 1 12 5.5a6.5 6.5 0 0 1 0 13Z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </label>
          \`

          container.appendChild(compactToggle)
          container.appendChild(dropdownToggle)
          container.appendChild(switchToggle)
          document.body.appendChild(container)
        `
      })

      const showcase = page.locator('#theme-toggle-showcase')

      // Light theme toggles
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('theme-toggles-light.png')

      // Dark theme toggles
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('theme-toggles-dark.png')
    })

    test('should match button components in both themes', async ({ page }) => {
      await page.goto('/')

      // Add button showcase
      await page.addScriptTag({
        content: `
          const buttonShowcase = document.createElement('div')
          buttonShowcase.style.padding = '20px'
          buttonShowcase.style.display = 'grid'
          buttonShowcase.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))'
          buttonShowcase.style.gap = '20px'
          buttonShowcase.id = 'button-showcase'

          const buttonTypes = [
            { name: 'Primary', class: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors' },
            { name: 'Secondary', class: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg font-medium transition-colors' },
            { name: 'Outline', class: 'border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors' },
            { name: 'Ghost', class: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors' },
            { name: 'Success', class: 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors' },
            { name: 'Warning', class: 'bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors' },
            { name: 'Error', class: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors' },
            { name: 'Disabled', class: 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed' }
          ]

          buttonTypes.forEach(btn => {
            const container = document.createElement('div')
            container.innerHTML = \`
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">\${btn.name}</h4>
              <button class="\${btn.class}" \${btn.name === 'Disabled' ? 'disabled' : ''}>\${btn.name} Button</button>
            \`
            buttonShowcase.appendChild(container)
          })

          document.body.appendChild(buttonShowcase)
        `
      })

      const showcase = page.locator('#button-showcase')

      // Light theme buttons
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('buttons-light.png')

      // Dark theme buttons
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('buttons-dark.png')
    })

    test('should match card components in both themes', async ({ page }) => {
      await page.goto('/')

      // Add card showcase
      await page.addScriptTag({
        content: `
          const cardShowcase = document.createElement('div')
          cardShowcase.style.padding = '20px'
          cardShowcase.style.display = 'grid'
          cardShowcase.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))'
          cardShowcase.style.gap = '20px'
          cardShowcase.id = 'card-showcase'

          const cards = [
            {
              title: 'Basic Card',
              content: 'This is a basic card with standard styling.',
              class: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm'
            },
            {
              title: 'Elevated Card',
              content: 'This card has more prominent shadow for emphasis.',
              class: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg'
            },
            {
              title: 'Interactive Card',
              content: 'This card has hover effects for interactivity.',
              class: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer'
            }
          ]

          cards.forEach(card => {
            const cardElement = document.createElement('div')
            cardElement.className = card.class
            cardElement.innerHTML = \`
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">\${card.title}</h3>
              <p class="text-gray-600 dark:text-gray-300">\${card.content}</p>
              <div class="mt-4 flex gap-2">
                <button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">Action</button>
                <button class="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1 text-sm transition-colors">Cancel</button>
              </div>
            \`
            cardShowcase.appendChild(cardElement)
          })

          document.body.appendChild(cardShowcase)
        `
      })

      const showcase = page.locator('#card-showcase')

      // Light theme cards
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('cards-light.png')

      // Dark theme cards
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('cards-dark.png')
    })
  })

  test.describe('State-based Screenshots', () => {
    test('should match hover states in both themes', async ({ page }) => {
      await page.goto('/')

      // Add interactive elements
      await page.addScriptTag({
        content: `
          const hoverShowcase = document.createElement('div')
          hoverShowcase.style.padding = '20px'
          hoverShowcase.style.display = 'flex'
          hoverShowcase.style.flexDirection = 'column'
          hoverShowcase.style.gap = '20px'
          hoverShowcase.id = 'hover-showcase'

          const elements = [
            '<button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors" data-testid="primary-button">Primary Button</button>',
            '<a href="#" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors" data-testid="link">Link</a>',
            '<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer" data-testid="card">Hoverable Card</div>'
          ]

          elements.forEach(html => {
            hoverShowcase.insertAdjacentHTML('beforeend', html)
          })

          document.body.appendChild(hoverShowcase)
        `
      })

      const showcase = page.locator('#hover-showcase')

      // Light theme hover states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      // Hover over button
      await page.locator('[data-testid="primary-button"]').hover()
      await expect(showcase).toHaveScreenshot('hover-states-light.png')

      // Dark theme hover states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await page.locator('[data-testid="primary-button"]').hover()
      await expect(showcase).toHaveScreenshot('hover-states-dark.png')
    })

    test('should match focus states in both themes', async ({ page }) => {
      await page.goto('/')

      // Add focusable elements
      await page.addScriptTag({
        content: `
          const focusShowcase = document.createElement('div')
          focusShowcase.style.padding = '20px'
          focusShowcase.style.display = 'flex'
          focusShowcase.style.flexDirection = 'column'
          focusShowcase.style.gap = '20px'
          focusShowcase.id = 'focus-showcase'

          const elements = [
            '<button class="bg-blue-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all" data-testid="focus-button">Focusable Button</button>',
            '<input type="text" class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 transition-all" placeholder="Focusable Input" data-testid="focus-input">',
            '<select class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 transition-all" data-testid="focus-select"><option>Option 1</option><option>Option 2</option></select>'
          ]

          elements.forEach(html => {
            focusShowcase.insertAdjacentHTML('beforeend', html)
          })

          document.body.appendChild(focusShowcase)
        `
      })

      const showcase = page.locator('#focus-showcase')

      // Light theme focus states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await page.locator('[data-testid="focus-button"]').focus()
      await expect(showcase).toHaveScreenshot('focus-states-light.png')

      // Dark theme focus states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await page.locator('[data-testid="focus-button"]').focus()
      await expect(showcase).toHaveScreenshot('focus-states-dark.png')
    })

    test('should match loading states in both themes', async ({ page }) => {
      await page.goto('/')

      // Add loading components
      await page.addScriptTag({
        content: `
          const loadingShowcase = document.createElement('div')
          loadingShowcase.style.padding = '20px'
          loadingShowcase.style.display = 'flex'
          loadingShowcase.style.flexDirection = 'column'
          loadingShowcase.style.gap = '20px'
          loadingShowcase.id = 'loading-showcase'

          const loadingElements = [
            \`<div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span class="text-gray-700 dark:text-gray-300">Loading...</span>
            </div>\`,
            \`<button class="bg-gray-400 text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2" disabled>
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              Processing...
            </button>\`,
            \`<div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-4">
              <div class="animate-pulse">
                <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>\`
          ]

          loadingElements.forEach(html => {
            loadingShowcase.insertAdjacentHTML('beforeend', html)
          })

          document.body.appendChild(loadingShowcase)
        `
      })

      const showcase = page.locator('#loading-showcase')

      // Light theme loading states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('loading-states-light.png', {
        animations: 'disabled'
      })

      // Dark theme loading states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('loading-states-dark.png', {
        animations: 'disabled'
      })
    })
  })

  test.describe('Responsive Screenshots', () => {
    test('should match mobile layout in both themes', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/login')

      // Light theme mobile
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('mobile-login-light.png', {
        fullPage: true
      })

      // Dark theme mobile
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('mobile-login-dark.png', {
        fullPage: true
      })
    })

    test('should match tablet layout in both themes', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      await page.goto('/login')

      // Light theme tablet
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('tablet-login-light.png', {
        fullPage: true
      })

      // Dark theme tablet
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('tablet-login-dark.png', {
        fullPage: true
      })
    })
  })

  test.describe('Theme Transition Screenshots', () => {
    test('should capture theme transition states', async ({ page }) => {
      await page.goto('/')

      // Start with light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      // Add transition styles
      await page.addStyleTag({
        content: `
          * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
          }
        `
      })

      // Add content to visualize transition
      await page.addScriptTag({
        content: `
          const content = document.createElement('div')
          content.style.padding = '40px'
          content.innerHTML = \`
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Theme Transition Test</h1>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <p class="text-gray-700 dark:text-gray-300 mb-4">This content demonstrates theme transitions.</p>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Sample Button</button>
            </div>
          \`
          document.body.appendChild(content)
        `
      })

      await page.waitForTimeout(300)

      // Take initial screenshot
      await expect(page).toHaveScreenshot('theme-transition-start.png')

      // Switch to dark theme and capture mid-transition
      await page.evaluate(() => {
        document.documentElement.className = 'dark'
      })

      // Capture during transition (very quick timing)
      await page.waitForTimeout(150) // Half of transition duration
      await expect(page).toHaveScreenshot('theme-transition-mid.png')

      // Capture final state
      await page.waitForTimeout(200)
      await expect(page).toHaveScreenshot('theme-transition-end.png')
    })
  })

  test.describe('Error State Screenshots', () => {
    test('should match error states in both themes', async ({ page }) => {
      await page.goto('/')

      // Add error components
      await page.addScriptTag({
        content: `
          const errorShowcase = document.createElement('div')
          errorShowcase.style.padding = '20px'
          errorShowcase.style.display = 'flex'
          errorShowcase.style.flexDirection = 'column'
          errorShowcase.style.gap = '20px'
          errorShowcase.id = 'error-showcase'

          const errorElements = [
            \`<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <h3 class="text-sm font-medium text-red-800 dark:text-red-300">Error occurred</h3>
                  <p class="text-sm text-red-700 dark:text-red-400 mt-1">Something went wrong. Please try again.</p>
                </div>
              </div>
            </div>\`,
            \`<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-300">Warning</h3>
                  <p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">This action cannot be undone.</p>
                </div>
              </div>
            </div>\`,
            \`<input type="email" class="border-2 border-red-500 rounded-lg px-3 py-2 bg-red-50 dark:bg-red-900/20 dark:border-red-400 w-full" placeholder="invalid@email" value="invalid-email">
            <p class="text-red-600 dark:text-red-400 text-sm mt-1">Please enter a valid email address.</p>\`
          ]

          errorElements.forEach(html => {
            errorShowcase.insertAdjacentHTML('beforeend', html)
          })

          document.body.appendChild(errorShowcase)
        `
      })

      const showcase = page.locator('#error-showcase')

      // Light theme error states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('error-states-light.png')

      // Dark theme error states
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })
      await page.waitForTimeout(300)

      await expect(showcase).toHaveScreenshot('error-states-dark.png')
    })
  })
})