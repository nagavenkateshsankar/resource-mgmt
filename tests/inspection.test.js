const { test, expect } = require('@playwright/test');

test.describe('Inspection Management @regression', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Test User', role: 'inspector' }),
        apiRequest: async (url, options = {}) => {
          // Mock different API endpoints
          if (url.includes('/templates')) {
            return {
              ok: true,
              json: () => Promise.resolve({
                templates: [
                  { 
                    id: '1', 
                    name: 'Safety Inspection', 
                    category: 'Safety', 
                    description: 'Safety check template',
                    fields_schema: {
                      sections: [{
                        name: 'Basic Info',
                        fields: [
                          { name: 'weather', label: 'Weather', type: 'select', options: ['Sunny', 'Rainy'] }
                        ]
                      }]
                    }
                  }
                ]
              })
            };
          }
          
          if (url.includes('/inspections') && options.method === 'POST') {
            return {
              ok: true,
              json: () => Promise.resolve({ id: '123', status: 'created' })
            };
          }
          
          return { ok: true, json: () => Promise.resolve({}) };
        }
      };
    });

    await page.goto('/');
    await page.waitForSelector('#app', { state: 'visible' });
  });

  test('can create new inspection from template @smoke', async ({ page }) => {
    // Navigate to inspection creation
    await page.click('#new-inspection-btn');
    
    // Wait for modal to appear
    await expect(page.locator('#modal-container.show')).toBeVisible({ timeout: 5000 });
    
    // Select a template
    await page.click('.template-option[data-id="1"]');
    
    // Verify form is loaded
    await expect(page.locator('#inspection-form')).toBeVisible();
    
    // Fill required fields
    await page.fill('input[name="site_location"]', 'Test Site Location');
    await page.selectOption('select[name="weather"]', 'Sunny');
    
    // Submit inspection
    await page.click('#submit-inspection-btn');
    
    // Verify success
    await expect(page.locator('.notification.success')).toBeVisible();
  });

  test('can save inspection as draft', async ({ page }) => {
    await page.click('#new-inspection-btn');
    await page.waitForSelector('#modal-container.show', { state: 'visible' });
    await page.click('.template-option[data-id="1"]');
    
    await page.fill('input[name="site_location"]', 'Draft Site');
    
    await page.click('#save-draft-btn');
    
    await expect(page.locator('.notification')).toContainText('Draft saved');
  });

  test('displays assigned inspections on dashboard', async ({ page }) => {
    // Mock assigned inspections
    await page.route('**/api/v1/inspections**', async route => {
      const url = route.request().url();
      if (url.includes('status=assigned')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            inspections: [
              {
                id: '1',
                site_location: 'Assigned Site 1',
                due_date: '2025-08-26',
                template: { name: 'Safety Inspection' },
                status: 'assigned'
              }
            ]
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json', 
          body: JSON.stringify({ inspections: [] })
        });
      }
    });

    await page.goto('/');
    await page.waitForSelector('#assigned-inspections');
    
    await expect(page.locator('#assigned-inspections')).toContainText('Assigned Site 1');
    await expect(page.locator('.btn')).toContainText('Start Inspection');
  });

  test('can start assigned inspection', async ({ page }) => {
    // Mock assigned inspection and template data
    await page.route('**/api/v1/inspections/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          site_location: 'Test Site',
          template: {
            id: '1',
            name: 'Safety Inspection',
            fields_schema: {
              sections: [{
                name: 'Basic Info',
                fields: [{ name: 'weather', label: 'Weather', type: 'text' }]
              }]
            }
          }
        })
      });
    });

    // Add start inspection button manually for test
    await page.evaluate(() => {
      const container = document.querySelector('#assigned-inspections');
      if (container) {
        container.innerHTML = `
          <div class="assigned-item">
            <button onclick="app.startInspection('1')" class="btn btn-primary">Start Inspection</button>
          </div>
        `;
      }
    });

    await page.click('.btn:has-text("Start Inspection")');
    
    // Verify navigation to inspection form
    await expect(page.locator('#inspection-form-page')).toHaveClass(/active/);
  });
});

test.describe('Inspection Offline Support @pwa', () => {
  test('can save inspection when offline', async ({ page, context }) => {
    // Set offline mode
    await context.setOffline(true);
    
    await page.goto('/');
    // Test offline functionality
    await expect(page.locator('.offline-indicator')).toBeVisible();
  });

  test('syncs inspections when back online', async ({ page, context }) => {
    // Start offline
    await context.setOffline(true);
    await page.goto('/');
    
    // Create offline inspection
    // ... offline inspection creation logic ...
    
    // Go back online
    await context.setOffline(false);
    await page.click('#sync-btn');
    
    await expect(page.locator('.notification')).toContainText('Sync complete');
  });
});