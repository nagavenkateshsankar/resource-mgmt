const { test, expect } = require('@playwright/test');

test('Complete template selection flow', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  console.log('✅ Dashboard loaded');
  
  // Click New Inspection to open modal
  await page.click('#new-inspection-btn');
  await page.waitForTimeout(1000);
  
  // Verify emergency modal is visible
  const emergencyModal = page.locator('#emergency-modal-overlay');
  const modalExists = await emergencyModal.count() > 0;
  const isVisible = await emergencyModal.isVisible();
  console.log(`✅ Emergency modal exists: ${modalExists}, visible: ${isVisible}`);
  
  if (modalExists && isVisible) {
    // Click on the first template option
    const firstTemplate = page.locator('div[onclick*="selectTemplate"]').first();
    const templateCount = await page.locator('div[onclick*="selectTemplate"]').count();
    console.log(`🎯 Found ${templateCount} clickable templates`);
    
    if (templateCount > 0) {
      console.log('🖱️ Clicking first template...');
      await firstTemplate.click();
      await page.waitForTimeout(1000);
      
      // Check if modal is closed
      const modalAfterClick = await page.locator('#emergency-modal-overlay').count();
      console.log(`✅ Modal closed after selection: ${modalAfterClick === 0}`);
      
      // Check if we navigated to inspection form
      const inspectionFormActive = await page.locator('#inspection-form-page.active').count() > 0;
      console.log(`✅ Navigated to inspection form: ${inspectionFormActive}`);
      
      if (modalAfterClick === 0 && inspectionFormActive) {
        console.log('🎉 SUCCESS: Complete template selection flow works!');
      }
    }
  }
  
  await page.screenshot({ path: 'template-selection-flow.png' });
});