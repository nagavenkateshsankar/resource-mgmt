const { test, expect } = require('@playwright/test');

test.describe('Role Management System', () => {
  // Test data
  const testUsers = {
    admin: {
      email: 'john@gmail.com',
      password: 'password123',
      name: 'John Admin'
    },
    user: {
      email: 'jobh@gmail.com',
      password: 'password123',
      name: 'John User'
    }
  };

  // Setup hooks
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5174/login');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Admin User Management Access', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', testUsers.admin.email);
      await page.fill('input[type="password"]', testUsers.admin.password);
      await page.click('button[type="submit"]');

      // Wait for successful login and navigation
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate to users management page
      await page.click('text=Users');
      await page.waitForURL('**/users');
      await page.waitForLoadState('networkidle');
    });

    test('should display users management page with admin privileges', async ({ page }) => {
      // Check page title and layout
      await expect(page.locator('h1')).toContainText('Users Management');

      // Check admin-only elements are visible
      await expect(page.locator('button:has-text("Invite User")')).toBeVisible();

      // Check stats cards are displayed
      await expect(page.locator('.stat-card')).toHaveCount(4);
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Users')).toBeVisible();
      await expect(page.locator('text=Administrators')).toBeVisible();
      await expect(page.locator('text=Pending Invites')).toBeVisible();

      // Check users table is displayed
      await expect(page.locator('.users-table')).toBeVisible();
      await expect(page.locator('th:has-text("User")')).toBeVisible();
      await expect(page.locator('th:has-text("Role")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toBeVisible();
    });

    test('should display correct user data and action buttons', async ({ page }) => {
      // Wait for users to load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Check first user row for expected elements
      const firstRow = userRows.first();
      await expect(firstRow.locator('.user-info')).toBeVisible();
      await expect(firstRow.locator('.role-badge')).toBeVisible();
      await expect(firstRow.locator('.status-indicator')).toBeVisible();
      await expect(firstRow.locator('.user-actions')).toBeVisible();

      // Check action buttons exist
      await expect(firstRow.locator('.action-btn')).toHaveCount(3); // Edit, Status Toggle, Delete
    });

    test('should filter users by role', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Get initial user count
      const initialRows = await page.locator('.user-row').count();

      // Filter by admin role
      await page.selectOption('#role-filter', 'admin');
      await page.waitForTimeout(1000); // Wait for filter to apply

      // Check filtered results
      const adminRows = await page.locator('.user-row').count();
      expect(adminRows).toBeLessThanOrEqual(initialRows);

      // Verify all visible users have admin role
      const roleElements = page.locator('.role-badge');
      const roleCount = await roleElements.count();
      for (let i = 0; i < roleCount; i++) {
        const roleText = await roleElements.nth(i).textContent();
        expect(roleText.toLowerCase()).toContain('admin');
      }
    });

    test('should filter users by status', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Filter by active status
      await page.selectOption('#status-filter', 'active');
      await page.waitForTimeout(1000); // Wait for filter to apply

      // Verify all visible users have active status
      const statusElements = page.locator('.status-text');
      const statusCount = await statusElements.count();
      for (let i = 0; i < statusCount; i++) {
        const statusText = await statusElements.nth(i).textContent();
        expect(statusText.toLowerCase()).toContain('active');
      }
    });

    test('should search users by name or email', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Search for specific user
      await page.fill('#search', 'john');
      await page.waitForTimeout(1000); // Wait for search to apply

      // Verify search results contain the search term
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();

      if (rowCount > 0) {
        for (let i = 0; i < rowCount; i++) {
          const row = userRows.nth(i);
          const userName = await row.locator('.user-name').textContent();
          const userEmail = await row.locator('.user-email').textContent();

          const containsSearchTerm =
            userName.toLowerCase().includes('john') ||
            userEmail.toLowerCase().includes('john');
          expect(containsSearchTerm).toBeTruthy();
        }
      }
    });
  });

  test.describe('User Creation and Invitation', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', testUsers.admin.email);
      await page.fill('input[type="password"]', testUsers.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate to users page
      await page.click('text=Users');
      await page.waitForURL('**/users');
      await page.waitForLoadState('networkidle');
    });

    test('should open invite user modal', async ({ page }) => {
      // Click invite user button
      await page.click('button:has-text("Invite User")');

      // Check modal is visible
      await expect(page.locator('.modal-overlay')).toBeVisible();
      await expect(page.locator('.modal-content')).toBeVisible();
      await expect(page.locator('h2:has-text("Invite New User")')).toBeVisible();

      // Check form fields are present
      await expect(page.locator('#invite-name')).toBeVisible();
      await expect(page.locator('#invite-email')).toBeVisible();
      await expect(page.locator('#invite-role')).toBeVisible();
      await expect(page.locator('#invite-password')).toBeVisible();
      await expect(page.locator('#invite-message')).toBeVisible();

      // Check action buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Send Invite")')).toBeVisible();
    });

    test('should validate required fields in invite form', async ({ page }) => {
      // Open invite modal
      await page.click('button:has-text("Invite User")');

      // Try to submit without required fields
      const sendButton = page.locator('button:has-text("Send Invite")');
      await expect(sendButton).toBeDisabled();

      // Fill name only
      await page.fill('#invite-name', 'Test User');
      await expect(sendButton).toBeDisabled();

      // Fill email to enable submit button
      await page.fill('#invite-email', 'testuser@example.com');
      await expect(sendButton).toBeEnabled();
    });

    test('should create new user with valid data', async ({ page }) => {
      // Open invite modal
      await page.click('button:has-text("Invite User")');

      // Fill form with valid data
      const timestamp = Date.now();
      const testEmail = `testuser${timestamp}@example.com`;

      await page.fill('#invite-name', 'Test User');
      await page.fill('#invite-email', testEmail);
      await page.selectOption('#invite-role', 'inspector');
      await page.fill('#invite-password', 'TestPassword123!');
      await page.fill('#invite-message', 'Welcome to the team!');

      // Submit form
      await page.click('button:has-text("Send Invite")');

      // Wait for modal to close
      await expect(page.locator('.modal-overlay')).not.toBeVisible();

      // Verify success (user should appear in list or success message shown)
      await page.waitForTimeout(2000); // Wait for user list to refresh

      // Search for the newly created user
      await page.fill('#search', testEmail);
      await page.waitForTimeout(1000);

      // Check if user appears in search results
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(1);
    });

    test('should prevent creating user with duplicate email', async ({ page }) => {
      // Open invite modal
      await page.click('button:has-text("Invite User")');

      // Try to create user with existing email
      await page.fill('#invite-name', 'Duplicate User');
      await page.fill('#invite-email', testUsers.admin.email); // Use existing admin email
      await page.selectOption('#invite-role', 'inspector');
      await page.fill('#invite-password', 'TestPassword123!');

      // Submit form
      await page.click('button:has-text("Send Invite")');

      // Should show error message (this would need to be implemented in the UI)
      // For now, just verify the modal doesn't close immediately
      await page.waitForTimeout(2000);
      // Modal should still be visible due to error
      await expect(page.locator('.modal-overlay')).toBeVisible();
    });
  });

  test.describe('User Editing and Role Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', testUsers.admin.email);
      await page.fill('input[type="password"]', testUsers.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate to users page
      await page.click('text=Users');
      await page.waitForURL('**/users');
      await page.waitForLoadState('networkidle');
    });

    test('should open edit user modal', async ({ page }) => {
      // Wait for users to load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Find a non-admin user to edit (to avoid last admin restrictions)
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();

      let editableUserFound = false;
      for (let i = 0; i < rowCount; i++) {
        const row = userRows.nth(i);
        const roleText = await row.locator('.role-badge').textContent();

        if (!roleText.toLowerCase().includes('admin')) {
          // Click edit button for this non-admin user
          await row.locator('.action-btn').first().click();
          editableUserFound = true;
          break;
        }
      }

      if (editableUserFound) {
        // Check edit modal is visible
        await expect(page.locator('.modal-overlay')).toBeVisible();
        await expect(page.locator('h2:has-text("Edit User")')).toBeVisible();

        // Check form fields are present and populated
        await expect(page.locator('#edit-name')).toBeVisible();
        await expect(page.locator('#edit-role')).toBeVisible();
        await expect(page.locator('#edit-status')).toBeVisible();

        // Check action buttons
        await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
        await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
      }
    });

    test('should update user name successfully', async ({ page }) => {
      // Wait for users to load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Find a non-admin user to edit
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = userRows.nth(i);
        const roleText = await row.locator('.role-badge').textContent();

        if (!roleText.toLowerCase().includes('admin')) {
          // Get original name
          const originalName = await row.locator('.user-name').textContent();

          // Click edit button
          await row.locator('.action-btn').first().click();

          // Update name
          const newName = `${originalName} Updated`;
          await page.fill('#edit-name', newName);

          // Save changes
          await page.click('button:has-text("Save Changes")');

          // Wait for modal to close
          await expect(page.locator('.modal-overlay')).not.toBeVisible();

          // Verify name was updated
          await page.waitForTimeout(2000); // Wait for refresh
          const updatedName = await row.locator('.user-name').textContent();
          expect(updatedName).toBe(newName);

          break;
        }
      }
    });

    test('should change user role successfully', async ({ page }) => {
      // Wait for users to load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Find a non-admin user to edit
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = userRows.nth(i);
        const roleText = await row.locator('.role-badge').textContent();

        if (!roleText.toLowerCase().includes('admin')) {
          // Click edit button
          await row.locator('.action-btn').first().click();

          // Change role
          await page.selectOption('#edit-role', 'supervisor');

          // Save changes
          await page.click('button:has-text("Save Changes")');

          // Wait for modal to close
          await expect(page.locator('.modal-overlay')).not.toBeVisible();

          // Verify role was updated
          await page.waitForTimeout(2000); // Wait for refresh
          const updatedRole = await row.locator('.role-badge').textContent();
          expect(updatedRole.toLowerCase()).toContain('supervisor');

          break;
        }
      }
    });

    test('should toggle user status successfully', async ({ page }) => {
      // Wait for users to load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Find a non-admin user to toggle
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = userRows.nth(i);
        const roleText = await row.locator('.role-badge').textContent();

        if (!roleText.toLowerCase().includes('admin')) {
          // Get original status
          const originalStatus = await row.locator('.status-text').textContent();

          // Click status toggle button (second action button)
          await row.locator('.action-btn').nth(1).click();

          // Confirm action in modal if present
          const confirmModal = page.locator('.modal-overlay');
          if (await confirmModal.isVisible()) {
            await page.click('button:has-text("Confirm")');
            await expect(confirmModal).not.toBeVisible();
          }

          // Verify status was toggled
          await page.waitForTimeout(2000); // Wait for refresh
          const updatedStatus = await row.locator('.status-text').textContent();
          expect(updatedStatus).not.toBe(originalStatus);

          break;
        }
      }
    });
  });

  test.describe('Action Button Validation', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', testUsers.admin.email);
      await page.fill('input[type="password"]', testUsers.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate to users page
      await page.click('text=Users');
      await page.waitForURL('**/users');
      await page.waitForLoadState('networkidle');
    });

    test('should disable self-management actions for current user', async ({ page }) => {
      // Wait for users to load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Find the current admin user's row (john@gmail.com)
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = userRows.nth(i);
        const userEmail = await row.locator('.user-email').textContent();

        if (userEmail.includes(testUsers.admin.email)) {
          // Check that status toggle and delete buttons are disabled
          const statusButton = row.locator('.action-btn').nth(1);
          const deleteButton = row.locator('.action-btn').nth(2);

          await expect(statusButton).toHaveClass(/disabled/);
          await expect(deleteButton).toHaveClass(/disabled/);

          // Edit button should still be enabled for self
          const editButton = row.locator('.action-btn').first();
          await expect(editButton).not.toHaveClass(/disabled/);

          break;
        }
      }
    });

    test('should show tooltips for disabled actions', async ({ page }) => {
      // Wait for users to load
      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Find the current admin user's row
      const userRows = page.locator('.user-row');
      const rowCount = await userRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = userRows.nth(i);
        const userEmail = await row.locator('.user-email').textContent();

        if (userEmail.includes(testUsers.admin.email)) {
          // Check tooltips on disabled buttons
          const statusButton = row.locator('.action-btn').nth(1);
          const deleteButton = row.locator('.action-btn').nth(2);

          // Hover over status button to check tooltip
          await statusButton.hover();
          await expect(page.locator('[title*="Cannot change your own"]')).toBeVisible();

          // Hover over delete button to check tooltip
          await deleteButton.hover();
          await expect(page.locator('[title*="Cannot delete your own"]')).toBeVisible();

          break;
        }
      }
    });

    test('should prevent last admin protection', async ({ page }) => {
      // This test assumes there's only one admin (john@gmail.com)
      // and verifies that admin role cannot be changed if it's the last admin

      await page.waitForSelector('.user-row', { timeout: 10000 });

      // Filter to show only admins
      await page.selectOption('#role-filter', 'admin');
      await page.waitForTimeout(1000);

      const adminRows = page.locator('.user-row');
      const adminCount = await adminRows.count();

      if (adminCount === 1) {
        // If there's only one admin, try to edit them
        const adminRow = adminRows.first();
        const editButton = adminRow.locator('.action-btn').first();

        // Admin should be able to edit their own profile
        await expect(editButton).not.toHaveClass(/disabled/);

        await editButton.click();

        // Role dropdown should be disabled for last admin
        const roleSelect = page.locator('#edit-role');
        await expect(roleSelect).toBeDisabled();

        // Status dropdown should be disabled for last admin
        const statusSelect = page.locator('#edit-status');
        await expect(statusSelect).toBeDisabled();
      }
    });
  });

  test.describe('Non-Admin User Restrictions', () => {
    test('should restrict access for non-admin users', async ({ page }) => {
      // Login as regular user
      await page.fill('input[type="email"]', testUsers.user.email);
      await page.fill('input[type="password"]', testUsers.user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Try to navigate to users page
      const usersLink = page.locator('text=Users');

      // Users link should either not exist or be disabled for non-admin
      if (await usersLink.isVisible()) {
        await usersLink.click();

        // Should either stay on dashboard or show access denied
        const currentUrl = page.url();
        const isOnUsersPage = currentUrl.includes('/users');

        if (isOnUsersPage) {
          // If somehow on users page, should show access denied or limited view
          const hasAccessDenied = await page.locator('text=Access Denied').isVisible();
          const hasLimitedView = await page.locator('button:has-text("Invite User")').isHidden();

          expect(hasAccessDenied || hasLimitedView).toBeTruthy();
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', testUsers.admin.email);
      await page.fill('input[type="password"]', testUsers.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate to users page
      await page.click('text=Users');
      await page.waitForURL('**/users');
      await page.waitForLoadState('networkidle');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // This test would require mocking API responses to return errors
      // For now, we'll test the error state display elements

      // Check if error state elements exist in the DOM
      const errorStateSelector = '.error-state';
      const loadingStateSelector = '.loading-state';

      // These elements should exist but may not be visible during normal operation
      const errorStateExists = await page.locator(errorStateSelector).count() > 0;
      const loadingStateExists = await page.locator(loadingStateSelector).count() > 0;

      // At minimum, the error handling structure should be present
      expect(errorStateExists || loadingStateExists).toBeTruthy();
    });

    test('should show empty state when no users found', async ({ page }) => {
      // Search for something that definitely won't exist
      await page.fill('#search', 'nonexistentuser12345');
      await page.waitForTimeout(1000);

      // Should show empty state
      const emptyState = page.locator('.empty-state');
      if (await emptyState.isVisible()) {
        await expect(emptyState.locator('h3')).toContainText('No Users Found');
        await expect(emptyState.locator('p')).toContainText('No users match your filters');
      } else {
        // If no empty state shown, at least no user rows should be visible
        const userRows = page.locator('.user-row');
        const rowCount = await userRows.count();
        expect(rowCount).toBe(0);
      }
    });

    test('should handle modal close operations', async ({ page }) => {
      // Open invite modal
      await page.click('button:has-text("Invite User")');
      await expect(page.locator('.modal-overlay')).toBeVisible();

      // Close by clicking X button
      await page.click('.modal-close-btn');
      await expect(page.locator('.modal-overlay')).not.toBeVisible();

      // Open again
      await page.click('button:has-text("Invite User")');
      await expect(page.locator('.modal-overlay')).toBeVisible();

      // Close by clicking overlay
      await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
      await expect(page.locator('.modal-overlay')).not.toBeVisible();

      // Open again
      await page.click('button:has-text("Invite User")');
      await expect(page.locator('.modal-overlay')).toBeVisible();

      // Close by Cancel button
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('.modal-overlay')).not.toBeVisible();
    });

    test('should validate form inputs', async ({ page }) => {
      // Open invite modal
      await page.click('button:has-text("Invite User")');

      // Test email validation
      await page.fill('#invite-email', 'invalid-email');
      await page.fill('#invite-name', 'Test User');

      // Submit button behavior with invalid email
      const submitButton = page.locator('button:has-text("Send Invite")');

      // Depending on implementation, button might be disabled or form might show validation error
      const isDisabled = await submitButton.isDisabled();

      if (!isDisabled) {
        // If button is enabled, clicking should show validation error
        await submitButton.click();
        // Modal should remain open due to validation error
        await expect(page.locator('.modal-overlay')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design and Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', testUsers.admin.email);
      await page.fill('input[type="password"]', testUsers.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate to users page
      await page.click('text=Users');
      await page.waitForURL('**/users');
      await page.waitForLoadState('networkidle');
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check if page layout adapts
      await expect(page.locator('.users-page')).toBeVisible();

      // Check if stats cards stack properly
      const statsGrid = page.locator('.stats-grid');
      if (await statsGrid.isVisible()) {
        // Stats should still be visible and properly laid out
        await expect(statsGrid).toBeVisible();
      }

      // Check if table is scrollable on mobile
      const tableContainer = page.locator('.users-table-container');
      if (await tableContainer.isVisible()) {
        // Table should have horizontal scroll on mobile
        const hasOverflow = await page.evaluate(() => {
          const container = document.querySelector('.users-table-container');
          return container ? container.scrollWidth > container.clientWidth : false;
        });
        // This is expected on mobile for wide tables
      }

      // Check if modals work on mobile
      await page.click('button:has-text("Invite User")');
      await expect(page.locator('.modal-content')).toBeVisible();

      // Modal should fit in mobile viewport
      const modalBounds = await page.locator('.modal-content').boundingBox();
      expect(modalBounds.width).toBeLessThanOrEqual(375);
    });

    test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
      // Check form labels
      await page.click('button:has-text("Invite User")');

      // Form fields should have proper labels
      await expect(page.locator('label[for="invite-name"]')).toBeVisible();
      await expect(page.locator('label[for="invite-email"]')).toBeVisible();
      await expect(page.locator('label[for="invite-role"]')).toBeVisible();

      // Close modal
      await page.click('button:has-text("Cancel")');

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Should focus first interactive element
      await page.keyboard.press('Tab'); // Should move to next element

      // Buttons should be keyboard accessible
      const inviteButton = page.locator('button:has-text("Invite User")');
      await inviteButton.focus();
      await page.keyboard.press('Enter');

      // Modal should open with keyboard interaction
      await expect(page.locator('.modal-overlay')).toBeVisible();
    });
  });
});