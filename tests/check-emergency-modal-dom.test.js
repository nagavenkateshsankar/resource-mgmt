const { test, expect } = require('@playwright/test');

test('Check emergency modal DOM manipulation', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  console.log('✅ Dashboard loaded');
  
  // Check what's in the body before clicking
  const bodyChildrenBefore = await page.evaluate(() => {
    return Array.from(document.body.children).map(child => ({
      id: child.id,
      tagName: child.tagName,
      className: child.className
    }));
  });
  console.log('🔍 Body children before click:', JSON.stringify(bodyChildrenBefore, null, 2));
  
  // Click New Inspection
  await page.click('#new-inspection-btn');
  await page.waitForTimeout(2000);
  
  // Check what's in the body after clicking
  const bodyChildrenAfter = await page.evaluate(() => {
    return Array.from(document.body.children).map(child => ({
      id: child.id,
      tagName: child.tagName,
      className: child.className
    }));
  });
  console.log('🔍 Body children after click:', JSON.stringify(bodyChildrenAfter, null, 2));
  
  // Check specifically for emergency modal
  const emergencyModal = await page.evaluate(() => {
    const modal = document.getElementById('emergency-modal-overlay');
    if (modal) {
      return {
        exists: true,
        display: getComputedStyle(modal).display,
        visibility: getComputedStyle(modal).visibility,
        zIndex: getComputedStyle(modal).zIndex,
        position: getComputedStyle(modal).position,
        innerHTML: modal.innerHTML.substring(0, 200)
      };
    }
    return { exists: false };
  });
  console.log('🚨 Emergency modal details:', JSON.stringify(emergencyModal, null, 2));
  
  await page.screenshot({ path: 'check-emergency-modal-dom.png' });
});