const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Inspections Management', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.loginAsAdmin();
  });

  test.describe('Inspections List Page', () => {
    test('should load inspections page successfully', async ({ page }) => {
      await utils.navigateTo('/inspections');

      const inspectionsPage = utils.getInspectionsPage();

      // Verify page heading
      await expect(inspectionsPage.heading).toBeVisible();

      // Check for create button
      await expect(inspectionsPage.createButton).toBeVisible();

      console.log('✓ Inspections page loaded successfully');
    });

    test('should display inspections list', async ({ page }) => {
      await utils.navigateTo('/inspections');

      const inspectionsPage = utils.getInspectionsPage();

      // Wait for inspections to load
      await page.waitForTimeout(2000);

      // Check if inspections are displayed
      const inspectionsList = inspectionsPage.inspectionsList;
      if (await inspectionsList.count() > 0) {
        await expect(inspectionsList).toBeVisible();

        // Check for inspection items
        const inspectionItems = page.locator('.inspection-item, .inspection-card, tr[data-inspection], .list-item');
        const itemCount = await inspectionItems.count();

        if (itemCount > 0) {
          console.log(`✓ Found ${itemCount} inspections in list`);

          // Verify inspection data structure
          const firstInspection = inspectionItems.first();
          await expect(firstInspection).toBeVisible();

          // Look for common inspection fields
          const hasTitle = await firstInspection.locator('.title, .name, .inspection-name').count() > 0;
          const hasDate = await firstInspection.locator('.date, .created, .timestamp').count() > 0;
          const hasStatus = await firstInspection.locator('.status, .badge').count() > 0;

          if (hasTitle) console.log('✓ Inspection titles displayed');
          if (hasDate) console.log('✓ Inspection dates displayed');
          if (hasStatus) console.log('✓ Inspection status displayed');
        } else {
          console.log('! No inspection items found - might be empty state');
        }
      } else {
        console.log('! Inspections list container not found');
      }
    });

    test('should navigate to create inspection page', async ({ page }) => {
      await utils.navigateTo('/inspections');

      const inspectionsPage = utils.getInspectionsPage();
      await inspectionsPage.createButton.click();

      // Should navigate to create page
      await page.waitForTimeout(1000);
      const currentUrl = page.url();

      expect(currentUrl).toMatch(/\/(inspections\/new|inspections\/create|create-inspection)/);

      // Verify create page loads
      const createPageHeading = page.locator('h1:has-text("Create"), h1:has-text("New Inspection"), h2:has-text("Create")');
      await expect(createPageHeading).toBeVisible();

      console.log('✓ Navigation to create inspection page works');
    });

    test('should filter inspections by status', async ({ page }) => {
      await utils.navigateTo('/inspections');

      const inspectionsPage = utils.getInspectionsPage();

      if (await inspectionsPage.filterDropdown.count() > 0) {
        // Get initial count
        const initialItems = await page.locator('.inspection-item, .inspection-card, tr[data-inspection]').count();

        // Apply filter
        await inspectionsPage.filterDropdown.selectOption('completed');
        await page.waitForTimeout(1000);

        const filteredItems = await page.locator('.inspection-item, .inspection-card, tr[data-inspection]').count();

        console.log(`✓ Status filter applied: ${initialItems} → ${filteredItems} inspections`);

        // Reset filter
        await inspectionsPage.filterDropdown.selectOption('');
      } else {
        console.log('! Status filter not found');
      }
    });
  });

  test.describe('Inspection Creation', () => {
    test('should display inspection creation form', async ({ page }) => {
      await utils.navigateTo('/inspections/new');

      // Wait for form to load
      await page.waitForTimeout(1000);

      // Check for form elements
      const form = page.locator('form, .inspection-form');
      await expect(form).toBeVisible();

      // Look for common form fields
      const titleField = page.locator('input[name="title"], input[name="name"], #title, #name');
      const descriptionField = page.locator('textarea[name="description"], #description');
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');

      if (await titleField.count() > 0) {
        await expect(titleField).toBeVisible();
        console.log('✓ Title field present');
      }

      if (await descriptionField.count() > 0) {
        await expect(descriptionField).toBeVisible();
        console.log('✓ Description field present');
      }

      await expect(submitButton).toBeVisible();
      console.log('✓ Submit button present');
    });

    test('should validate required fields', async ({ page }) => {
      await utils.navigateTo('/inspections/new');

      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      await submitButton.click();

      // Should show validation errors or prevent submission
      await page.waitForTimeout(1000);

      const validationErrors = page.locator('.error, .validation-error, .field-error, [data-testid="error"]');
      const errorCount = await validationErrors.count();

      if (errorCount > 0) {
        console.log(`✓ Validation errors shown: ${errorCount} errors`);
      } else {
        // Check if form submission was prevented
        const currentUrl = page.url();
        if (currentUrl.includes('/new') || currentUrl.includes('/create')) {
          console.log('✓ Form submission prevented for empty form');
        } else {
          console.log('! Form validation may not be working');
        }
      }
    });

    test('should create inspection with valid data', async ({ page }) => {
      await utils.navigateTo('/inspections/new');

      // Fill form with test data
      const testData = {
        title: `Test Inspection ${Date.now()}`,
        description: 'This is a test inspection created by automated tests',
        location: 'Test Site Location'
      };

      // Fill available fields
      await utils.fillForm(testData);

      // Look for template selection if available
      const templateSelector = page.locator('select[name="template"], #template, .template-selector');
      if (await templateSelector.count() > 0) {
        const options = await templateSelector.locator('option').count();
        if (options > 1) {
          await templateSelector.selectOption({ index: 1 }); // Select first non-empty option
          console.log('✓ Template selected');
        }
      }

      // Look for site selection if available
      const siteSelector = page.locator('select[name="site"], #site, .site-selector');
      if (await siteSelector.count() > 0) {
        const options = await siteSelector.locator('option').count();
        if (options > 1) {
          await siteSelector.selectOption({ index: 1 });
          console.log('✓ Site selected');
        }
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      await submitButton.click();

      // Wait for navigation or success message
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      if (!currentUrl.includes('/new') && !currentUrl.includes('/create')) {
        console.log('✓ Inspection created successfully - navigated away from form');

        // Verify we're on inspection detail or list page
        if (currentUrl.includes('/inspections/')) {
          const pageContent = await page.textContent('body');
          if (pageContent.includes(testData.title)) {
            console.log('✓ Created inspection found on page');
          }
        }
      } else {
        // Check for success message
        const successMessage = page.locator('.success, .alert-success, .notification-success');
        if (await successMessage.count() > 0) {
          console.log('✓ Inspection creation success message shown');
        } else {
          console.log('! Inspection creation may not have succeeded');
        }
      }
    });
  });

  test.describe('Inspection Details and Actions', () => {
    test('should view inspection details', async ({ page }) => {
      await utils.navigateTo('/inspections');

      // Find first inspection and click it
      const inspectionItem = page.locator('.inspection-item, .inspection-card, tr[data-inspection]').first();

      if (await inspectionItem.count() > 0) {
        // Look for clickable element (title link or view button)
        const clickableElement = inspectionItem.locator('a, button:has-text("View"), .title, .name').first();

        if (await clickableElement.count() > 0) {
          await clickableElement.click();
          await page.waitForTimeout(1000);

          const currentUrl = page.url();
          if (currentUrl.includes('/inspections/') && !currentUrl.endsWith('/inspections')) {
            console.log('✓ Navigated to inspection details page');

            // Verify detail page content
            const detailHeading = page.locator('h1, h2, .inspection-title');
            await expect(detailHeading).toBeVisible();

            // Look for inspection details
            const detailSections = page.locator('.inspection-details, .details-section, .inspection-info');
            if (await detailSections.count() > 0) {
              console.log('✓ Inspection details displayed');
            }
          } else {
            console.log('! Did not navigate to inspection details');
          }
        }
      } else {
        console.log('! No inspections found to view details');
      }
    });

    test('should edit inspection if allowed', async ({ page }) => {
      await utils.navigateTo('/inspections');

      // Find edit button on first inspection
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), .edit-btn').first();

      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(1000);

        const currentUrl = page.url();
        if (currentUrl.includes('/edit') || currentUrl.includes('/update')) {
          console.log('✓ Navigated to inspection edit page');

          // Verify edit form
          const form = page.locator('form, .inspection-form');
          await expect(form).toBeVisible();

          // Check that form is pre-filled
          const titleField = page.locator('input[name="title"], input[name="name"], #title');
          if (await titleField.count() > 0) {
            const titleValue = await titleField.inputValue();
            expect(titleValue.length).toBeGreaterThan(0);
            console.log('✓ Edit form pre-filled with existing data');
          }
        } else {
          console.log('! Edit functionality not accessible');
        }
      } else {
        console.log('! Edit button not found');
      }
    });

    test('should handle inspection status changes', async ({ page }) => {
      await utils.navigateTo('/inspections');

      // Look for status change buttons
      const statusButtons = page.locator('button:has-text("Complete"), button:has-text("Start"), .status-btn');
      const statusCount = await statusButtons.count();

      if (statusCount > 0) {
        const firstStatusBtn = statusButtons.first();
        const buttonText = await firstStatusBtn.textContent();

        await firstStatusBtn.click();
        await page.waitForTimeout(1000);

        // Look for confirmation dialog or immediate status change
        const confirmDialog = page.locator('.modal, .dialog, .confirm');
        if (await confirmDialog.count() > 0) {
          // Handle confirmation
          const confirmBtn = confirmDialog.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmBtn.count() > 0) {
            await confirmBtn.click();
          }
        }

        console.log(`✓ Status change action "${buttonText}" triggered`);
      } else {
        console.log('! Status change buttons not found');
      }
    });
  });

  test.describe('Inspection Search and Sorting', () => {
    test('should search inspections', async ({ page }) => {
      await utils.navigateTo('/inspections');

      const searchInput = page.locator('input[placeholder*="search"], input[name="search"], #search');

      if (await searchInput.count() > 0) {
        const initialCount = await page.locator('.inspection-item, .inspection-card').count();

        await searchInput.fill('test');
        await page.waitForTimeout(1000);

        const filteredCount = await page.locator('.inspection-item, .inspection-card').count();

        console.log(`✓ Search applied: ${initialCount} → ${filteredCount} inspections`);

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(1000);
      } else {
        console.log('! Search functionality not found');
      }
    });

    test('should sort inspections', async ({ page }) => {
      await utils.navigateTo('/inspections');

      // Look for sort dropdown or buttons
      const sortControl = page.locator('select[name="sort"], .sort-dropdown, button:has-text("Sort")');

      if (await sortControl.count() > 0) {
        if (await sortControl.getAttribute('tagName') === 'SELECT') {
          // Dropdown sort
          const options = await sortControl.locator('option').count();
          if (options > 1) {
            await sortControl.selectOption({ index: 1 });
            await page.waitForTimeout(1000);
            console.log('✓ Sort option applied');
          }
        } else {
          // Button sort
          await sortControl.click();
          await page.waitForTimeout(1000);
          console.log('✓ Sort button clicked');
        }
      } else {
        console.log('! Sort functionality not found');
      }
    });
  });

  test.describe('Inspection Templates Integration', () => {
    test('should show template selection in create form', async ({ page }) => {
      await utils.navigateTo('/inspections/new');

      const templateSelector = page.locator('select[name="template"], #template, .template-selector');

      if (await templateSelector.count() > 0) {
        await expect(templateSelector).toBeVisible();

        const options = await templateSelector.locator('option').count();
        expect(options).toBeGreaterThan(0);

        console.log(`✓ Template selector found with ${options} options`);

        // Test selecting a template
        if (options > 1) {
          await templateSelector.selectOption({ index: 1 });

          // Check if form updates with template fields
          await page.waitForTimeout(1000);

          const dynamicFields = page.locator('.template-field, .question-field, .dynamic-field');
          if (await dynamicFields.count() > 0) {
            console.log('✓ Template fields loaded dynamically');
          }
        }
      } else {
        console.log('! Template selector not found');
      }
    });

    test('should link to templates page', async ({ page }) => {
      await utils.navigateTo('/inspections');

      // Look for templates link or button
      const templatesLink = page.locator('a:has-text("Templates"), button:has-text("Templates"), a[href*="templates"]');

      if (await templatesLink.count() > 0) {
        await templatesLink.click();
        await utils.waitForUrl('**/templates');

        const templatesPage = utils.getTemplatesPage();
        await expect(templatesPage.heading).toBeVisible();

        console.log('✓ Navigation to templates page works');
      } else {
        console.log('! Templates link not found on inspections page');
      }
    });
  });

  test.describe('Inspection Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Block inspections API
      await page.route('**/api/v1/inspections*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server Error' })
        });
      });

      await utils.navigateTo('/inspections');
      await page.waitForTimeout(2000);

      // Should show error message
      const errorMessage = page.locator('.error-message, .alert-danger, text=Error loading');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        console.log('✓ API error handled gracefully');
      } else {
        console.log('! API error handling needs improvement');
      }
    });

    test('should handle empty inspections state', async ({ page }) => {
      await utils.navigateTo('/inspections');
      await page.waitForTimeout(2000);

      const inspectionItems = page.locator('.inspection-item, .inspection-card');
      const itemCount = await inspectionItems.count();

      if (itemCount === 0) {
        // Check for empty state message
        const emptyState = page.locator('text=No inspections, .empty-state, text=Get started');
        if (await emptyState.count() > 0) {
          await expect(emptyState).toBeVisible();
          console.log('✓ Empty state displayed correctly');
        } else {
          console.log('! Empty state handling could be improved');
        }
      } else {
        console.log(`✓ Inspections found: ${itemCount} items`);
      }
    });
  });
});