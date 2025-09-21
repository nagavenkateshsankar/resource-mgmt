const { test, expect } = require('@playwright/test');

test('Verify modal appears when clicking New Inspection', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('🖥️ Browser:', msg.text()));
  
  // Navigate and login
  await page.goto('http://localhost:5432');
  console.log('📍 Navigated to app');
  
  // Wait for login screen
  await page.waitForSelector('#login-screen', { state: 'visible' });
  console.log('✅ Login screen visible');
  
  // Login with demo credentials
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  console.log('✅ Login attempted');
  
  // Wait for app to load
  await page.waitForSelector('#app', { state: 'visible' });
  await page.waitForSelector('#dashboard-page.active');
  console.log('✅ Dashboard loaded');
  
  // Take screenshot before clicking
  await page.screenshot({ path: 'before-click.png' });
  console.log('📸 Screenshot taken before click');
  
  // Click New Inspection button
  const newInspectionBtn = page.locator('#new-inspection-btn');
  await expect(newInspectionBtn).toBeVisible();
  console.log('✅ New Inspection button found');
  
  await newInspectionBtn.click();
  console.log('🖱️ Clicked New Inspection button');
  
  // Wait a moment for modal to appear
  await page.waitForTimeout(2000);
  
  // Take screenshot after clicking
  await page.screenshot({ path: 'after-click.png' });
  console.log('📸 Screenshot taken after click');
  
  // Check what modals exist
  const modals = await page.locator('.modal').count();
  console.log(`📊 Found ${modals} modal(s) on page`);
  
  // Check specifically for template selection modal
  const templateModal = page.locator('#template-selection-modal');
  const modalExists = await templateModal.count();
  console.log(`📊 Template selection modal count: ${modalExists}`);
  
  if (modalExists > 0) {
    const isVisible = await templateModal.isVisible();
    console.log(`👁️ Template selection modal visible: ${isVisible}`);
    
    if (isVisible) {
      console.log('🎉 SUCCESS: Modal is visible!');
      
      // Check for template categories
      const categories = await page.locator('.template-category').count();
      console.log(`📋 Found ${categories} template categories`);
      
      // Check for template cards
      const templateCards = await page.locator('.template-card').count();
      console.log(`🃏 Found ${templateCards} template cards`);
      
    } else {
      console.log('⚠️ Modal exists but not visible');
      
      // Debug visibility
      const styles = await templateModal.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          zIndex: computed.zIndex
        };
      });
      console.log('🔍 Modal styles:', styles);
    }
  } else {
    console.log('❌ Template selection modal not found');
  }
  
  console.log('🏁 Test completed');
});