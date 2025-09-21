const { test, expect } = require('@playwright/test');

test('Manual modal test', async ({ page }) => {
  // Navigate to manual test page
  await page.goto('http://localhost:5432/test-manual-modal.html');
  
  console.log('📍 Navigated to manual modal test');
  
  // Test simple modal
  await page.click('button:has-text("Test Simple Modal")');
  await page.waitForTimeout(1000);
  
  // Check if simple modal is visible
  const simpleModal = page.locator('#test-modal');
  const simpleModalVisible = await simpleModal.isVisible();
  console.log(`🔍 Simple modal visible: ${simpleModalVisible}`);
  
  if (simpleModalVisible) {
    console.log('✅ Simple modal is working!');
    
    // Get dimensions
    const rect = await simpleModal.boundingBox();
    console.log(`📐 Simple modal dimensions: ${rect.width}x${rect.height}`);
  }
  
  // Close simple modal
  await page.click('button:has-text("Close Modal")');
  await page.waitForTimeout(500);
  
  // Test complex modal (template selection)
  await page.click('button:has-text("Test Complex Modal")');
  await page.waitForTimeout(1000);
  
  // Check if complex modal is visible
  const complexModal = page.locator('#template-selection-modal');
  const complexModalVisible = await complexModal.isVisible();
  console.log(`🎯 Complex modal (template selection) visible: ${complexModalVisible}`);
  
  if (complexModalVisible) {
    console.log('🎉 SUCCESS: Template selection modal is working!');
    
    // Get dimensions
    const rect = await complexModal.boundingBox();
    console.log(`📐 Complex modal dimensions: ${rect.width}x${rect.height}`);
    
    // Check for template categories
    const safetyCategory = page.locator('.template-category:has-text("Safety")');
    const safetyCategoryVisible = await safetyCategory.isVisible();
    console.log(`🦺 Safety category visible: ${safetyCategoryVisible}`);
    
    // Check for template cards
    const templateCards = await page.locator('.template-card').count();
    console.log(`🃏 Template cards found: ${templateCards}`);
    
  } else {
    console.log('❌ Complex modal not visible');
    
    // Debug styles
    const styles = await complexModal.evaluate(el => {
      if (!el) return 'Element not found';
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        width: computed.width,
        height: computed.height,
        position: computed.position
      };
    });
    console.log('🔍 Complex modal styles:', styles);
  }
  
  // Take screenshot
  await page.screenshot({ path: 'manual-modal-test.png' });
  console.log('📸 Screenshot saved: manual-modal-test.png');
  
  console.log('🏁 Manual modal test completed');
});