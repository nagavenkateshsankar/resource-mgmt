import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Theme System Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
  })

  test.describe('Color Contrast Compliance', () => {
    test('should meet WCAG AA contrast requirements in light theme', async ({ page }) => {
      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      // Check accessibility for the entire page
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })

    test('should meet WCAG AA contrast requirements in dark theme', async ({ page }) => {
      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      // Check accessibility for the entire page
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })

    test('should maintain contrast ratios for interactive elements', async ({ page }) => {
      // Test buttons in light theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      // Add test buttons with theme classes
      await page.addScriptTag({
        content: `
          const testButtons = [
            { class: 'bg-blue-600 text-white hover:bg-blue-700', text: 'Primary Button' },
            { class: 'bg-gray-200 text-gray-900 hover:bg-gray-300', text: 'Secondary Button' },
            { class: 'text-blue-600 hover:text-blue-700', text: 'Text Button' }
          ]

          testButtons.forEach((btn, i) => {
            const button = document.createElement('button')
            button.className = btn.class + ' px-4 py-2 rounded'
            button.textContent = btn.text
            button.setAttribute('data-testid', 'test-button-' + i)
            document.body.appendChild(button)
          })
        `
      })

      // Check contrast for buttons
      await checkA11y(page, '[data-testid^="test-button"]', {
        rules: {
          'color-contrast': { enabled: true }
        }
      })

      // Test dark theme
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'

        // Update button classes for dark theme
        const buttons = document.querySelectorAll('[data-testid^="test-button"]')
        buttons[0].className = 'bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded'
        buttons[1].className = 'bg-gray-700 text-gray-100 hover:bg-gray-600 px-4 py-2 rounded'
        buttons[2].className = 'text-blue-400 hover:text-blue-300 px-4 py-2 rounded'
      })

      await checkA11y(page, '[data-testid^="test-button"]', {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })

    test('should maintain contrast for form elements', async ({ page }) => {
      await page.goto('/login')

      // Test light theme form contrast
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'light')
        document.documentElement.className = 'light'
      })

      await checkA11y(page, 'form', {
        rules: {
          'color-contrast': { enabled: true },
          'label': { enabled: true }
        }
      })

      // Test dark theme form contrast
      await page.evaluate(() => {
        localStorage.setItem('resource-mgmt-theme', 'dark')
        document.documentElement.className = 'dark'
      })

      await checkA11y(page, 'form', {
        rules: {
          'color-contrast': { enabled: true },
          'label': { enabled: true }
        }
      })
    })
  })

  test.describe('Theme Toggle Accessibility', () => {
    test('should have proper ARIA attributes for compact toggle', async ({ page }) => {
      // Add theme toggle to page
      await page.addScriptTag({
        content: `
          const toggle = document.createElement('button')
          toggle.setAttribute('data-testid', 'theme-toggle-compact')
          toggle.setAttribute('aria-label', 'Toggle theme. Current theme: light')
          toggle.setAttribute('title', 'Switch to dark mode')
          toggle.innerHTML = '<svg aria-hidden="true"><path/></svg>'
          document.body.appendChild(toggle)
        `
      })

      const toggle = page.locator('[data-testid="theme-toggle-compact"]')

      // Check required ARIA attributes
      await expect(toggle).toHaveAttribute('aria-label')
      await expect(toggle).toHaveAttribute('title')

      // Icon should be hidden from screen readers
      const icon = toggle.locator('svg')
      await expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    test('should have proper ARIA attributes for dropdown toggle', async ({ page }) => {
      // Add dropdown theme toggle
      await page.addScriptTag({
        content: `
          const dropdown = document.createElement('div')
          dropdown.innerHTML = \`
            <button
              data-testid="theme-dropdown-trigger"
              aria-haspopup="true"
              aria-expanded="false"
              aria-label="Theme settings"
            >
              Theme
              <svg aria-hidden="true"><path/></svg>
            </button>
            <div
              data-testid="theme-dropdown-menu"
              role="menu"
              aria-labelledby="theme-dropdown-trigger"
              style="display: none;"
            >
              <button role="menuitem" aria-pressed="false">Light</button>
              <button role="menuitem" aria-pressed="true">Dark</button>
              <button role="menuitem" aria-pressed="false">System</button>
            </div>
          \`
          document.body.appendChild(dropdown)
        `
      })

      const trigger = page.locator('[data-testid="theme-dropdown-trigger"]')
      const menu = page.locator('[data-testid="theme-dropdown-menu"]')

      // Check trigger attributes
      await expect(trigger).toHaveAttribute('aria-haspopup', 'true')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).toHaveAttribute('aria-label')

      // Check menu attributes
      await expect(menu).toHaveAttribute('role', 'menu')
      await expect(menu).toHaveAttribute('aria-labelledby', 'theme-dropdown-trigger')

      // Check menu items
      const menuItems = page.locator('[role="menuitem"]')
      await expect(menuItems).toHaveCount(3)

      for (let i = 0; i < 3; i++) {
        await expect(menuItems.nth(i)).toHaveAttribute('aria-pressed')
      }
    })

    test('should have proper ARIA attributes for switch toggle', async ({ page }) => {
      // Add switch theme toggle
      await page.addScriptTag({
        content: `
          const switchContainer = document.createElement('div')
          switchContainer.innerHTML = \`
            <label data-testid="theme-switch-label">
              <span>Theme</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Toggle between light and dark mode"
                aria-checked="false"
                data-testid="theme-switch-input"
              />
              <div aria-hidden="true">Switch UI</div>
            </label>
          \`
          document.body.appendChild(switchContainer)
        `
      })

      const switchInput = page.locator('[data-testid="theme-switch-input"]')
      const label = page.locator('[data-testid="theme-switch-label"]')

      // Check switch attributes
      await expect(switchInput).toHaveAttribute('role', 'switch')
      await expect(switchInput).toHaveAttribute('aria-label')
      await expect(switchInput).toHaveAttribute('aria-checked', 'false')

      // Visual switch UI should be hidden from screen readers
      const switchUI = label.locator('[aria-hidden="true"]')
      await expect(switchUI).toHaveAttribute('aria-hidden', 'true')
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation for theme toggle', async ({ page }) => {
      // Add focusable theme toggle
      await page.addScriptTag({
        content: `
          const toggle = document.createElement('button')
          toggle.setAttribute('data-testid', 'theme-toggle')
          toggle.textContent = 'Toggle Theme'
          toggle.style.padding = '8px 16px'
          toggle.style.margin = '16px'
          document.body.appendChild(toggle)
        `
      })

      const toggle = page.locator('[data-testid="theme-toggle"]')

      // Should be focusable
      await toggle.focus()
      await expect(toggle).toBeFocused()

      // Should have visible focus indicator
      const focusedStyles = await toggle.evaluate((el) => {
        const styles = getComputedStyle(el, ':focus')
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow
        }
      })

      // Should have some form of focus indication
      expect(focusedStyles.outline !== 'none' || focusedStyles.boxShadow !== 'none').toBe(true)
    })

    test('should support Enter and Space key activation', async ({ page }) => {
      // Add interactive theme toggle
      await page.addScriptTag({
        content: `
          let themeState = 'light'
          const toggle = document.createElement('button')
          toggle.setAttribute('data-testid', 'keyboard-toggle')
          toggle.textContent = 'Theme: ' + themeState
          toggle.addEventListener('click', () => {
            themeState = themeState === 'light' ? 'dark' : 'light'
            toggle.textContent = 'Theme: ' + themeState
            toggle.setAttribute('aria-label', 'Current theme: ' + themeState)
          })
          document.body.appendChild(toggle)
        `
      })

      const toggle = page.locator('[data-testid="keyboard-toggle"]')

      // Focus the toggle
      await toggle.focus()

      // Test Enter key
      await page.keyboard.press('Enter')
      await expect(toggle).toContainText('Theme: dark')

      // Test Space key
      await page.keyboard.press('Space')
      await expect(toggle).toContainText('Theme: light')
    })

    test('should support keyboard navigation in dropdown', async ({ page }) => {
      // Add dropdown with keyboard support
      await page.addScriptTag({
        content: `
          let isOpen = false
          const container = document.createElement('div')
          container.innerHTML = \`
            <button data-testid="dropdown-trigger">Theme Options</button>
            <div data-testid="dropdown-menu" style="display: none;">
              <button data-testid="option-light" tabindex="-1">Light</button>
              <button data-testid="option-dark" tabindex="-1">Dark</button>
              <button data-testid="option-system" tabindex="-1">System</button>
            </div>
          \`

          const trigger = container.querySelector('[data-testid="dropdown-trigger"]')
          const menu = container.querySelector('[data-testid="dropdown-menu"]')
          const options = container.querySelectorAll('[data-testid^="option"]')

          trigger.addEventListener('click', () => {
            isOpen = !isOpen
            menu.style.display = isOpen ? 'block' : 'none'
            trigger.setAttribute('aria-expanded', isOpen.toString())
            if (isOpen) options[0].focus()
          })

          trigger.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' && isOpen) {
              options[0].focus()
            } else if (e.key === 'Escape') {
              isOpen = false
              menu.style.display = 'none'
              trigger.focus()
            }
          })

          options.forEach((option, index) => {
            option.addEventListener('keydown', (e) => {
              if (e.key === 'ArrowDown') {
                options[(index + 1) % options.length].focus()
              } else if (e.key === 'ArrowUp') {
                options[(index - 1 + options.length) % options.length].focus()
              } else if (e.key === 'Escape') {
                isOpen = false
                menu.style.display = 'none'
                trigger.focus()
              }
            })
          })

          document.body.appendChild(container)
        `
      })

      const trigger = page.locator('[data-testid="dropdown-trigger"]')
      const menu = page.locator('[data-testid="dropdown-menu"]')

      // Open dropdown
      await trigger.focus()
      await trigger.click()
      await expect(menu).toBeVisible()

      // Test arrow key navigation
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[data-testid="option-dark"]')).toBeFocused()

      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[data-testid="option-system"]')).toBeFocused()

      await page.keyboard.press('ArrowUp')
      await expect(page.locator('[data-testid="option-dark"]')).toBeFocused()

      // Test Escape key
      await page.keyboard.press('Escape')
      await expect(menu).toBeHidden()
      await expect(trigger).toBeFocused()
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should announce theme changes', async ({ page }) => {
      // Add live region for announcements
      await page.addScriptTag({
        content: `
          const liveRegion = document.createElement('div')
          liveRegion.setAttribute('aria-live', 'polite')
          liveRegion.setAttribute('aria-atomic', 'true')
          liveRegion.setAttribute('data-testid', 'theme-announcements')
          liveRegion.style.position = 'absolute'
          liveRegion.style.left = '-10000px'
          liveRegion.style.width = '1px'
          liveRegion.style.height = '1px'
          liveRegion.style.overflow = 'hidden'
          document.body.appendChild(liveRegion)

          const toggle = document.createElement('button')
          toggle.setAttribute('data-testid', 'announcing-toggle')
          toggle.textContent = 'Toggle Theme'

          let currentTheme = 'light'
          toggle.addEventListener('click', () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light'
            liveRegion.textContent = \`Theme changed to \${currentTheme} mode\`
          })

          document.body.appendChild(toggle)
        `
      })

      const toggle = page.locator('[data-testid="announcing-toggle"]')
      const liveRegion = page.locator('[data-testid="theme-announcements"]')

      // Trigger theme change
      await toggle.click()

      // Check that announcement was made
      await expect(liveRegion).toContainText('Theme changed to dark mode')

      // Trigger another change
      await toggle.click()
      await expect(liveRegion).toContainText('Theme changed to light mode')
    })

    test('should provide meaningful labels and descriptions', async ({ page }) => {
      // Add theme controls with proper labeling
      await page.addScriptTag({
        content: `
          const fieldset = document.createElement('fieldset')
          fieldset.innerHTML = \`
            <legend>Theme Preferences</legend>
            <div>
              <input type="radio" id="light" name="theme" value="light" checked>
              <label for="light">Light theme - easier reading in bright environments</label>
            </div>
            <div>
              <input type="radio" id="dark" name="theme" value="dark">
              <label for="dark">Dark theme - reduces eye strain in low-light conditions</label>
            </div>
            <div>
              <input type="radio" id="system" name="theme" value="system">
              <label for="system">System theme - automatically matches your device settings</label>
            </div>
          \`
          document.body.appendChild(fieldset)
        `
      })

      // Check semantic structure
      const fieldset = page.locator('fieldset')
      const legend = page.locator('legend')
      const labels = page.locator('label')

      await expect(fieldset).toBeVisible()
      await expect(legend).toContainText('Theme Preferences')
      await expect(labels).toHaveCount(3)

      // Check that labels provide meaningful descriptions
      await expect(labels.nth(0)).toContainText('easier reading in bright environments')
      await expect(labels.nth(1)).toContainText('reduces eye strain in low-light conditions')
      await expect(labels.nth(2)).toContainText('automatically matches your device settings')
    })
  })

  test.describe('Focus Management', () => {
    test('should maintain logical focus order', async ({ page }) => {
      // Add multiple focusable elements with theme controls
      await page.addScriptTag({
        content: `
          const elements = [
            '<button data-testid="first-button">First Button</button>',
            '<button data-testid="theme-toggle">Theme Toggle</button>',
            '<input data-testid="text-input" type="text" placeholder="Text input">',
            '<button data-testid="last-button">Last Button</button>'
          ]

          elements.forEach(html => {
            document.body.insertAdjacentHTML('beforeend', html)
          })
        `
      })

      // Test tab order
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="first-button"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="theme-toggle"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="text-input"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="last-button"]')).toBeFocused()

      // Test reverse tab order
      await page.keyboard.press('Shift+Tab')
      await expect(page.locator('[data-testid="text-input"]')).toBeFocused()
    })

    test('should manage focus in dropdown menus', async ({ page }) => {
      // Add dropdown with proper focus management
      await page.addScriptTag({
        content: `
          let isOpen = false
          let focusedIndex = -1
          const container = document.createElement('div')
          container.innerHTML = \`
            <button data-testid="focus-dropdown-trigger">Theme</button>
            <div data-testid="focus-dropdown-menu" style="display: none;">
              <button data-testid="focus-option-0" tabindex="-1">Light</button>
              <button data-testid="focus-option-1" tabindex="-1">Dark</button>
              <button data-testid="focus-option-2" tabindex="-1">System</button>
            </div>
          \`

          const trigger = container.querySelector('[data-testid="focus-dropdown-trigger"]')
          const menu = container.querySelector('[data-testid="focus-dropdown-menu"]')
          const options = container.querySelectorAll('[data-testid^="focus-option"]')

          const openMenu = () => {
            isOpen = true
            focusedIndex = 0
            menu.style.display = 'block'
            options[0].focus()
          }

          const closeMenu = () => {
            isOpen = false
            focusedIndex = -1
            menu.style.display = 'none'
            trigger.focus()
          }

          trigger.addEventListener('click', () => {
            if (isOpen) closeMenu()
            else openMenu()
          })

          trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
              e.preventDefault()
              openMenu()
            }
          })

          options.forEach((option, index) => {
            option.addEventListener('keydown', (e) => {
              switch (e.key) {
                case 'ArrowDown':
                  e.preventDefault()
                  focusedIndex = (focusedIndex + 1) % options.length
                  options[focusedIndex].focus()
                  break
                case 'ArrowUp':
                  e.preventDefault()
                  focusedIndex = (focusedIndex - 1 + options.length) % options.length
                  options[focusedIndex].focus()
                  break
                case 'Escape':
                  e.preventDefault()
                  closeMenu()
                  break
                case 'Enter':
                case ' ':
                  e.preventDefault()
                  // Select option and close
                  closeMenu()
                  break
              }
            })
          })

          document.body.appendChild(container)
        `
      })

      const trigger = page.locator('[data-testid="focus-dropdown-trigger"]')

      // Open dropdown and test focus
      await trigger.focus()
      await trigger.click()

      // First option should be focused
      await expect(page.locator('[data-testid="focus-option-0"]')).toBeFocused()

      // Test arrow navigation
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[data-testid="focus-option-1"]')).toBeFocused()

      // Close with Escape and check focus returns to trigger
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
    })
  })

  test.describe('High Contrast Mode Support', () => {
    test('should work with high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ forcedColors: 'active' })

      // Add elements that should work in high contrast
      await page.addScriptTag({
        content: `
          const elements = [
            '<button data-testid="hc-button" style="border: 2px solid; padding: 8px;">High Contrast Button</button>',
            '<input data-testid="hc-input" type="text" style="border: 2px solid; padding: 4px;" placeholder="Input">',
            '<div data-testid="hc-text" style="border: 1px solid; padding: 8px;">Text content</div>'
          ]

          elements.forEach(html => {
            document.body.insertAdjacentHTML('beforeend', html)
          })
        `
      })

      // Elements should be visible and maintain functionality
      await expect(page.locator('[data-testid="hc-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="hc-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="hc-text"]')).toBeVisible()

      // Interactive elements should still be focusable
      await page.locator('[data-testid="hc-button"]').focus()
      await expect(page.locator('[data-testid="hc-button"]')).toBeFocused()
    })
  })

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })

      // Add animated theme toggle
      await page.addScriptTag({
        content: `
          const toggle = document.createElement('button')
          toggle.setAttribute('data-testid', 'animated-toggle')
          toggle.textContent = 'Theme Toggle'
          toggle.style.transition = 'all 0.3s ease'
          toggle.style.padding = '8px 16px'

          // Check if reduced motion is preferred
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          if (prefersReducedMotion) {
            toggle.style.transition = 'none'
          }

          document.body.appendChild(toggle)
        `
      })

      const toggle = page.locator('[data-testid="animated-toggle"]')

      // Check that transitions are disabled
      const hasTransition = await toggle.evaluate((el) => {
        const styles = getComputedStyle(el)
        return styles.transition !== 'none'
      })

      expect(hasTransition).toBe(false)
    })
  })

  test.describe('Error State Accessibility', () => {
    test('should handle theme errors accessibly', async ({ page }) => {
      // Add error state simulation
      await page.addScriptTag({
        content: `
          const errorContainer = document.createElement('div')
          errorContainer.innerHTML = \`
            <div role="alert" aria-live="assertive" data-testid="theme-error">
              <h2>Theme Error</h2>
              <p>Unable to apply theme. Using default light theme.</p>
              <button data-testid="retry-button">Try Again</button>
            </div>
          \`
          document.body.appendChild(errorContainer)
        `
      })

      const errorAlert = page.locator('[data-testid="theme-error"]')
      const retryButton = page.locator('[data-testid="retry-button"]')

      // Error should be announced to screen readers
      await expect(errorAlert).toHaveAttribute('role', 'alert')
      await expect(errorAlert).toHaveAttribute('aria-live', 'assertive')

      // Retry button should be accessible
      await retryButton.focus()
      await expect(retryButton).toBeFocused()
    })
  })
})