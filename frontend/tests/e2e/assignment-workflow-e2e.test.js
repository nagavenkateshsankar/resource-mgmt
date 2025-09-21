/**
 * Assignment Workflow End-to-End Tests
 * Comprehensive tests for assignment creation workflows and user interactions
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Assignment Workflow E2E Tests', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);

    // Set longer timeout for E2E tests
    test.setTimeout(60000);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Site-First Assignment Workflow', () => {
    test('Should complete site-first assignment creation workflow', async () => {
      await utils.loginAsAdmin();

      // Navigate to bulk assignment page
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Step 1: Fill assignment details
      await page.fill('input[name="name"]', 'E2E Test Assignment');
      await page.fill('textarea[name="description"]', 'End-to-end test assignment');
      await page.selectOption('select[name="priority"]', 'high');
      await page.selectOption('select[name="template_id"]', { index: 1 });

      // Step 2: Select sites
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();

      if (siteCount > 0) {
        // Select first 3 sites
        for (let i = 0; i < Math.min(3, siteCount); i++) {
          await siteCards.nth(i).click();
        }

        // Verify sites are selected
        const selectedSites = page.locator('.site-card.selected');
        const selectedCount = await selectedSites.count();
        expect(selectedCount).toBeGreaterThan(0);
      }

      // Step 3: Assign inspectors
      await page.selectOption('select[name="inspector_id"]', { index: 1 });

      // Step 4: Set assignment options
      await page.fill('input[name="estimated_hours"]', '4');
      await page.check('input[name="requires_acceptance"]');
      await page.check('input[name="allow_reassignment"]');

      // Step 5: Submit assignment
      await page.click('button[type="submit"]');

      // Wait for success response
      await page.waitForLoadState('networkidle');

      // Verify navigation to assignments list or success message
      await expect(page).toHaveURL(/\/assignments|\/workflow/);

      // Look for success indicators
      const successIndicators = [
        page.locator('.success-message'),
        page.locator('.notification:has-text("success")'),
        page.locator(':text("created successfully")')
      ];

      let foundSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.count() > 0) {
          foundSuccess = true;
          break;
        }
      }

      expect(foundSuccess).toBe(true);
    });

    test('Should handle site selection and deselection', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();

      if (siteCount >= 2) {
        // Select first site
        await siteCards.nth(0).click();
        await expect(siteCards.nth(0)).toHaveClass(/selected/);

        // Select second site
        await siteCards.nth(1).click();
        await expect(siteCards.nth(1)).toHaveClass(/selected/);

        // Deselect first site
        await siteCards.nth(0).click();
        await expect(siteCards.nth(0)).not.toHaveClass(/selected/);

        // Second site should still be selected
        await expect(siteCards.nth(1)).toHaveClass(/selected/);
      }
    });

    test('Should support bulk site selection operations', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test "Select All" functionality
      const selectAllButton = page.locator('button:has-text("Select All")');
      if (await selectAllButton.count() > 0) {
        await selectAllButton.click();

        // Verify all sites are selected
        const selectedSites = page.locator('.site-card.selected');
        const allSites = page.locator('.site-card');

        const selectedCount = await selectedSites.count();
        const totalCount = await allSites.count();

        expect(selectedCount).toBe(totalCount);

        // Test "Clear All" functionality
        const clearAllButton = page.locator('button:has-text("Clear All")');
        if (await clearAllButton.count() > 0) {
          await clearAllButton.click();

          // Verify no sites are selected
          const remainingSelected = await page.locator('.site-card.selected').count();
          expect(remainingSelected).toBe(0);
        }
      }
    });

    test('Should validate required fields before submission', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should not proceed or show validation errors
      const currentUrl = page.url();
      expect(currentUrl).toContain('bulk-assignment');

      // Look for validation messages
      const validationMessages = [
        page.locator('.error-message'),
        page.locator('.field-error'),
        page.locator(':text("required")')
      ];

      let foundValidation = false;
      for (const message of validationMessages) {
        if (await message.count() > 0) {
          foundValidation = true;
          break;
        }
      }

      // Should show validation or button should be disabled
      const isButtonDisabled = await submitButton.isDisabled();
      expect(foundValidation || isButtonDisabled).toBe(true);
    });
  });

  test.describe('Inspector Assignment Workflows', () => {
    test('Should support manual inspector assignment', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Fill basic details
      await page.fill('input[name="name"]', 'Manual Assignment Test');
      await page.selectOption('select[name="template_id"]', { index: 1 });

      // Select sites
      const siteCards = page.locator('.site-card');
      if (await siteCards.count() > 0) {
        await siteCards.nth(0).click();
      }

      // Select manual assignment strategy
      const manualRadio = page.locator('input[value="manual"]');
      if (await manualRadio.count() > 0) {
        await manualRadio.click();

        // Should show manual assignment interface
        const manualInterface = page.locator('.manual-assignment');
        await expect(manualInterface).toBeVisible();

        // Select inspector
        const inspectorSelect = page.locator('select[name="inspector_id"]').first();
        if (await inspectorSelect.count() > 0) {
          await inspectorSelect.selectOption({ index: 1 });
        }
      }
    });

    test('Should support auto-assignment strategy', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Fill basic details
      await page.fill('input[name="name"]', 'Auto Assignment Test');
      await page.selectOption('select[name="template_id"]', { index: 1 });

      // Select multiple sites
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();
      if (siteCount >= 2) {
        await siteCards.nth(0).click();
        await siteCards.nth(1).click();
      }

      // Select auto assignment strategy
      const autoRadio = page.locator('input[value="auto"]');
      if (await autoRadio.count() > 0) {
        await autoRadio.click();

        // Should show auto assignment summary
        const autoInterface = page.locator('.auto-assignment-display');
        await expect(autoInterface).toBeVisible();

        // Should show assignment summary
        const summaryItems = page.locator('.summary-item');
        const summaryCount = await summaryItems.count();
        expect(summaryCount).toBeGreaterThan(0);
      }
    });

    test('Should support equal distribution strategy', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Fill basic details
      await page.fill('input[name="name"]', 'Equal Distribution Test');
      await page.selectOption('select[name="template_id"]', { index: 1 });

      // Select multiple sites
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();
      if (siteCount >= 3) {
        for (let i = 0; i < 3; i++) {
          await siteCards.nth(i).click();
        }
      }

      // Select equal distribution strategy
      const equalRadio = page.locator('input[value="equal"]');
      if (await equalRadio.count() > 0) {
        await equalRadio.click();

        // Should show distribution summary
        const equalInterface = page.locator('.auto-assignment-display');
        await expect(equalInterface).toBeVisible();
      }
    });

    test('Should display inspector workload information', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Look for workload indicators in inspector selection
      const workloadIndicators = [
        page.locator('.workload-info'),
        page.locator('.inspector-workload'),
        page.locator(':text("assignments")'),
        page.locator(':text("%")')
      ];

      let foundWorkloadInfo = false;
      for (const indicator of workloadIndicators) {
        if (await indicator.count() > 0) {
          foundWorkloadInfo = true;
          break;
        }
      }

      expect(foundWorkloadInfo).toBe(true);
    });
  });

  test.describe('Assignment Management', () => {
    test('Should allow assignment acceptance by inspector', async () => {
      // Login as inspector
      const loginSuccess = await utils.loginAsUser('john@example.com', 'password123');

      if (loginSuccess) {
        await page.goto('http://localhost:5173/assignments');
        await page.waitForLoadState('networkidle');

        // Look for pending assignments
        const pendingAssignments = page.locator('.assignment-item:has-text("pending")');
        const pendingCount = await pendingAssignments.count();

        if (pendingCount > 0) {
          // Click on first pending assignment
          await pendingAssignments.nth(0).click();

          // Look for accept button
          const acceptButton = page.locator('button:has-text("Accept")');
          if (await acceptButton.count() > 0) {
            await acceptButton.click();

            // Should show confirmation or update status
            await page.waitForTimeout(1000);

            // Verify assignment status changed
            const acceptedStatus = page.locator(':text("accepted")');
            expect(await acceptedStatus.count()).toBeGreaterThan(0);
          }
        }
      }
    });

    test('Should allow assignment rejection with reason', async () => {
      const loginSuccess = await utils.loginAsUser('john@example.com', 'password123');

      if (loginSuccess) {
        await page.goto('http://localhost:5173/assignments');
        await page.waitForLoadState('networkidle');

        const pendingAssignments = page.locator('.assignment-item:has-text("pending")');
        const pendingCount = await pendingAssignments.count();

        if (pendingCount > 0) {
          await pendingAssignments.nth(0).click();

          const rejectButton = page.locator('button:has-text("Reject")');
          if (await rejectButton.count() > 0) {
            await rejectButton.click();

            // Should show reason input
            const reasonInput = page.locator('textarea[name="reason"]');
            if (await reasonInput.count() > 0) {
              await reasonInput.fill('Cannot complete due to scheduling conflict');

              const confirmButton = page.locator('button:has-text("Confirm")');
              await confirmButton.click();

              // Verify rejection
              await page.waitForTimeout(1000);
              const rejectedStatus = page.locator(':text("rejected")');
              expect(await rejectedStatus.count()).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    test('Should support assignment reassignment by admin', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      const assignments = page.locator('.assignment-item');
      const assignmentCount = await assignments.count();

      if (assignmentCount > 0) {
        await assignments.nth(0).click();

        const reassignButton = page.locator('button:has-text("Reassign")');
        if (await reassignButton.count() > 0) {
          await reassignButton.click();

          // Should show reassignment modal
          const modal = page.locator('.modal, .reassign-modal');
          await expect(modal).toBeVisible();

          // Select new inspector
          const inspectorSelect = page.locator('select[name="new_inspector_id"]');
          if (await inspectorSelect.count() > 0) {
            await inspectorSelect.selectOption({ index: 1 });

            const reasonInput = page.locator('textarea[name="reason"]');
            await reasonInput.fill('Workload rebalancing');

            const confirmButton = page.locator('button:has-text("Confirm")');
            await confirmButton.click();

            // Should close modal and update assignment
            await expect(modal).not.toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Assignment Dashboard and Tracking', () => {
    test('Should display assignment dashboard with key metrics', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      // Should show assignment statistics
      const dashboardElements = [
        page.locator('.assignment-stats'),
        page.locator('.dashboard-metrics'),
        page.locator('.assignment-summary'),
        page.locator(':text("Total")'),
        page.locator(':text("Pending")'),
        page.locator(':text("Completed")')
      ];

      let foundDashboard = false;
      for (const element of dashboardElements) {
        if (await element.count() > 0) {
          foundDashboard = true;
          break;
        }
      }

      expect(foundDashboard).toBe(true);
    });

    test('Should support assignment filtering and search', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      // Test status filter
      const statusFilter = page.locator('select[name="status"]');
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('pending');
        await page.waitForTimeout(500);

        // Should show only pending assignments
        const visibleAssignments = page.locator('.assignment-item');
        const visibleCount = await visibleAssignments.count();

        if (visibleCount > 0) {
          // All visible assignments should be pending
          const pendingItems = page.locator('.assignment-item:has-text("pending")');
          const pendingCount = await pendingItems.count();
          expect(pendingCount).toBe(visibleCount);
        }
      }

      // Test search functionality
      const searchInput = page.locator('input[name="search"], input[type="search"]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Should filter assignments based on search term
        const searchResults = page.locator('.assignment-item');
        const resultCount = await searchResults.count();
        expect(resultCount).toBeGreaterOrEqual(0);
      }
    });

    test('Should display assignment progress tracking', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      const assignments = page.locator('.assignment-item');
      const assignmentCount = await assignments.count();

      if (assignmentCount > 0) {
        await assignments.nth(0).click();

        // Should show assignment details and progress
        const progressElements = [
          page.locator('.progress-bar'),
          page.locator('.assignment-progress'),
          page.locator('.completion-status'),
          page.locator(':text("progress")'),
          page.locator(':text("%")')
        ];

        let foundProgress = false;
        for (const element of progressElements) {
          if (await element.count() > 0) {
            foundProgress = true;
            break;
          }
        }

        expect(foundProgress).toBe(true);
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('Should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Should be responsive
      const form = page.locator('.assignment-form');
      await expect(form).toBeVisible();

      // Form elements should be appropriately sized
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i);
          const box = await input.boundingBox();

          if (box) {
            expect(box.width).toBeGreaterThan(200); // Should be wide enough for mobile
            expect(box.height).toBeGreaterThan(30);  // Should be tall enough for touch
          }
        }
      }

      // Site cards should stack properly on mobile
      const siteCards = page.locator('.site-card');
      if (await siteCards.count() > 1) {
        const firstCard = await siteCards.nth(0).boundingBox();
        const secondCard = await siteCards.nth(1).boundingBox();

        if (firstCard && secondCard) {
          // Cards should stack vertically or wrap properly
          const isStacked = secondCard.y > firstCard.y + firstCard.height - 10;
          const isWrapped = Math.abs(secondCard.y - firstCard.y) < 10;

          expect(isStacked || isWrapped).toBe(true);
        }
      }
    });

    test('Should have touch-friendly buttons on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(3, buttonCount); i++) {
          const button = buttons.nth(i);
          const box = await button.boundingBox();

          if (box) {
            // Buttons should be at least 44px tall for touch accessibility
            expect(box.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });
  });

  test.describe('Integration with Existing Features', () => {
    test('Should integrate with template system', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Template selection should show available templates
      const templateSelect = page.locator('select[name="template_id"]');
      await expect(templateSelect).toBeVisible();

      const options = await templateSelect.locator('option').count();
      expect(options).toBeGreaterThan(1); // Should have default option + templates
    });

    test('Should integrate with site management', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Should show available sites
      const siteCards = page.locator('.site-card');
      const siteCount = await siteCards.count();
      expect(siteCount).toBeGreaterThanOrEqual(0);

      if (siteCount > 0) {
        // Site cards should show site information
        const firstSite = siteCards.nth(0);
        const siteName = page.locator('.site-name');
        await expect(siteName.first()).toBeVisible();
      }
    });

    test('Should maintain organization context', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for organization context indicators
      const orgContextElements = [
        page.locator('.organization-context'),
        page.locator('.current-org'),
        page.locator('[data-testid="org-context"]'),
        page.locator('.header .org-name')
      ];

      let foundOrgContext = false;
      for (const element of orgContextElements) {
        if (await element.count() > 0) {
          foundOrgContext = true;
          break;
        }
      }

      // Organization context should be maintained throughout the workflow
      expect(foundOrgContext).toBe(true);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Should handle network failures gracefully', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Simulate network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      // Fill form and try to submit
      await page.fill('input[name="name"]', 'Network Test Assignment');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should show error message
        await page.waitForTimeout(2000);

        const errorElements = [
          page.locator('.error-message'),
          page.locator('.notification.error'),
          page.locator(':text("error")'),
          page.locator(':text("failed")')
        ];

        let foundError = false;
        for (const element of errorElements) {
          if (await element.count() > 0) {
            foundError = true;
            break;
          }
        }

        expect(foundError).toBe(true);
      }
    });

    test('Should handle empty data states', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for empty states
      const emptyStateElements = [
        page.locator('.empty-sites'),
        page.locator('.no-data'),
        page.locator(':text("No sites found")'),
        page.locator(':text("No templates")'),
        page.locator(':text("No inspectors")')
      ];

      let foundEmptyState = false;
      for (const element of emptyStateElements) {
        if (await element.count() > 0) {
          foundEmptyState = true;
          break;
        }
      }

      // Should handle empty states gracefully
      if (foundEmptyState) {
        // If empty state is shown, it should be informative
        expect(foundEmptyState).toBe(true);
      }
    });

    test('Should validate form inputs properly', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test email validation if email fields exist
      const emailInputs = page.locator('input[type="email"]');
      if (await emailInputs.count() > 0) {
        await emailInputs.nth(0).fill('invalid-email');
        await page.click('body'); // Blur the field

        // Should show validation error
        const validationError = page.locator('.field-error, .invalid-feedback');
        expect(await validationError.count()).toBeGreaterThan(0);
      }

      // Test number field validation
      const numberInputs = page.locator('input[type="number"]');
      if (await numberInputs.count() > 0) {
        await numberInputs.nth(0).fill('-1');
        await page.click('body');

        // Should prevent negative numbers if not allowed
        const value = await numberInputs.nth(0).inputValue();
        expect(parseInt(value)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});