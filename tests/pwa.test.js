const { test, expect } = require('@playwright/test');

test.describe('PWA Functionality @pwa', () => {
  test('has valid manifest.json', async ({ page, request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('service worker is registered', async ({ page }) => {
    await page.goto('/');
    
    const swRegistered = await page.evaluate(async () => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swRegistered).toBe(true);
  });

  test('works offline after cache', async ({ page, context }) => {
    // First visit to cache resources
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Should still work offline
    await expect(page.locator('h1')).toContainText('SiteInspect');
  });

  test('displays offline indicator when offline', async ({ page, context }) => {
    await page.goto('/');
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    
    // Check for offline indicator
    await expect(page.locator('.offline-indicator, .status-offline')).toBeVisible();
  });

  test('sync button appears when offline', async ({ page, context }) => {
    await page.goto('/');
    
    await context.setOffline(true);
    await page.reload();
    
    await expect(page.locator('#sync-btn')).toBeVisible();
  });
});

test.describe('PWA Installation @pwa', () => {
  test('shows install prompt on supported browsers', async ({ page }) => {
    // Mock install prompt
    await page.addInitScript(() => {
      let deferredPrompt = null;
      
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Show custom install button
        const installBtn = document.createElement('button');
        installBtn.id = 'install-btn';
        installBtn.textContent = 'Install App';
        installBtn.onclick = () => {
          deferredPrompt.prompt();
        };
        document.body.appendChild(installBtn);
      });
    });

    await page.goto('/');
    
    // Trigger install prompt event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });

    await expect(page.locator('#install-btn')).toBeVisible();
  });
});

test.describe('Mobile PWA Features @mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('mobile navigation works correctly', async ({ page }) => {
    await page.addInitScript(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Mobile User', role: 'inspector' }),
        apiRequest: async () => ({ ok: true, json: () => Promise.resolve({}) })
      };
    });

    await page.goto('/');
    
    // Mobile menu should be collapsed initially
    await expect(page.locator('.nav-drawer')).toHaveClass(/collapsed/);
    
    // Click nav toggle
    await page.click('#nav-toggle');
    
    // Menu should be visible
    await expect(page.locator('.nav-drawer')).toHaveClass(/open/);
    
    // Click outside to close
    await page.click('.nav-overlay');
    
    // Menu should be closed
    await expect(page.locator('.nav-drawer')).not.toHaveClass(/open/);
  });

  test('floating action button works on mobile', async ({ page }) => {
    await page.addInitScript(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Mobile User', role: 'inspector' }),
        apiRequest: async () => ({ 
          ok: true, 
          json: () => Promise.resolve({ templates: [] }) 
        })
      };
    });

    await page.goto('/');
    
    // FAB should be visible
    await expect(page.locator('#fab')).toBeVisible();
    
    // Click FAB
    await page.click('#fab');
    
    // Should navigate to inspection form
    await expect(page.locator('#inspection-form-page')).toHaveClass(/active/);
  });

  test('mobile modal is responsive', async ({ page }) => {
    await page.addInitScript(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Mobile User', role: 'inspector' }),
        apiRequest: async (url) => {
          if (url.includes('/templates')) {
            return {
              ok: true,
              json: () => Promise.resolve({
                templates: [
                  { id: '1', name: 'Mobile Template', category: 'Test', description: 'Test' }
                ]
              })
            };
          }
          return { ok: true, json: () => Promise.resolve({}) };
        }
      };
    });

    await page.goto('/');
    await page.click('#new-inspection-btn');
    
    // Modal should be responsive on mobile
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    
    const modalWidth = await modal.evaluate(el => el.offsetWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    // Modal should not exceed viewport width minus padding
    expect(modalWidth).toBeLessThan(viewportWidth - 20);
  });
});

test.describe('Performance and Accessibility @performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('h1');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('has proper accessibility attributes', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper ARIA labels and roles
    await expect(page.locator('button[aria-label]')).toHaveCount(4); // Should have aria labels
    await expect(page.locator('[role="button"]')).toHaveCount(0); // Buttons should be proper button elements
    
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Enter should activate focused element
    await page.keyboard.press('Enter');
  });
});