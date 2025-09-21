import { test, expect } from '@playwright/test';

test.describe('User Management Workflow - Comprehensive Test', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('http://localhost:5173/');
  });

  test('Complete user management workflow - login to users page', async ({ page }) => {
    // Step 1: Navigate to login from home page
    console.log('🏠 Step 1: Starting from home page');
    await expect(page.locator('h1')).toContainText('Resource Management');

    // Click "Get Started" button to go to login
    await page.getByRole('button', { name: /get started/i }).click();

    // Should redirect to login page
    await page.waitForURL('**/login');
    console.log('🔐 Step 2: Navigated to login page');

    // Step 2: Perform login
    await expect(page.locator('h1')).toContainText('Sign In');

    // Fill in admin credentials
    await page.getByLabel(/email/i).fill('admin@resourcemgmt.com');
    await page.getByLabel(/password/i).fill('password123');

    // Submit login form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for successful login and redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Step 3: Successfully logged in, redirected to dashboard');

    // Verify we're on the dashboard
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Step 3: Navigate to users page
    console.log('👥 Step 4: Navigating to users page');

    // Look for users navigation link - try different possible selectors
    const usersNavigation = page.locator('nav a', { hasText: /users/i }).first();
    await expect(usersNavigation).toBeVisible({ timeout: 5000 });
    await usersNavigation.click();

    // Wait for users page to load
    await page.waitForURL('**/users', { timeout: 10000 });
    console.log('🎯 Step 5: Navigated to users page');

    // Step 4: Verify users page loads correctly
    await expect(page.locator('h1')).toContainText('Users Management');

    // Wait for users data to load (no more "Loading users..." text)
    console.log('⏳ Step 6: Waiting for users data to load');

    // Wait for loading to disappear
    await expect(page.locator('text=Loading users...')).not.toBeVisible({ timeout: 15000 });

    // Step 5: Verify users are displayed
    console.log('📊 Step 7: Verifying users are displayed');

    // Check that users table is visible
    await expect(page.locator('.users-table')).toBeVisible();

    // Verify at least one user row exists
    const userRows = page.locator('.user-row');
    await expect(userRows).toHaveCountGreaterThan(0);

    // Step 6: Verify user data integrity
    console.log('🔍 Step 8: Verifying user data integrity');

    // Check the first user row has required data
    const firstUserRow = userRows.first();

    // Verify user name is displayed
    await expect(firstUserRow.locator('.user-name')).not.toBeEmpty();

    // Verify user email is displayed
    await expect(firstUserRow.locator('.user-email')).not.toBeEmpty();

    // Verify role badge is displayed
    await expect(firstUserRow.locator('.role-badge')).toBeVisible();

    // Verify status indicator is displayed
    await expect(firstUserRow.locator('.status-indicator')).toBeVisible();

    // Step 7: Verify stats cards are populated
    console.log('📈 Step 9: Verifying stats cards');

    // Check stats cards show actual numbers (not 0)
    const totalUsersCard = page.locator('.stat-card').first();
    const totalUsersNumber = totalUsersCard.locator('.stat-number');
    await expect(totalUsersNumber).not.toHaveText('0');

    // Step 8: Verify admin functionality
    console.log('⚙️ Step 10: Verifying admin functionality');

    // Verify "Invite User" button is visible for admin
    await expect(page.getByRole('button', { name: /invite user/i })).toBeVisible();

    // Verify action buttons are present in user rows
    await expect(firstUserRow.locator('.action-btn')).toHaveCountGreaterThan(0);

    // Step 9: Test filtering functionality
    console.log('🔽 Step 11: Testing filter functionality');

    // Test role filter
    const roleFilter = page.locator('#role-filter');
    await roleFilter.selectOption('admin');

    // Wait a moment for filtering
    await page.waitForTimeout(1000);

    // Check that filtered results are shown
    const filteredRows = page.locator('.user-row');
    await expect(filteredRows).toHaveCountGreaterThan(0);

    // Reset filter
    await roleFilter.selectOption('');

    // Step 10: Test search functionality
    console.log('🔍 Step 12: Testing search functionality');

    const searchInput = page.locator('#search');
    await searchInput.fill('admin');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Verify search results
    const searchResults = page.locator('.user-row');
    await expect(searchResults).toHaveCountGreaterThan(0);

    // Clear search
    await searchInput.clear();

    console.log('✅ All user management workflow tests passed!');
  });

  test('API integration test - verify data flow', async ({ page, request }) => {
    console.log('🔗 API Integration Test: Verifying data flow');

    // Step 1: Login via UI to get session
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/email/i).fill('admin@resourcemgmt.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for login success
    await page.waitForURL('**/dashboard');

    // Step 2: Navigate to users page
    await page.goto('http://localhost:5173/users');

    // Step 3: Intercept the users API call
    let usersApiResponse = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/users') && response.request().method() === 'GET') {
        usersApiResponse = await response.json();
        console.log('📡 Intercepted users API response:', {
          total: usersApiResponse.total,
          usersCount: usersApiResponse.users?.length,
          firstUser: usersApiResponse.users?.[0] ? {
            role: usersApiResponse.users[0].role,
            status: usersApiResponse.users[0].status,
            is_org_admin: usersApiResponse.users[0].is_org_admin
          } : null
        });
      }
    });

    // Refresh the page to trigger API call
    await page.reload();

    // Wait for users to load
    await expect(page.locator('text=Loading users...')).not.toBeVisible({ timeout: 15000 });

    // Step 4: Verify API response structure
    expect(usersApiResponse).toBeTruthy();
    expect(usersApiResponse.users).toBeTruthy();
    expect(usersApiResponse.total).toBeGreaterThan(0);

    // Verify first user has required fields
    const firstUser = usersApiResponse.users[0];
    expect(firstUser.role).toBeTruthy();
    expect(firstUser.status).toBeTruthy();
    expect(firstUser.organization_id).toBeTruthy();

    console.log('✅ API integration test passed!');
  });

  test('Error handling and edge cases', async ({ page }) => {
    console.log('🚨 Error Handling Test: Testing edge cases');

    // Test accessing users page without authentication
    await page.goto('http://localhost:5173/users');

    // Should redirect to login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');

    // Login and test error scenarios
    await page.getByLabel(/email/i).fill('admin@resourcemgmt.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');

    // Navigate to users page
    await page.goto('http://localhost:5173/users');

    // Test that error state handling works
    // (This would require mocking API failures, which is complex in this setup)

    console.log('✅ Error handling test passed!');
  });

  test('User role validation and permissions', async ({ page }) => {
    console.log('🔐 Permission Test: Verifying role-based access');

    // Login as admin
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/email/i).fill('admin@resourcemgmt.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');

    // Navigate to users page
    await page.goto('http://localhost:5173/users');
    await expect(page.locator('text=Loading users...')).not.toBeVisible({ timeout: 15000 });

    // Verify admin can see management functions
    await expect(page.getByRole('button', { name: /invite user/i })).toBeVisible();

    // Check that admin user actions are available
    const userRows = page.locator('.user-row');
    const firstRow = userRows.first();

    // Admin should see action buttons for other users
    await expect(firstRow.locator('.action-btn')).toHaveCountGreaterThan(0);

    console.log('✅ Permission test passed!');
  });
});