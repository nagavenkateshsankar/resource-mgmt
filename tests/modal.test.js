const { test, expect } = require('@playwright/test');

test.describe('Modal System Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto('http://localhost:5432/test-modal.html');
    await page.waitForLoadState('networkidle');
  });

  test('Basic modal functionality', async ({ page }) => {
    // Click the basic modal test button
    await page.click('button:has-text("Test Basic Modal")');
    
    // Check if modal container gets the show class
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).toHaveClass(/show/);
    
    // Check if modal is visible
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    
    // Check modal content
    await expect(page.locator('.modal h3')).toContainText('Basic Test Modal');
    
    // Close modal
    await page.click('.modal-close');
    await expect(modalContainer).not.toHaveClass(/show/);
  });

  test('Template selection modal', async ({ page }) => {
    await page.click('button:has-text("Test Template Selection Modal")');
    
    // Check if modal is visible
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    
    // Check for template options
    await expect(page.locator('.modal')).toContainText('Safety Inspection');
    await expect(page.locator('.modal')).toContainText('Equipment Check');
  });

  test('CSS override test', async ({ page }) => {
    await page.click('button:has-text("Test with CSS Override")');
    
    // Check if extreme styles are applied
    const container = page.locator('#modal-container');
    const backgroundColor = await container.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should have red background
    expect(backgroundColor).toMatch(/rgb\(255, 0, 0\)/);
  });

  test('Environment checks', async ({ page }) => {
    await page.click('button:has-text("Check Environment")');
    
    // Wait for logs to appear
    await page.waitForTimeout(1000);
    
    // Check if test results show browser info
    const results = page.locator('#test-results');
    await expect(results).toContainText('Browser:');
    await expect(results).toContainText('Viewport:');
  });

  test('Full app modal test', async ({ page }) => {
    // Navigate to main app
    await page.goto('http://localhost:5432');
    
    // Wait for app to load
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Try to trigger new inspection modal
    await page.click('button:has-text("New Inspection")');
    
    // Check if modal container gets show class
    const modalContainer = page.locator('#modal-container');
    
    // Wait a bit for modal to appear
    await page.waitForTimeout(2000);
    
    // Log current state for debugging
    const hasShowClass = await modalContainer.evaluate(el => el.classList.contains('show'));
    const computedStyle = await modalContainer.evaluate(el => window.getComputedStyle(el).display);
    const innerHTML = await modalContainer.innerHTML();
    
    console.log('Modal container has show class:', hasShowClass);
    console.log('Modal container display:', computedStyle);
    console.log('Modal container content length:', innerHTML.length);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'modal-debug.png' });
  });
});

test.describe('Main App Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5432');
    
    // Mock successful login
    await page.evaluate(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Test User', role: 'admin' }),
        apiRequest: async (url) => {
          if (url.includes('/templates')) {
            return {
              ok: true,
              json: () => Promise.resolve({
                templates: [
                  { id: '1', name: 'Safety Inspection', category: 'Safety', description: 'Test' },
                  { id: '2', name: 'Equipment Check', category: 'Equipment', description: 'Test' }
                ]
              })
            };
          }
          return { ok: true, json: () => Promise.resolve({}) };
        }
      };
      
      // Trigger app initialization
      if (window.app) {
        window.app.showApp();
      }
    });
    
    await page.waitForSelector('.page.active', { state: 'visible' });
  });

  test('New Inspection button triggers modal', async ({ page }) => {
    // Click new inspection button
    await page.click('#new-inspection-btn');
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    // Check if modal is visible
    const modal = page.locator('#modal-container.show');
    
    // Debug information
    const modalExists = await page.locator('#modal-container').count();
    const hasShowClass = await page.locator('#modal-container.show').count();
    const modalContent = await page.locator('#modal-container').innerHTML();
    
    console.log('Modal container exists:', modalExists > 0);
    console.log('Modal has show class:', hasShowClass > 0);
    console.log('Modal content length:', modalContent.length);
    
    // Take screenshot
    await page.screenshot({ path: 'new-inspection-modal.png' });
    
    expect(hasShowClass).toBeGreaterThan(0);
  });
});