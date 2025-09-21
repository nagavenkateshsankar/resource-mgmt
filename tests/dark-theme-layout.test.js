const { test, expect } = require('@playwright/test');

test('Check dark theme layout issues', async ({ page }) => {
  // Set dark mode preference
  await page.emulateMedia({ colorScheme: 'dark' });
  
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  console.log('✅ Dashboard loaded with dark theme');
  
  // Navigate to inspection form to see the layout issue
  await page.click('#new-inspection-btn');
  await page.waitForTimeout(1000);
  
  // Click first template
  const firstTemplate = page.locator('div[onclick*="selectTemplate"]').first();
  await firstTemplate.click();
  await page.waitForTimeout(1000);
  
  // Check if on inspection form
  const inspectionForm = await page.locator('#inspection-form-page.active').count();
  console.log(`✅ On inspection form page: ${inspectionForm > 0}`);
  
  if (inspectionForm > 0) {
    // Check computed styles of main elements
    const mainContentStyles = await page.evaluate(() => {
      const mainContent = document.querySelector('.main-content');
      const page = document.querySelector('#inspection-form-page');
      const cards = document.querySelectorAll('.card');
      
      return {
        mainContent: mainContent ? {
          background: getComputedStyle(mainContent).backgroundColor,
          color: getComputedStyle(mainContent).color
        } : null,
        page: page ? {
          background: getComputedStyle(page).backgroundColor,
          color: getComputedStyle(page).color
        } : null,
        cardCount: cards.length,
        firstCard: cards[0] ? {
          background: getComputedStyle(cards[0]).backgroundColor,
          color: getComputedStyle(cards[0]).color
        } : null
      };
    });
    
    console.log('🎨 Computed styles:', JSON.stringify(mainContentStyles, null, 2));
    
    // Check if white backgrounds exist
    const hasWhiteElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const whiteElements = [];
      
      for (let el of allElements) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg === 'rgb(255, 255, 255)' || bg === 'white') {
          whiteElements.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id
          });
        }
      }
      
      return whiteElements.slice(0, 10); // Return first 10
    });
    
    console.log('⚪ Elements with white background:', JSON.stringify(hasWhiteElements, null, 2));
  }
  
  await page.screenshot({ path: 'dark-theme-layout-debug.png' });
});