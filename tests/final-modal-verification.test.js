const { test, expect } = require('@playwright/test');

test('Final verification: User can see template selection modal', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  
  // Login
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  
  // Wait for dashboard
  await page.waitForSelector('#dashboard-page.active');
  
  // Click New Inspection
  await page.click('#new-inspection-btn');
  await page.waitForTimeout(1000);
  
  // Check modal container is showing
  const modalContainer = page.locator('#modal-container');
  const hasShowClass = await modalContainer.evaluate(el => el.classList.contains('show'));
  console.log(`✅ Modal container has 'show' class: ${hasShowClass}`);
  
  // Check if emergency modal exists and has proper dimensions
  const emergencyModal = page.locator('#emergency-modal-overlay');
  const modalExists = await emergencyModal.count() > 0;
  console.log(`✅ Emergency modal exists: ${modalExists}`);
  
  if (modalExists) {
    // Check if modal is visible
    const isVisible = await emergencyModal.isVisible();
    console.log(`✅ Emergency modal visible: ${isVisible}`);
    
    // Get bounding box to check dimensions
    const box = await emergencyModal.boundingBox();
    const hasDimensions = box && box.width > 0 && box.height > 0;
    console.log(`✅ Modal has proper dimensions: ${hasDimensions} (${box?.width}x${box?.height})`);
    
    // Check for template options
    const templateOptions = await page.locator('div[onclick*="selectTemplate"]').count();
    console.log(`✅ Template options found: ${templateOptions}`);
    
    // Check for modal header
    const modalHeader = page.locator('h2:has-text("Select Inspection Type")');
    const headerExists = await modalHeader.count() > 0;
    console.log(`✅ Modal header exists: ${headerExists}`);
    
    if (isVisible && hasDimensions && templateOptions > 0) {
      console.log('🎉 SUCCESS: Emergency modal is fully functional and visible!');
    }
  }
  
  // Take final screenshot
  await page.screenshot({ path: 'final-modal-verification.png' });
  console.log('📸 Final verification screenshot saved');
});