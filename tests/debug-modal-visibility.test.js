const { test, expect } = require('@playwright/test');

test('Debug modal visibility issue', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  console.log('✅ Dashboard loaded');
  
  // Click New Inspection
  await page.click('#new-inspection-btn');
  await page.waitForTimeout(2000);
  
  // Check modal container
  const modalContainer = page.locator('#modal-container');
  const containerStyles = await modalContainer.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      zIndex: computed.zIndex,
      position: computed.position,
      top: computed.top,
      left: computed.left,
      width: computed.width,
      height: computed.height,
      backgroundColor: computed.backgroundColor
    };
  });
  console.log('🔍 Modal container styles:', containerStyles);
  
  // Check if modal exists
  const modal = page.locator('#template-selection-modal');
  const modalExists = await modal.count();
  console.log(`📊 Modal exists: ${modalExists > 0}`);
  
  if (modalExists > 0) {
    const modalStyles = await modal.evaluate(el => {
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        position: computed.position,
        zIndex: computed.zIndex,
        width: computed.width,
        height: computed.height,
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        isVisible: rect.width > 0 && rect.height > 0 && computed.display !== 'none' && computed.visibility !== 'hidden'
      };
    });
    console.log('🔍 Modal styles:', modalStyles);
    
    // Check template categories
    const categories = await page.locator('.template-category').count();
    console.log(`📋 Template categories: ${categories}`);
    
    // Check if any element has higher z-index that might be covering modal
    const highZIndexElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const highZIndex = elements.filter(el => {
        const zIndex = parseInt(window.getComputedStyle(el).zIndex);
        return zIndex > 1000;
      }).map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        zIndex: window.getComputedStyle(el).zIndex
      }));
      return highZIndex;
    });
    console.log('🔺 High z-index elements:', highZIndexElements);
  }
  
  // Take detailed screenshot
  await page.screenshot({ path: 'debug-modal-visibility.png', fullPage: true });
  console.log('📸 Debug screenshot saved');
});