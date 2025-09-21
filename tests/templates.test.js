const { test, expect } = require('@playwright/test');

test.describe('Template Management @regression', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Admin User', role: 'admin' }),
        apiRequest: async (url, options = {}) => {
          if (url.includes('/templates') && !options.method) {
            return {
              ok: true,
              json: () => Promise.resolve({
                templates: [
                  { 
                    id: '1', 
                    name: 'Safety Inspection', 
                    category: 'Safety',
                    description: 'Comprehensive safety inspection',
                    created_by: 'system',
                    creator: { name: 'System' }
                  },
                  { 
                    id: '2', 
                    name: 'Equipment Check', 
                    category: 'Equipment',
                    description: 'Equipment functionality check',
                    created_by: '1',
                    creator: { name: 'Admin User' }
                  }
                ]
              })
            };
          }
          
          if (url.includes('/templates') && options.method === 'POST') {
            return {
              ok: true,
              json: () => Promise.resolve({ id: '3', name: 'New Template' })
            };
          }
          
          return { ok: true, json: () => Promise.resolve({}) };
        }
      };
    });

    await page.goto('/');
    await page.waitForSelector('#app', { state: 'visible' });
  });

  test('displays templates with categories @smoke', async ({ page }) => {
    await page.click('.nav-link[data-page="templates"]');
    await page.waitForSelector('#templates-list');
    
    // Check if templates are displayed
    await expect(page.locator('#templates-list')).toContainText('Safety Inspection');
    await expect(page.locator('#templates-list')).toContainText('Equipment Check');
    
    // Check categories
    await expect(page.locator('#templates-list')).toContainText('Safety');
    await expect(page.locator('#templates-list')).toContainText('Equipment');
  });

  test('can create new template', async ({ page }) => {
    await page.click('.nav-link[data-page="templates"]');
    await page.click('#create-template-btn');
    
    // Verify navigation to template builder
    await expect(page.locator('#template-builder-page')).toHaveClass(/active/);
    
    // Fill template details
    await page.fill('#template-name', 'New Custom Template');
    await page.fill('#template-description', 'Custom template description');
    await page.selectOption('#template-category', 'Custom');
    
    // Add a section
    await page.click('#add-section-btn');
    await page.fill('.section-name-input', 'Custom Section');
    
    // Add a field
    await page.click('#add-field-btn');
    await page.fill('.field-name-input', 'custom_field');
    await page.fill('.field-label-input', 'Custom Field');
    await page.selectOption('.field-type-select', 'text');
    
    // Save template
    await page.click('#save-template-btn');
    
    await expect(page.locator('.notification.success')).toBeVisible();
  });

  test('can edit existing template', async ({ page }) => {
    await page.click('.nav-link[data-page="templates"]');
    
    // Click edit button for first template
    await page.click('.template-item .btn:has-text("Edit")');
    
    // Verify navigation to edit mode
    await expect(page.locator('#builder-page-title')).toContainText('Edit Template');
    
    // Modify template name
    await page.fill('#template-name', 'Updated Template Name');
    
    // Save changes
    await page.click('#save-template-btn');
    
    await expect(page.locator('.notification.success')).toBeVisible();
  });

  test('can duplicate template', async ({ page }) => {
    await page.route('**/api/v1/templates/1/duplicate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '4', name: 'Safety Inspection (Copy)' })
      });
    });

    await page.click('.nav-link[data-page="templates"]');
    
    // Click duplicate button
    await page.click('.template-item .btn:has-text("Duplicate")');
    
    await expect(page.locator('.notification.success')).toContainText('duplicated');
  });

  test('template selection modal shows categorized templates', async ({ page }) => {
    await page.click('#new-inspection-btn');
    
    // Wait for modal
    await expect(page.locator('#modal-container.show')).toBeVisible();
    
    // Check modal title
    await expect(page.locator('.modal h3')).toContainText('Select Inspection Type');
    
    // Check categories are displayed
    await expect(page.locator('.template-category')).toContainText('🦺 Safety');
    await expect(page.locator('.template-category')).toContainText('⚙️ Equipment');
    
    // Check system badges
    await expect(page.locator('.system-badge')).toContainText('Default');
  });

  test('template options have proper styling and interaction', async ({ page }) => {
    await page.click('#new-inspection-btn');
    await expect(page.locator('#modal-container.show')).toBeVisible();
    
    const templateOption = page.locator('.template-option').first();
    
    // Test hover effect
    await templateOption.hover();
    
    // Test click functionality
    await templateOption.click();
    
    // Modal should close and form should appear
    await expect(page.locator('#modal-container')).not.toHaveClass(/show/);
    await expect(page.locator('#inspection-form-page')).toHaveClass(/active/);
  });
});

test.describe('Template Builder UI @ui', () => {
  test('template builder has all necessary components', async ({ page }) => {
    await page.addInitScript(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Admin', role: 'admin' }),
        apiRequest: async () => ({ ok: true, json: () => Promise.resolve({}) })
      };
    });

    await page.goto('/');
    await page.click('.nav-link[data-page="template-builder"]');
    
    // Check all builder components
    await expect(page.locator('#template-name')).toBeVisible();
    await expect(page.locator('#template-description')).toBeVisible();
    await expect(page.locator('#template-category')).toBeVisible();
    await expect(page.locator('#add-section-btn')).toBeVisible();
    await expect(page.locator('#save-template-btn')).toBeVisible();
    await expect(page.locator('#cancel-template-btn')).toBeVisible();
  });

  test('can add and configure different field types', async ({ page }) => {
    await page.addInitScript(() => {
      window.auth = {
        isAuthenticated: () => true,
        getUser: () => ({ id: '1', name: 'Admin', role: 'admin' }),
        apiRequest: async () => ({ ok: true, json: () => Promise.resolve({}) })
      };
    });

    await page.goto('/');
    await page.click('.nav-link[data-page="template-builder"]');
    
    // Add section
    await page.click('#add-section-btn');
    
    // Add different field types
    const fieldTypes = ['text', 'number', 'select', 'radio', 'checkbox', 'textarea'];
    
    for (const fieldType of fieldTypes) {
      await page.click('#add-field-btn');
      await page.selectOption('.field-type-select:last-of-type', fieldType);
      
      // Verify field type specific options appear
      if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
        await expect(page.locator('.field-options:last-of-type')).toBeVisible();
      }
    }
  });
});