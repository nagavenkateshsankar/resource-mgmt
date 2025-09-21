const { test, expect } = require('@playwright/test');

test('Test template editing functionality', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  console.log('✅ Dashboard loaded');
  
  // Navigate to Templates page
  await page.click('a[data-page="templates"]');
  await page.waitForTimeout(1000);
  
  // Check if templates page is active
  const templatesPageActive = await page.locator('#templates-page.active').count() > 0;
  console.log(`✅ Templates page active: ${templatesPageActive}`);
  
  if (templatesPageActive) {
    // Check for template items
    const templateItems = await page.locator('.template-item').count();
    console.log(`📋 Template items found: ${templateItems}`);
    
    if (templateItems > 0) {
      // Look for edit buttons
      const editButtons = await page.locator('button:has-text("Edit")').count();
      console.log(`✏️ Edit buttons found: ${editButtons}`);
      
      if (editButtons > 0) {
        // Click first edit button
        console.log('🖱️ Clicking first edit button...');
        await page.click('button:has-text("Edit")');
        await page.waitForTimeout(2000);
        
        // Check if navigated to template builder
        const templateBuilderActive = await page.locator('#template-builder-page.active').count() > 0;
        console.log(`✅ Template builder page active: ${templateBuilderActive}`);
        
        // Check page title
        const pageTitle = await page.locator('#builder-page-title').textContent();
        console.log(`📄 Page title: "${pageTitle}"`);
        
        if (templateBuilderActive && pageTitle === 'Edit Template') {
          console.log('🎉 SUCCESS: Template editing navigation works!');
        }
      }
    }
  }
  
  await page.screenshot({ path: 'template-editing-test.png' });
});