/**
 * Assignment Workflow Performance Tests
 * Tests for performance, load handling, and optimization validation
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Assignment Workflow Performance Tests', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Page Load Performance', () => {
    test('Should load assignment pages within acceptable time', async () => {
      await utils.loginAsAdmin();

      const pages = [
        { path: '/workflow/bulk-assignment', name: 'Bulk Assignment' },
        { path: '/assignments', name: 'Assignments List' },
        { path: '/inspections/create', name: 'Inspection Creation' }
      ];

      for (const testPage of pages) {
        const startTime = Date.now();

        await page.goto(`http://localhost:5173${testPage.path}`);
        await page.waitForLoadState('networkidle');

        const loadTime = Date.now() - startTime;

        // Pages should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
        console.log(`${testPage.name} loaded in ${loadTime}ms`);

        // Check for performance metrics
        const performanceMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
          };
        });

        // DOM should be interactive quickly
        expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
        console.log(`${testPage.name} performance:`, performanceMetrics);
      }
    });

    test('Should handle large datasets efficiently', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Measure rendering time with many sites
      const startTime = Date.now();

      // Check how many sites are rendered
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();

      const renderTime = Date.now() - startTime;

      if (siteCount > 50) {
        // Should handle large lists efficiently
        expect(renderTime).toBeLessThan(1000);
        console.log(`Rendered ${siteCount} sites in ${renderTime}ms`);
      }

      // Test scrolling performance with many items
      if (siteCount > 20) {
        const scrollStartTime = Date.now();

        await page.evaluate(() => {
          const container = document.querySelector('.sites-grid') || document.body;
          container.scrollTop = container.scrollHeight;
        });

        await page.waitForTimeout(100);

        const scrollTime = Date.now() - scrollStartTime;
        expect(scrollTime).toBeLessThan(500);

        console.log(`Scrolling through ${siteCount} sites took ${scrollTime}ms`);
      }
    });

    test('Should optimize network requests', async () => {
      await utils.loginAsAdmin();

      const networkRequests = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          networkRequests.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });

      const loadStartTime = Date.now();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');
      const loadEndTime = Date.now();

      // Should minimize number of API calls
      expect(networkRequests.length).toBeLessThan(10);

      // API calls should complete reasonably quickly
      const apiLoadTime = loadEndTime - loadStartTime;
      expect(apiLoadTime).toBeLessThan(5000);

      console.log(`Made ${networkRequests.length} API requests in ${apiLoadTime}ms`);

      // Check for duplicate requests (should be cached)
      const uniqueUrls = new Set(networkRequests.map(req => req.url));
      const duplicateRequests = networkRequests.length - uniqueUrls.size;

      // Should minimize duplicate requests
      expect(duplicateRequests).toBeLessThan(3);
    });
  });

  test.describe('Form Performance', () => {
    test('Should handle form interactions responsively', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test text input responsiveness
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.count() > 0) {
        const inputStartTime = Date.now();
        await nameInput.fill('Performance Test Assignment');
        const inputTime = Date.now() - inputStartTime;

        expect(inputTime).toBeLessThan(100);
        console.log(`Text input response time: ${inputTime}ms`);
      }

      // Test dropdown responsiveness
      const templateSelect = page.locator('select[name="template_id"]');
      if (await templateSelect.count() > 0) {
        const selectStartTime = Date.now();
        await templateSelect.selectOption({ index: 1 });
        const selectTime = Date.now() - selectStartTime;

        expect(selectTime).toBeLessThan(200);
        console.log(`Dropdown selection time: ${selectTime}ms`);
      }

      // Test site selection responsiveness
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();

      if (siteCount > 0) {
        const clickStartTime = Date.now();
        await siteCards.nth(0).click();

        // Wait for visual feedback
        await page.waitForFunction(
          () => document.querySelector('.site-card.selected') !== null,
          { timeout: 1000 }
        );

        const clickTime = Date.now() - clickStartTime;
        expect(clickTime).toBeLessThan(300);
        console.log(`Site selection response time: ${clickTime}ms`);
      }
    });

    test('Should validate forms efficiently', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test validation performance
      const validationStartTime = Date.now();

      // Submit form without required fields to trigger validation
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Wait for validation messages
        await page.waitForTimeout(500);

        const validationTime = Date.now() - validationStartTime;
        expect(validationTime).toBeLessThan(1000);

        console.log(`Form validation time: ${validationTime}ms`);
      }

      // Test real-time validation
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.count() > 0) {
        const realtimeStartTime = Date.now();

        await nameInput.fill('');
        await nameInput.blur();

        // Check for immediate validation feedback
        await page.waitForTimeout(200);

        const realtimeValidationTime = Date.now() - realtimeStartTime;
        expect(realtimeValidationTime).toBeLessThan(500);

        console.log(`Real-time validation time: ${realtimeValidationTime}ms`);
      }
    });
  });

  test.describe('Search and Filter Performance', () => {
    test('Should search efficiently', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="search"], input[name="search"]');
      if (await searchInput.count() > 0) {
        const searchTerms = ['test', 'assignment', 'inspection', 'site'];

        for (const term of searchTerms) {
          const searchStartTime = Date.now();

          await searchInput.fill(term);

          // Wait for search results to update
          await page.waitForTimeout(300);

          const searchTime = Date.now() - searchStartTime;
          expect(searchTime).toBeLessThan(1000);

          console.log(`Search for "${term}" took ${searchTime}ms`);
        }

        // Test search with no results
        const noResultsStartTime = Date.now();
        await searchInput.fill('nonexistentsearchterm12345');
        await page.waitForTimeout(300);
        const noResultsTime = Date.now() - noResultsStartTime;

        expect(noResultsTime).toBeLessThan(800);
        console.log(`No results search took ${noResultsTime}ms`);
      }
    });

    test('Should filter data efficiently', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      // Test status filter
      const statusFilter = page.locator('select[name="status"]');
      if (await statusFilter.count() > 0) {
        const filterStartTime = Date.now();

        await statusFilter.selectOption('pending');
        await page.waitForTimeout(300);

        const filterTime = Date.now() - filterStartTime;
        expect(filterTime).toBeLessThan(800);

        console.log(`Status filter took ${filterTime}ms`);
      }

      // Test priority filter
      const priorityFilter = page.locator('select[name="priority"]');
      if (await priorityFilter.count() > 0) {
        const filterStartTime = Date.now();

        await priorityFilter.selectOption('high');
        await page.waitForTimeout(300);

        const filterTime = Date.now() - filterStartTime;
        expect(filterTime).toBeLessThan(800);

        console.log(`Priority filter took ${filterTime}ms`);
      }
    });
  });

  test.describe('API Performance', () => {
    test('Should handle API requests efficiently', async () => {
      await utils.loginAsAdmin();

      let apiRequestTimes = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          const request = response.request();
          const timing = response.timing();
          apiRequestTimes.push({
            url: response.url(),
            method: request.method(),
            status: response.status(),
            responseTime: timing.responseEnd
          });
        }
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Analyze API performance
      if (apiRequestTimes.length > 0) {
        const averageResponseTime = apiRequestTimes.reduce((sum, req) => sum + req.responseTime, 0) / apiRequestTimes.length;
        const maxResponseTime = Math.max(...apiRequestTimes.map(req => req.responseTime));

        expect(averageResponseTime).toBeLessThan(2000); // 2 second average
        expect(maxResponseTime).toBeLessThan(5000);     // 5 second max

        console.log(`API Performance - Average: ${averageResponseTime}ms, Max: ${maxResponseTime}ms`);

        // Check for slow endpoints
        const slowRequests = apiRequestTimes.filter(req => req.responseTime > 3000);
        if (slowRequests.length > 0) {
          console.warn('Slow API requests:', slowRequests);
        }

        expect(slowRequests.length).toBeLessThan(apiRequestTimes.length * 0.2); // Less than 20% slow
      }
    });

    test('Should handle bulk operations efficiently', async () => {
      await utils.loginAsAdmin();

      let bulkRequestTime = 0;
      page.on('response', response => {
        if (response.url().includes('/assignments/bulk')) {
          bulkRequestTime = response.timing().responseEnd;
        }
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Fill form for bulk assignment
      await page.fill('input[name="name"]', 'Performance Bulk Test');

      const templateSelect = page.locator('select[name="template_id"]');
      if (await templateSelect.count() > 0) {
        await templateSelect.selectOption({ index: 1 });
      }

      // Select multiple sites
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();
      const sitesToSelect = Math.min(10, siteCount);

      for (let i = 0; i < sitesToSelect; i++) {
        await siteCards.nth(i).click();
      }

      // Submit bulk assignment
      const submitStartTime = Date.now();
      const submitButton = page.locator('button[type="submit"]');

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        const totalSubmitTime = Date.now() - submitStartTime;

        // Bulk operations should complete in reasonable time
        expect(totalSubmitTime).toBeLessThan(10000); // 10 seconds max

        if (bulkRequestTime > 0) {
          expect(bulkRequestTime).toBeLessThan(8000); // 8 seconds API response
          console.log(`Bulk assignment API took ${bulkRequestTime}ms`);
        }

        console.log(`Total bulk assignment time: ${totalSubmitTime}ms for ${sitesToSelect} sites`);
      }
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('Should manage memory efficiently', async () => {
      await utils.loginAsAdmin();

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });

      // Perform memory-intensive operations
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Navigate through multiple pages
      const pages = ['/assignments', '/inspections', '/templates', '/sites'];
      for (const pagePath of pages) {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      // Return to assignment page
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;

        // Memory increase should be reasonable
        expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase

        console.log(`Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`);

        // Should not approach memory limit
        const memoryUsagePercent = (finalMemory.usedJSHeapSize / finalMemory.jsHeapSizeLimit) * 100;
        expect(memoryUsagePercent).toBeLessThan(80); // Less than 80% of limit
      }
    });

    test('Should handle DOM efficiently', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Count initial DOM nodes
      const initialNodeCount = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      // Perform DOM-heavy operations
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();

      // Select and deselect multiple sites
      for (let i = 0; i < Math.min(20, siteCount); i++) {
        await siteCards.nth(i).click();
      }

      for (let i = 0; i < Math.min(20, siteCount); i++) {
        await siteCards.nth(i).click(); // Deselect
      }

      // Check final DOM node count
      const finalNodeCount = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      // DOM should not grow excessively
      const nodeIncrease = finalNodeCount - initialNodeCount;
      expect(nodeIncrease).toBeLessThan(1000);

      console.log(`DOM nodes increased by ${nodeIncrease} (from ${initialNodeCount} to ${finalNodeCount})`);

      // Check for memory leaks in event listeners
      const eventListenerCount = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let totalListeners = 0;

        for (const element of elements) {
          const listeners = getEventListeners ? getEventListeners(element) : {};
          totalListeners += Object.keys(listeners).length;
        }

        return totalListeners;
      });

      // Should have reasonable number of event listeners
      expect(eventListenerCount).toBeLessThan(finalNodeCount * 2);
    });
  });

  test.describe('Mobile Performance', () => {
    test('Should perform well on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await utils.loginAsAdmin();

      const mobileLoadStartTime = Date.now();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');
      const mobileLoadTime = Date.now() - mobileLoadStartTime;

      // Mobile should load within reasonable time
      expect(mobileLoadTime).toBeLessThan(5000);
      console.log(`Mobile load time: ${mobileLoadTime}ms`);

      // Test touch interactions
      const siteCards = page.locator('.site-card');
      if (await siteCards.count() > 0) {
        const touchStartTime = Date.now();
        await siteCards.nth(0).tap();

        // Wait for visual feedback
        await page.waitForTimeout(200);

        const touchTime = Date.now() - touchStartTime;
        expect(touchTime).toBeLessThan(500);

        console.log(`Mobile touch response: ${touchTime}ms`);
      }

      // Test scrolling performance on mobile
      const scrollStartTime = Date.now();

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(300);

      const scrollTime = Date.now() - scrollStartTime;
      expect(scrollTime).toBeLessThan(1000);

      console.log(`Mobile scroll time: ${scrollTime}ms`);
    });

    test('Should optimize for touch interfaces', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test button tap targets
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(3, buttonCount); i++) {
          const button = buttons.nth(i);
          const box = await button.boundingBox();

          if (box) {
            // Buttons should be large enough for touch
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }
      }

      // Test form field tap targets
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i);
          const box = await input.boundingBox();

          if (box) {
            // Form fields should be touch-friendly
            expect(box.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });
  });

  test.describe('Bundle Size and Asset Optimization', () => {
    test('Should load optimized assets', async () => {
      await utils.loginAsAdmin();

      const resourceSizes = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css') || url.includes('.woff') || url.includes('/api/')) {
          response.body().then(body => {
            resourceSizes.push({
              url: url,
              size: body.length,
              type: response.headers()['content-type'] || 'unknown'
            });
          }).catch(() => {
            // Some responses may not have accessible body
          });
        }
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(2000); // Allow resources to load

      // Analyze resource sizes
      if (resourceSizes.length > 0) {
        const jsFiles = resourceSizes.filter(r => r.url.includes('.js'));
        const cssFiles = resourceSizes.filter(r => r.url.includes('.css'));
        const apiCalls = resourceSizes.filter(r => r.url.includes('/api/'));

        const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
        const totalCssSize = cssFiles.reduce((sum, file) => sum + file.size, 0);

        // JavaScript bundles should be reasonably sized
        expect(totalJsSize).toBeLessThan(2 * 1024 * 1024); // 2MB max
        console.log(`Total JS size: ${(totalJsSize / 1024 / 1024).toFixed(2)}MB`);

        // CSS should be optimized
        expect(totalCssSize).toBeLessThan(500 * 1024); // 500KB max
        console.log(`Total CSS size: ${(totalCssSize / 1024).toFixed(2)}KB`);

        // Check for large individual files
        const largeFiles = resourceSizes.filter(r => r.size > 500 * 1024);
        if (largeFiles.length > 0) {
          console.warn('Large files detected:', largeFiles.map(f => ({ url: f.url, size: (f.size / 1024).toFixed(2) + 'KB' })));
        }

        // API responses should be reasonably sized
        const largeApiResponses = apiCalls.filter(r => r.size > 100 * 1024);
        expect(largeApiResponses.length).toBeLessThan(apiCalls.length * 0.2); // Less than 20% large
      }
    });

    test('Should implement efficient caching', async () => {
      await utils.loginAsAdmin();

      const cachedResponses = [];
      page.on('response', response => {
        const cacheControl = response.headers()['cache-control'];
        const etag = response.headers()['etag'];
        const lastModified = response.headers()['last-modified'];

        if (response.url().includes('.js') || response.url().includes('.css')) {
          cachedResponses.push({
            url: response.url(),
            cacheControl: cacheControl,
            etag: etag,
            lastModified: lastModified,
            cached: cacheControl && (cacheControl.includes('max-age') || cacheControl.includes('public'))
          });
        }
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check caching headers
      if (cachedResponses.length > 0) {
        const cachedFiles = cachedResponses.filter(r => r.cached);
        const cachingRatio = cachedFiles.length / cachedResponses.length;

        // Most static assets should be cacheable
        expect(cachingRatio).toBeGreaterThan(0.5); // At least 50% cached
        console.log(`Caching ratio: ${(cachingRatio * 100).toFixed(2)}%`);
      }
    });
  });
});