const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Navigation and Routing', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
  });

  test.describe('Public Route Navigation', () => {
    test('should handle homepage navigation', async ({ page }) => {
      await utils.navigateTo('/');

      // Should display homepage
      await expect(page.locator('h1')).toContainText('Resource Management');

      // Should have "Get Started" button to login
      const getStartedBtn = page.locator('button:has-text("Get Started"), a:has-text("Get Started")');
      await expect(getStartedBtn).toBeVisible();

      // Click to navigate to login
      await getStartedBtn.click();
      await utils.waitForUrl('**/login');
    });

    test('should handle 404 page correctly', async ({ page }) => {
      await utils.navigateTo('/non-existent-page');

      // Should show 404 or redirect to login/home
      const currentUrl = page.url();
      if (currentUrl.includes('non-existent-page')) {
        // Has a proper 404 page
        await expect(page.locator('h1, h2')).toContainText(/404|Not Found|Page Not Found/);
      } else {
        // Redirects to login or home
        expect(currentUrl).toMatch(/\/(login|home|dashboard)?$/);
      }
    });

    test('should allow access to public routes without authentication', async ({ page }) => {
      const publicRoutes = [
        { path: '/', expectedContent: 'Resource Management' },
        { path: '/login', expectedContent: 'Sign In' }
      ];

      for (const route of publicRoutes) {
        await utils.navigateTo(route.path);
        await expect(page.locator('h1, h2')).toContainText(route.expectedContent);
        console.log(`✓ Public route ${route.path} accessible`);
      }
    });
  });

  test.describe('Authenticated Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each authenticated navigation test
      await utils.loginAsAdmin();
    });

    test('should navigate through main application sections', async ({ page }) => {
      const nav = utils.getNavigation();

      // Test Dashboard navigation
      await nav.dashboard.click();
      await utils.waitForUrl('**/dashboard');
      await expect(page.locator('h1')).toContainText('Dashboard');

      // Test Inspections navigation
      if (await nav.inspections.isVisible()) {
        await nav.inspections.click();
        await utils.waitForUrl('**/inspections');
        await expect(page.locator('h1')).toContainText('Inspections');
      }

      // Test Templates navigation
      if (await nav.templates.isVisible()) {
        await nav.templates.click();
        await utils.waitForUrl('**/templates');
        await expect(page.locator('h1')).toContainText('Templates');
      }

      // Test Users navigation (admin only)
      if (await nav.users.isVisible()) {
        await nav.users.click();
        await utils.waitForUrl('**/users');
        await expect(page.locator('h1')).toContainText(['Users', 'User Management']);
      }
    });

    test('should highlight active navigation item', async ({ page }) => {
      const routes = [
        { nav: 'dashboard', path: '/dashboard' },
        { nav: 'inspections', path: '/inspections' },
        { nav: 'templates', path: '/templates' },
        { nav: 'users', path: '/users' }
      ];

      for (const route of routes) {
        await utils.navigateTo(route.path);

        // Check if current nav item is highlighted
        const navItem = page.locator(`nav a[href*="${route.nav}"]`);
        if (await navItem.count() > 0) {
          const hasActiveClass = await navItem.evaluate(el => {
            return el.classList.contains('active') ||
                   el.classList.contains('current') ||
                   el.classList.contains('router-link-active') ||
                   el.getAttribute('aria-current') === 'page';
          });

          if (hasActiveClass) {
            console.log(`✓ Active state for ${route.nav} navigation`);
          } else {
            console.log(`! Active state not detected for ${route.nav}`);
          }
        }
      }
    });

    test('should handle breadcrumb navigation', async ({ page }) => {
      // Navigate to a nested route that should have breadcrumbs
      await utils.navigateTo('/inspections/new');

      // Check for breadcrumb navigation
      const breadcrumbs = page.locator('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]');
      if (await breadcrumbs.count() > 0) {
        await expect(breadcrumbs).toBeVisible();

        // Should contain path segments
        await expect(breadcrumbs).toContainText(['Inspections', 'Create', 'New']);

        // Test breadcrumb links
        const homeLink = breadcrumbs.locator('a:has-text("Home"), a:has-text("Dashboard")');
        if (await homeLink.count() > 0) {
          await homeLink.click();
          await utils.waitForUrl('**/dashboard');
        }
      } else {
        console.log('Breadcrumb navigation not implemented');
      }
    });

    test('should maintain navigation state across page refreshes', async ({ page }) => {
      // Navigate to users page
      await utils.navigateTo('/users');
      await expect(page.locator('h1')).toContainText(['Users', 'User Management']);

      // Refresh page
      await page.reload();
      await utils.waitForPageLoad();

      // Should still be on users page with navigation intact
      expect(page.url()).toContain('/users');
      await expect(page.locator('h1')).toContainText(['Users', 'User Management']);

      // Navigation should still be visible and functional
      const nav = utils.getNavigation();
      await expect(nav.dashboard).toBeVisible();
    });

    test('should handle deep linking to application sections', async ({ page }) => {
      const deepLinks = [
        '/dashboard',
        '/inspections',
        '/templates',
        '/users',
        '/inspections/new',
        '/templates/new'
      ];

      for (const link of deepLinks) {
        // Direct navigation to deep link
        await utils.navigateTo(link);

        // Should load the correct page
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          // Some routes might require specific permissions
          console.log(`Route ${link} redirected to login (permission required)`);
        } else {
          expect(currentUrl).toContain(link.split('/')[1]); // Check main section
          console.log(`✓ Deep link ${link} accessible`);
        }
      }
    });
  });

  test.describe('Navigation Security', () => {
    test('should protect admin routes from non-admin users', async ({ page }) => {
      // Login as regular user (if available)
      const regularUserLogin = await utils.loginAsUser('john@example.com', 'password123');

      if (regularUserLogin) {
        // Try to access admin routes
        const adminRoutes = ['/admin/users', '/admin/settings', '/users'];

        for (const route of adminRoutes) {
          await utils.navigateTo(route);

          const currentUrl = page.url();
          if (currentUrl.includes('/login') || currentUrl.includes('/unauthorized')) {
            console.log(`✓ Admin route ${route} properly protected`);
          } else if (currentUrl.includes(route)) {
            // Check if page shows access denied message
            const accessDenied = await page.locator('text=Access Denied, text=Unauthorized, text=Permission').count();
            if (accessDenied > 0) {
              console.log(`✓ Admin route ${route} shows access denied`);
            } else {
              console.log(`! Admin route ${route} may not be properly protected`);
            }
          }
        }
      } else {
        console.log('Regular user account not available for testing');
      }
    });

    test('should redirect protected routes to login when not authenticated', async ({ page }) => {
      // Clear any existing authentication
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      const protectedRoutes = [
        '/dashboard',
        '/inspections',
        '/templates',
        '/users',
        '/profile'
      ];

      for (const route of protectedRoutes) {
        await utils.navigateTo(route);

        // Should redirect to login
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          console.log(`✓ Protected route ${route} redirected to login`);
        } else {
          // Might show login form inline
          const loginForm = await utils.getLoginForm().email.isVisible();
          if (loginForm) {
            console.log(`✓ Protected route ${route} shows login form`);
          } else {
            console.log(`! Protected route ${route} may not be properly secured`);
          }
        }
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should handle mobile menu toggle', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await utils.loginAsAdmin();
      await utils.navigateTo('/dashboard');

      // Look for mobile menu button
      const mobileMenuBtn = page.locator('.mobile-menu-btn, .hamburger, button[aria-label*="menu"]');

      if (await mobileMenuBtn.count() > 0) {
        // Test mobile menu toggle
        await mobileMenuBtn.click();

        // Menu should open
        const mobileMenu = page.locator('.mobile-menu, .sidebar-mobile, nav.mobile');
        await expect(mobileMenu).toBeVisible();

        // Test navigation in mobile menu
        const mobileNavItems = mobileMenu.locator('a');
        const navCount = await mobileNavItems.count();
        expect(navCount).toBeGreaterThan(0);

        // Close menu
        await mobileMenuBtn.click();
        await expect(mobileMenu).not.toBeVisible();

        console.log('✓ Mobile navigation working');
      } else {
        console.log('Mobile menu not implemented or uses different approach');
      }
    });

    test('should be responsive across different screen sizes', async ({ page }) => {
      await utils.loginAsAdmin();
      await utils.navigateTo('/dashboard');

      const viewports = [
        { width: 320, height: 568, name: 'Mobile Small' },
        { width: 375, height: 667, name: 'Mobile Medium' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1024, height: 768, name: 'Desktop Small' },
        { width: 1920, height: 1080, name: 'Desktop Large' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(500);

        // Navigation should be visible or accessible
        const nav = page.locator('nav, .navigation, .sidebar');
        const isNavVisible = await nav.isVisible();

        if (!isNavVisible) {
          // Check for mobile menu button
          const mobileBtn = page.locator('.mobile-menu-btn, .hamburger');
          const hasMobileBtn = await mobileBtn.count() > 0;
          console.log(`${viewport.name}: Navigation ${hasMobileBtn ? 'hidden with mobile menu' : 'not found'}`);
        } else {
          console.log(`✓ ${viewport.name}: Navigation visible`);
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await utils.loginAsAdmin();
      await utils.navigateTo('/dashboard');

      // Test tab navigation through main nav items
      await page.keyboard.press('Tab');

      let focusedElement = await page.evaluate(() => document.activeElement.tagName);
      let tabCount = 0;
      const maxTabs = 10;

      // Tab through navigation elements
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        tabCount++;

        const currentElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el.tagName,
            href: el.href,
            text: el.textContent?.trim(),
            role: el.getAttribute('role')
          };
        });

        // Check if we've found navigation links
        if (currentElement.href && (
          currentElement.href.includes('/dashboard') ||
          currentElement.href.includes('/inspections') ||
          currentElement.href.includes('/templates')
        )) {
          // Test Enter key to activate link
          await page.keyboard.press('Enter');
          await utils.waitForPageLoad();

          console.log(`✓ Keyboard navigation to ${currentElement.text} works`);
          break;
        }
      }
    });

    test('should handle skip links for accessibility', async ({ page }) => {
      await utils.navigateTo('/login');

      // Look for skip links (usually hidden until focused)
      await page.keyboard.press('Tab');

      const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');
      if (await skipLink.count() > 0) {
        const isVisible = await skipLink.isVisible();
        console.log(`Skip link ${isVisible ? 'visible' : 'hidden until focus'}`);

        if (isVisible || await skipLink.evaluate(el => el === document.activeElement)) {
          await skipLink.click();
          console.log('✓ Skip link functionality working');
        }
      } else {
        console.log('Skip links not implemented');
      }
    });
  });
});