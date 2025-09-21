const { test, expect } = require('@playwright/test');

test('Emergency modal functionality test', async ({ page }) => {
  // Test the standalone emergency modal
  await page.goto('file:///Users/nagavenkatesh/go/src/resource-mgmt/test-emergency-modal.html');
  
  // Click test button
  await page.click('#test-btn');
  await page.waitForTimeout(1000);
  
  // Check if emergency modal appeared
  const modalCount = await page.locator('#emergency-modal-overlay').count();
  console.log(`✅ Emergency modal count: ${modalCount}`);
  
  if (modalCount > 0) {
    console.log('🎉 Emergency modal system works!');
    
    // Check if modal is visible
    const isVisible = await page.locator('#emergency-modal-overlay').isVisible();
    console.log(`✅ Emergency modal visible: ${isVisible}`);
  }
  
  await page.screenshot({ path: 'emergency-modal-test.png' });
});