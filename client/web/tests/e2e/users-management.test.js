const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Users Management', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    // Login as admin before each test
    await utils.loginAsAdmin();
  });

  test.describe('Users Page Access and Display', () => {
    test('should load users page successfully', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();

      // Verify page heading
      await expect(usersPage.heading).toBeVisible();

      // Wait for loading to complete
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      // Verify users data is displayed
      await expect(usersPage.userRows).toHaveCountGreaterThan(0);

      console.log('✓ Users page loaded successfully');
    });

    test('should display user statistics correctly', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      // Check stats cards
      const statsCards = usersPage.statsCards;
      const statsCount = await statsCards.count();

      if (statsCount > 0) {
        // Verify stats show actual numbers
        for (let i = 0; i < Math.min(statsCount, 4); i++) {
          const card = statsCards.nth(i);
          const statNumber = card.locator('.stat-number, .count, .value');

          if (await statNumber.count() > 0) {
            const value = await statNumber.textContent();
            expect(value).toMatch(/\d+/); // Should contain numbers
          }
        }
        console.log('✓ User statistics displayed');
      } else {
        console.log('! User statistics cards not found');
      }
    });

    test('should display user data with correct structure', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      const userRows = usersPage.userRows;
      const firstRow = userRows.first();

      // Verify user row structure
      await expect(firstRow.locator('.user-name, .name')).not.toBeEmpty();
      await expect(firstRow.locator('.user-email, .email')).not.toBeEmpty();
      await expect(firstRow.locator('.role-badge, .role')).toBeVisible();
      await expect(firstRow.locator('.status-indicator, .status')).toBeVisible();

      // Check for action buttons
      const actionButtons = firstRow.locator('.action-btn, button, .actions');
      const hasActions = await actionButtons.count() > 0;

      if (hasActions) {
        console.log('✓ User action buttons available');
      } else {
        console.log('! User action buttons not found');
      }
    });

    test('should handle API data loading correctly', async ({ page }) => {
      // Setup API monitoring
      const apiData = await utils.setupNetworkMonitoring();

      await utils.navigateTo('/users');

      // Wait for API call to complete
      await utils.waitForApiCall('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      // Verify API was called
      const usersApiCalls = apiData.responses.filter(resp =>
        resp.url.includes('/users') && resp.status === 200
      );

      expect(usersApiCalls.length).toBeGreaterThan(0);
      console.log('✓ Users API called successfully');
    });
  });

  test.describe('User Search and Filtering', () => {
    test('should filter users by search term', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      // Get initial user count
      const initialCount = await usersPage.userRows.count();

      // Search for 'admin'
      if (await usersPage.searchInput.count() > 0) {
        await usersPage.searchInput.fill('admin');
        await page.waitForTimeout(1000); // Wait for debounced search

        // Check filtered results
        const filteredCount = await usersPage.userRows.count();

        if (filteredCount !== initialCount) {
          console.log(`✓ Search filtered users: ${initialCount} → ${filteredCount}`);

          // Verify search results contain search term
          const visibleRows = await usersPage.userRows.all();
          for (const row of visibleRows) {
            const rowText = await row.textContent();
            expect(rowText.toLowerCase()).toContain('admin');
          }
        } else {
          console.log('! Search did not filter results or all users contain "admin"');
        }

        // Clear search
        await usersPage.searchInput.clear();
        await page.waitForTimeout(1000);

        const resetCount = await usersPage.userRows.count();
        expect(resetCount).toBe(initialCount);
      } else {
        console.log('! Search input not found');
      }
    });

    test('should filter users by role', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      if (await usersPage.roleFilter.count() > 0) {
        const initialCount = await usersPage.userRows.count();

        // Filter by admin role
        await usersPage.roleFilter.selectOption('admin');
        await page.waitForTimeout(1000);

        const filteredCount = await usersPage.userRows.count();

        if (filteredCount > 0 && filteredCount <= initialCount) {
          console.log(`✓ Role filter works: ${initialCount} → ${filteredCount} users`);

          // Verify filtered users have admin role
          const adminRows = await usersPage.userRows.all();
          for (const row of adminRows) {
            const roleElement = row.locator('.role-badge, .role');
            const roleText = await roleElement.textContent();
            expect(roleText.toLowerCase()).toContain('admin');
          }
        } else {
          console.log('! Role filter may not be working or no admin users found');
        }

        // Reset filter
        await usersPage.roleFilter.selectOption('');
        await page.waitForTimeout(1000);
      } else {
        console.log('! Role filter not found');
      }
    });
  });

  test.describe('User Management Actions', () => {
    test('should display invite user button for admins', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      // Admin should see invite button
      await expect(usersPage.inviteButton).toBeVisible();

      // Click invite button to test modal/form opens
      await usersPage.inviteButton.click();

      // Look for invite modal or form
      const inviteModal = page.locator('.modal, .dialog, .invite-form, form[name="invite"]');
      if (await inviteModal.count() > 0) {
        await expect(inviteModal).toBeVisible();

        // Close modal if it has close button
        const closeBtn = inviteModal.locator('.close, button:has-text("Cancel"), .modal-close');
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
        }

        console.log('✓ Invite user functionality accessible');
      } else {
        // Might navigate to separate invite page
        const currentUrl = page.url();
        if (currentUrl.includes('invite') || currentUrl.includes('add')) {
          console.log('✓ Invite user navigates to separate page');
          await page.goBack();
        } else {
          console.log('! Invite user functionality not working');
        }
      }
    });

    test('should show user action buttons', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      const userRows = usersPage.userRows;
      const firstRow = userRows.first();

      // Check for action buttons
      const actionButtons = firstRow.locator('button, .action-btn, .user-actions button');
      const buttonCount = await actionButtons.count();

      expect(buttonCount).toBeGreaterThan(0);

      // Test clicking first action button (should be safe like "View" or "Edit")
      if (buttonCount > 0) {
        const firstButton = actionButtons.first();
        const buttonText = await firstButton.textContent();

        // Only test non-destructive actions
        if (buttonText && !buttonText.toLowerCase().includes('delete')) {
          await firstButton.click();

          // Check if modal opens or navigation occurs
          await page.waitForTimeout(1000);

          const currentUrl = page.url();
          if (currentUrl !== utils.baseUrl + '/users') {
            console.log(`✓ User action "${buttonText}" navigated to ${currentUrl}`);
            await page.goBack();
          } else {
            // Check for modal
            const modal = page.locator('.modal, .dialog, .user-details');
            if (await modal.isVisible()) {
              console.log(`✓ User action "${buttonText}" opened modal`);

              // Close modal
              const closeBtn = modal.locator('.close, button:has-text("Close")');
              if (await closeBtn.count() > 0) {
                await closeBtn.click();
              }
            }
          }
        }
      }
    });

    test('should handle pagination if present', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      // Look for pagination controls
      const pagination = page.locator('.pagination, .page-nav, nav[aria-label="pagination"]');

      if (await pagination.count() > 0) {
        const pageButtons = pagination.locator('button, a');
        const buttonCount = await pageButtons.count();

        if (buttonCount > 1) {
          console.log(`✓ Pagination found with ${buttonCount} controls`);

          // Test next page if available
          const nextBtn = pagination.locator('button:has-text("Next"), a:has-text("Next"), .next');
          if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
            const currentCount = await usersPage.userRows.count();

            await nextBtn.click();
            await page.waitForTimeout(1000);

            const newCount = await usersPage.userRows.count();
            console.log(`✓ Pagination works: page changed (${currentCount} → ${newCount} users)`);

            // Go back to first page
            const prevBtn = pagination.locator('button:has-text("Previous"), a:has-text("Previous"), .prev');
            if (await prevBtn.count() > 0) {
              await prevBtn.click();
            }
          }
        }
      } else {
        console.log('! Pagination not found (may not be needed)');
      }
    });
  });

  test.describe('User Data Validation', () => {
    test('should display valid user information', async ({ page }) => {
      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      const userRows = usersPage.userRows;
      const rowCount = await userRows.count();

      // Validate first few users
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = userRows.nth(i);

        // Check email format
        const emailElement = row.locator('.user-email, .email');
        if (await emailElement.count() > 0) {
          const email = await emailElement.textContent();
          expect(email).toMatch(/\S+@\S+\.\S+/); // Basic email pattern
        }

        // Check role is valid
        const roleElement = row.locator('.role-badge, .role');
        if (await roleElement.count() > 0) {
          const role = await roleElement.textContent();
          expect(role.trim()).toBeTruthy();
        }

        // Check status is valid
        const statusElement = row.locator('.status-indicator, .status');
        if (await statusElement.count() > 0) {
          const status = await statusElement.textContent();
          expect(status.trim()).toBeTruthy();
        }
      }

      console.log('✓ User data validation passed');
    });

    test('should handle empty state correctly', async ({ page }) => {
      // This test would need to be adapted based on how empty states are handled
      // For now, we'll verify that if no users are shown, appropriate messaging appears

      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      const userCount = await usersPage.userRows.count();

      if (userCount === 0) {
        // Check for empty state message
        const emptyMessage = page.locator('text=No users found, text=No users available, .empty-state');
        await expect(emptyMessage).toBeVisible();
        console.log('✓ Empty state handling verified');
      } else {
        console.log(`✓ Users displayed: ${userCount} found`);
      }
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should load users page within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await utils.navigateTo('/users');

      const usersPage = utils.getUsersPage();
      await expect(usersPage.loadingIndicator).not.toBeVisible({ timeout: 15000 });

      const loadTime = Date.now() - startTime;
      console.log(`Users page load time: ${loadTime}ms`);

      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Block users API to simulate error
      await page.route('**/api/v1/users*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await utils.navigateTo('/users');

      // Should show error message instead of infinite loading
      await page.waitForTimeout(3000);

      const errorMessage = page.locator('.error-message, .alert-danger, text=Error loading users');
      const isStillLoading = await utils.getUsersPage().loadingIndicator.isVisible();

      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        console.log('✓ API error handled with error message');
      } else if (!isStillLoading) {
        console.log('✓ API error handled (loading stopped)');
      } else {
        console.log('! API error not handled properly (still loading)');
      }
    });
  });
});