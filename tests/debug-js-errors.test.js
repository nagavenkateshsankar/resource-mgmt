const { test, expect } = require('@playwright/test');

test('Debug JavaScript errors in modal generation', async ({ page }) => {
  const errors = [];
  const logs = [];
  
  // Capture console errors and logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`❌ ERROR: ${msg.text()}`);
    } else {
      logs.push(`🖥️ ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  console.log('✅ Dashboard loaded');
  
  // Click New Inspection and wait for modal
  await page.click('#new-inspection-btn');
  await page.waitForTimeout(3000); // Give more time for template fetching
  
  // Check what's in the modal container
  const modalHTML = await page.locator('#modal-container').innerHTML();
  console.log('🔍 Modal container HTML length:', modalHTML.length);
  console.log('🔍 Modal container content (first 500 chars):', modalHTML.substring(0, 500));
  
  // Check specifically for template selection modal
  const templateModal = page.locator('#template-selection-modal');
  const modalExists = await templateModal.count();
  console.log(`📊 Template selection modal count: ${modalExists}`);
  
  if (modalExists > 0) {
    const modalHTML = await templateModal.innerHTML();
    console.log('🔍 Template modal content length:', modalHTML.length);
    console.log('🔍 Template modal content (first 200 chars):', modalHTML.substring(0, 200));
  }
  
  // Output all JavaScript errors
  if (errors.length > 0) {
    console.log('❌ JavaScript Errors Found:');
    errors.forEach(error => console.log(error));
  } else {
    console.log('✅ No JavaScript errors detected');
  }
  
  // Output relevant console logs
  console.log('📋 Relevant Console Logs:');
  logs.forEach(log => {
    if (log.includes('showTemplateSelectionModal') || log.includes('templates') || log.includes('modal') || log.includes('Template')) {
      console.log(log);
    }
  });
  
  // Take screenshot
  await page.screenshot({ path: 'debug-js-errors.png' });
  console.log('📸 Debug screenshot saved');
});