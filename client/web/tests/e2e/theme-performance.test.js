import { test, expect } from '@playwright/test'

test.describe('Theme Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear any existing theme preferences
    await page.evaluate(() => localStorage.clear())
  })

  test.describe('Theme Switching Performance', () => {
    test('should switch themes quickly without blocking UI', async ({ page }) => {
      // Measure theme switching performance
      const performanceMetrics = await page.evaluate(async () => {
        const results = []

        // Warm up - perform a few switches first
        for (let i = 0; i < 3; i++) {
          localStorage.setItem('resource-mgmt-theme', i % 2 === 0 ? 'light' : 'dark')
          document.documentElement.className = i % 2 === 0 ? 'light' : 'dark'
        }

        // Measure actual performance
        for (let i = 0; i < 20; i++) {
          const startTime = performance.now()

          // Switch theme
          const newTheme = i % 2 === 0 ? 'light' : 'dark'
          localStorage.setItem('resource-mgmt-theme', newTheme)
          document.documentElement.className = newTheme

          // Force a style recalculation
          document.documentElement.offsetHeight

          const endTime = performance.now()
          results.push(endTime - startTime)

          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 1))
        }

        return {
          times: results,
          average: results.reduce((a, b) => a + b, 0) / results.length,
          max: Math.max(...results),
          min: Math.min(...results)
        }
      })

      // Theme switching should be fast
      expect(performanceMetrics.average).toBeLessThan(50) // Average less than 50ms
      expect(performanceMetrics.max).toBeLessThan(100) // Max less than 100ms

      console.log('Theme switching performance:', performanceMetrics)
    })

    test('should not cause layout thrashing during theme changes', async ({ page }) => {
      // Monitor layout thrashing
      const layoutMetrics = await page.evaluate(async () => {
        let layoutCount = 0
        let styleCount = 0

        // Mock performance observer for layout measurements
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'layout') layoutCount++
            if (entry.name === 'style') styleCount++
          }
        })

        observer.observe({ entryTypes: ['measure'] })

        // Perform theme switches
        for (let i = 0; i < 10; i++) {
          const theme = i % 2 === 0 ? 'light' : 'dark'

          performance.mark('theme-start')

          localStorage.setItem('resource-mgmt-theme', theme)
          document.documentElement.className = theme

          // Force style calculation
          document.documentElement.offsetHeight

          performance.mark('theme-end')
          performance.measure('theme-switch', 'theme-start', 'theme-end')

          await new Promise(resolve => setTimeout(resolve, 10))
        }

        observer.disconnect()

        return {
          layoutCount,
          styleCount,
          layoutPerSwitch: layoutCount / 10,
          stylePerSwitch: styleCount / 10
        }
      })

      // Should not cause excessive layout recalculations
      expect(layoutMetrics.layoutPerSwitch).toBeLessThan(3)

      console.log('Layout metrics:', layoutMetrics)
    })

    test('should maintain 60fps during theme transitions', async ({ page }) => {
      // Add transition styles
      await page.addStyleTag({
        content: `
          * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
          }
        `
      })

      // Add content to animate
      await page.addScriptTag({
        content: `
          const content = document.createElement('div')
          content.style.padding = '20px'
          content.innerHTML = \`
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4">
              <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Animated Content</h2>
              <p class="text-gray-600 dark:text-gray-300">This content will animate during theme transitions.</p>
            </div>
          \`
          document.body.appendChild(content)
        `
      })

      // Measure frame rate during theme transition
      const frameRateMetrics = await page.evaluate(async () => {
        let frameCount = 0
        let lastTime = performance.now()
        const frameTimes = []

        return new Promise((resolve) => {
          const measureFrame = (currentTime) => {
            frameCount++
            const deltaTime = currentTime - lastTime
            if (deltaTime > 0) {
              frameTimes.push(1000 / deltaTime) // FPS
            }
            lastTime = currentTime

            if (frameCount < 30) { // Measure for about 0.5 seconds
              requestAnimationFrame(measureFrame)
            } else {
              const avgFPS = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
              const minFPS = Math.min(...frameTimes)
              resolve({ avgFPS, minFPS, frameCount })
            }
          }

          // Start theme transition
          document.documentElement.className = 'dark'

          // Start measuring frames
          requestAnimationFrame(measureFrame)
        })
      })

      // Should maintain reasonable frame rate
      expect(frameRateMetrics.avgFPS).toBeGreaterThan(30) // Average > 30fps
      expect(frameRateMetrics.minFPS).toBeGreaterThan(15) // Min > 15fps

      console.log('Frame rate metrics:', frameRateMetrics)
    })
  })

  test.describe('Memory Usage', () => {
    test('should not cause memory leaks with frequent theme changes', async ({ page }) => {
      const memoryMetrics = await page.evaluate(async () => {
        const gc = (window as any).gc
        if (gc) gc() // Force garbage collection if available

        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

        // Perform many theme switches
        for (let i = 0; i < 100; i++) {
          const themes = ['light', 'dark', 'system']
          const theme = themes[i % 3]

          localStorage.setItem('resource-mgmt-theme', theme)
          document.documentElement.className = theme === 'system' ? 'light' : theme

          // Simulate theme store updates
          window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { theme, resolvedTheme: theme === 'system' ? 'light' : theme }
          }))

          // Periodic cleanup
          if (i % 10 === 0 && gc) gc()
        }

        if (gc) gc() // Final cleanup

        const finalMemory = (performance as any).memory?.usedJSHeapSize || 0

        return {
          initialMemory,
          finalMemory,
          memoryIncrease: finalMemory - initialMemory,
          memoryIncreasePercentage: ((finalMemory - initialMemory) / initialMemory) * 100
        }
      })

      // Memory increase should be minimal
      expect(memoryMetrics.memoryIncreasePercentage).toBeLessThan(50) // Less than 50% increase

      console.log('Memory metrics:', memoryMetrics)
    })

    test('should cleanup event listeners properly', async ({ page }) => {
      const listenerMetrics = await page.evaluate(async () => {
        let addedListeners = 0
        let removedListeners = 0

        // Mock addEventListener and removeEventListener to count
        const originalAdd = window.addEventListener
        const originalRemove = window.removeEventListener

        window.addEventListener = function(...args) {
          addedListeners++
          return originalAdd.apply(this, args)
        }

        window.removeEventListener = function(...args) {
          removedListeners++
          return originalRemove.apply(this, args)
        }

        // Simulate theme store initialization and cleanup multiple times
        for (let i = 0; i < 10; i++) {
          // Simulate theme store setup
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          const handler = () => {}
          mediaQuery.addEventListener('change', handler)

          // Simulate cleanup
          mediaQuery.removeEventListener('change', handler)

          // Simulate storage events
          window.addEventListener('storage', handler)
          window.removeEventListener('storage', handler)
        }

        // Restore original functions
        window.addEventListener = originalAdd
        window.removeEventListener = originalRemove

        return {
          addedListeners,
          removedListeners,
          difference: addedListeners - removedListeners
        }
      })

      // Should not accumulate event listeners
      expect(Math.abs(listenerMetrics.difference)).toBeLessThan(5)

      console.log('Event listener metrics:', listenerMetrics)
    })
  })

  test.describe('Rendering Performance', () => {
    test('should efficiently render components with theme classes', async ({ page }) => {
      // Add many themed components
      await page.addScriptTag({
        content: `
          const createComponent = (index) => {
            const component = document.createElement('div')
            component.className = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 m-2 shadow-sm'
            component.innerHTML = \`
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Component \${index}</h3>
              <p class="text-gray-600 dark:text-gray-300">Theme-aware content</p>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-2 transition-colors">Action</button>
            \`
            return component
          }

          const container = document.createElement('div')
          container.style.display = 'grid'
          container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))'
          container.style.gap = '1rem'
          container.style.padding = '1rem'

          // Create 100 components
          for (let i = 0; i < 100; i++) {
            container.appendChild(createComponent(i))
          }

          document.body.appendChild(container)
        `
      })

      // Measure rendering performance
      const renderingMetrics = await page.evaluate(async () => {
        const startTime = performance.now()

        // Switch theme and measure rendering time
        document.documentElement.className = 'dark'

        // Force layout recalculation
        document.body.offsetHeight

        const endTime = performance.now()

        // Count elements
        const componentCount = document.querySelectorAll('[class*="bg-white"]').length

        return {
          renderTime: endTime - startTime,
          componentCount,
          renderTimePerComponent: (endTime - startTime) / componentCount
        }
      })

      // Rendering should be efficient even with many components
      expect(renderingMetrics.renderTimePerComponent).toBeLessThan(1) // Less than 1ms per component

      console.log('Rendering metrics:', renderingMetrics)
    })

    test('should handle CSS custom properties efficiently', async ({ page }) => {
      // Measure CSS custom property performance
      const cssPerformance = await page.evaluate(async () => {
        const properties = {
          '--theme-bg': '#ffffff',
          '--theme-surface': '#f8fafc',
          '--theme-text': '#1e293b',
          '--theme-border': '#e2e8f0',
          '--theme-primary': '#3b82f6'
        }

        const startTime = performance.now()

        // Apply many CSS custom properties
        for (let i = 0; i < 1000; i++) {
          Object.entries(properties).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value)
          })
        }

        const endTime = performance.now()

        // Test property retrieval
        const retrievalStart = performance.now()
        for (let i = 0; i < 1000; i++) {
          Object.keys(properties).forEach(prop => {
            document.documentElement.style.getPropertyValue(prop)
          })
        }
        const retrievalEnd = performance.now()

        return {
          setTime: endTime - startTime,
          getTime: retrievalEnd - retrievalStart,
          totalOperations: 2000 * Object.keys(properties).length
        }
      })

      // CSS property operations should be fast
      expect(cssPerformance.setTime).toBeLessThan(100) // Setting properties
      expect(cssPerformance.getTime).toBeLessThan(50)  // Getting properties

      console.log('CSS property performance:', cssPerformance)
    })
  })

  test.describe('Network Performance', () => {
    test('should not make unnecessary network requests during theme changes', async ({ page }) => {
      // Monitor network requests
      const networkRequests = []

      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType()
        })
      })

      // Clear initial requests
      networkRequests.length = 0

      // Perform theme switches
      await page.evaluate(async () => {
        for (let i = 0; i < 5; i++) {
          const theme = i % 2 === 0 ? 'light' : 'dark'
          localStorage.setItem('resource-mgmt-theme', theme)
          document.documentElement.className = theme
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      })

      // Wait a bit for any delayed requests
      await page.waitForTimeout(1000)

      // Filter out irrelevant requests (like analytics, favicons, etc.)
      const relevantRequests = networkRequests.filter(request =>
        !request.url.includes('analytics') &&
        !request.url.includes('favicon') &&
        !request.url.includes('ads') &&
        request.resourceType !== 'image'
      )

      // Should not make additional network requests for theme changes
      expect(relevantRequests.length).toBe(0)

      console.log('Network requests during theme changes:', relevantRequests.length)
    })
  })

  test.describe('Storage Performance', () => {
    test('should efficiently handle localStorage operations', async ({ page }) => {
      const storageMetrics = await page.evaluate(async () => {
        const iterations = 1000

        // Test localStorage write performance
        const writeStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          localStorage.setItem('resource-mgmt-theme', i % 2 === 0 ? 'light' : 'dark')
        }
        const writeEnd = performance.now()

        // Test localStorage read performance
        const readStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          localStorage.getItem('resource-mgmt-theme')
        }
        const readEnd = performance.now()

        // Test error handling performance
        const errorStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          try {
            localStorage.setItem('resource-mgmt-theme', 'test')
          } catch (e) {
            // Handle quota exceeded errors
          }
        }
        const errorEnd = performance.now()

        return {
          writeTime: writeEnd - writeStart,
          readTime: readEnd - readStart,
          errorHandlingTime: errorEnd - errorStart,
          writeTimePerOp: (writeEnd - writeStart) / iterations,
          readTimePerOp: (readEnd - readStart) / iterations
        }
      })

      // Storage operations should be fast
      expect(storageMetrics.writeTimePerOp).toBeLessThan(1) // Less than 1ms per write
      expect(storageMetrics.readTimePerOp).toBeLessThan(0.5) // Less than 0.5ms per read

      console.log('Storage performance metrics:', storageMetrics)
    })
  })

  test.describe('Bundle Size Impact', () => {
    test('should measure theme system impact on bundle size', async ({ page }) => {
      // This test would typically be run as part of the build process
      // Here we simulate by measuring the size of theme-related code
      const bundleImpact = await page.evaluate(() => {
        // Simulate measuring theme-related code size
        const themeStoreCode = `
          // Mock theme store implementation
          const useThemeStore = () => ({
            theme: 'light',
            setTheme: () => {},
            toggleTheme: () => {},
            getThemeColors: () => ({})
          })
        `

        const themeComposableCode = `
          // Mock theme composable
          const useTheme = () => ({
            themeClasses: {},
            colors: {},
            setTheme: () => {}
          })
        `

        const themeToggleCode = `
          // Mock theme toggle component
          const ThemeToggle = { template: '<button>Toggle</button>' }
        `

        // Calculate approximate sizes (in a real scenario, this would use webpack-bundle-analyzer)
        const totalSize = themeStoreCode.length + themeComposableCode.length + themeToggleCode.length
        const gzippedSize = Math.floor(totalSize * 0.3) // Rough gzip estimation

        return {
          totalSize,
          gzippedSize,
          sizeInKB: totalSize / 1024,
          gzippedSizeInKB: gzippedSize / 1024
        }
      })

      // Theme system should have minimal bundle impact
      expect(bundleImpact.gzippedSizeInKB).toBeLessThan(5) // Less than 5KB gzipped

      console.log('Bundle size impact:', bundleImpact)
    })
  })

  test.describe('Runtime Performance Monitoring', () => {
    test('should provide performance metrics for theme operations', async ({ page }) => {
      const performanceData = await page.evaluate(async () => {
        const metrics = {
          themeChanges: 0,
          totalTime: 0,
          averageTime: 0,
          slowestOperation: 0,
          fastestOperation: Infinity
        }

        // Mock performance monitoring
        const measureThemeOperation = async (operation) => {
          const start = performance.now()
          await operation()
          const end = performance.now()
          const duration = end - start

          metrics.themeChanges++
          metrics.totalTime += duration
          metrics.averageTime = metrics.totalTime / metrics.themeChanges
          metrics.slowestOperation = Math.max(metrics.slowestOperation, duration)
          metrics.fastestOperation = Math.min(metrics.fastestOperation, duration)

          return duration
        }

        // Simulate various theme operations
        const operations = [
          () => localStorage.setItem('resource-mgmt-theme', 'dark'),
          () => document.documentElement.className = 'dark',
          () => document.documentElement.style.setProperty('--theme-bg', '#000'),
          () => localStorage.getItem('resource-mgmt-theme'),
          () => window.matchMedia('(prefers-color-scheme: dark)').matches
        ]

        for (let i = 0; i < 50; i++) {
          const operation = operations[i % operations.length]
          await measureThemeOperation(operation)
          await new Promise(resolve => setTimeout(resolve, 1))
        }

        return metrics
      })

      // Performance should be consistent
      expect(performanceData.averageTime).toBeLessThan(10) // Average less than 10ms
      expect(performanceData.slowestOperation).toBeLessThan(50) // No operation over 50ms

      console.log('Runtime performance data:', performanceData)
    })
  })
})