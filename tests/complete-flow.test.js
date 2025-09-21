const { test, expect } = require('@playwright/test');

test.describe('Complete Login and Modal Flow @smoke', () => {
  test('complete login and modal flow with demo credentials', async ({ page }) => {
    console.log('🔍 Starting complete flow test...');
    
    // Navigate to the app
    await page.goto('http://localhost:5432');
    console.log('✅ Navigated to app');
    
    // Wait for login screen to be visible
    await page.waitForSelector('#login-screen', { state: 'visible', timeout: 10000 });
    console.log('✅ Login screen is visible');
    
    // Check that app container is hidden initially
    const appContainer = page.locator('#app');
    await expect(appContainer).toHaveCSS('display', 'none');
    console.log('✅ App container is hidden (as expected)');
    
    // Fill in login credentials
    await page.fill('#email', 'admin@resourcemgmt.com');
    await page.fill('#password', 'password123');
    console.log('✅ Filled login credentials');
    
    // Submit login form
    await page.click('#login-btn');
    console.log('✅ Clicked login button');
    
    // Wait for login to complete and app to show
    await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
    console.log('✅ App container is now visible after login');
    
    // Verify login screen is hidden
    const loginScreen = page.locator('#login-screen');
    await expect(loginScreen).toHaveCSS('display', 'none');
    console.log('✅ Login screen is hidden after successful login');
    
    // Wait for dashboard to load
    await page.waitForSelector('#dashboard-page.active', { timeout: 10000 });
    console.log('✅ Dashboard page is active');
    
    // Look for New Inspection button
    const newInspectionBtn = page.locator('#new-inspection-btn');
    await expect(newInspectionBtn).toBeVisible();
    console.log('✅ New Inspection button is visible');
    
    // Click New Inspection button to trigger modal
    await newInspectionBtn.click();
    console.log('✅ Clicked New Inspection button');
    
    // Wait for template selection modal to appear
    await page.waitForSelector('#template-selection-modal', { state: 'visible', timeout: 5000 });
    console.log('✅ Template selection modal is visible');
    
    // Verify modal overlay is visible
    const modalOverlay = page.locator('#modal-overlay');
    await expect(modalOverlay).toBeVisible();
    console.log('✅ Modal overlay is visible');
    
    // Check for template categories
    const safetySection = page.locator('.template-category:has-text("Safety")');
    await expect(safetySection).toBeVisible();
    console.log('✅ Safety template category is visible');
    
    const equipmentSection = page.locator('.template-category:has-text("Equipment")');
    await expect(equipmentSection).toBeVisible();
    console.log('✅ Equipment template category is visible');
    
    // Check for template cards
    const safetyTemplate = page.locator('.template-card:has-text("General Safety Inspection")');
    await expect(safetyTemplate).toBeVisible();
    console.log('✅ General Safety Inspection template card is visible');
    
    // Select a template
    await safetyTemplate.click();
    console.log('✅ Clicked on General Safety Inspection template');
    
    // Verify inspection form page becomes active
    await page.waitForSelector('#inspection-form-page.active', { timeout: 5000 });
    console.log('✅ Inspection form page is now active');
    
    // Verify modal is closed
    await expect(page.locator('#template-selection-modal')).not.toBeVisible();
    console.log('✅ Template selection modal is closed');
    
    // Check form fields are populated
    await page.waitForSelector('.form-section', { timeout: 5000 });
    const formSections = page.locator('.form-section');
    const sectionCount = await formSections.count();
    expect(sectionCount).toBeGreaterThan(0);
    console.log(`✅ Form has ${sectionCount} sections populated`);
    
    // Check for weather condition field
    const weatherField = page.locator('select[name="weather_condition"]');
    await expect(weatherField).toBeVisible();
    console.log('✅ Weather condition field is visible');
    
    // Test filling a field
    await weatherField.selectOption('Sunny');
    console.log('✅ Selected weather condition');
    
    // Verify save draft functionality
    const saveDraftBtn = page.locator('#save-draft-btn');
    await expect(saveDraftBtn).toBeVisible();
    await saveDraftBtn.click();
    console.log('✅ Save draft button works');
    
    console.log('🎉 Complete flow test passed successfully!');
  });
  
  test('modal system debugging with authenticated user', async ({ page }) => {
    console.log('🔍 Starting modal debugging test...');
    
    // Capture console logs
    page.on('console', msg => console.log('🖥️ Browser:', msg.text()));
    page.on('pageerror', error => console.log('❌ Page Error:', error.message));
    
    // Login first
    await page.goto('http://localhost:5432');
    await page.waitForSelector('#login-screen', { state: 'visible' });
    await page.fill('#email', 'admin@resourcemgmt.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    await page.waitForSelector('#app', { state: 'visible' });
    console.log('✅ Login completed');
    
    // Debug modal creation
    const modalExists = await page.evaluate(() => {
      return document.getElementById('template-selection-modal') !== null;
    });
    console.log(`Modal container exists: ${modalExists}`);
    
    // Check z-index values
    const zIndexValues = await page.evaluate(() => {
      const modal = document.getElementById('template-selection-modal');
      const overlay = document.getElementById('modal-overlay');
      
      return {
        modal: modal ? window.getComputedStyle(modal).zIndex : 'N/A',
        overlay: overlay ? window.getComputedStyle(overlay).zIndex : 'N/A'
      };
    });
    console.log(`Z-index values - Modal: ${zIndexValues.modal}, Overlay: ${zIndexValues.overlay}`);
    
    // Check CSS classes
    const cssClasses = await page.evaluate(() => {
      const modal = document.getElementById('template-selection-modal');
      return modal ? modal.className : 'N/A';
    });
    console.log(`Modal CSS classes: ${cssClasses}`);
    
    // Trigger modal and verify
    await page.click('#new-inspection-btn');
    await page.waitForTimeout(1000); // Give time for modal to appear
    
    const modalVisibility = await page.evaluate(() => {
      const modal = document.getElementById('template-selection-modal');
      if (!modal) return 'not found';
      
      const styles = window.getComputedStyle(modal);
      return {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        hasShowClass: modal.classList.contains('show')
      };
    });
    
    console.log('Modal visibility details:', modalVisibility);
    
    await expect(page.locator('#template-selection-modal')).toBeVisible();
    console.log('✅ Modal debugging test passed');
  });
});