const { test, expect } = require('@playwright/test');

test('Debug inspection data loading', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  // Navigate to inspections page
  await page.click('a[data-page="inspections"]');
  await page.waitForTimeout(2000);
  
  // Look for inspection items
  const inspectionItems = await page.locator('.inspection-item').count();
  console.log(`📋 Found ${inspectionItems} inspection items`);
  
  if (inspectionItems > 0) {
    // Click on first inspection
    await page.click('.inspection-item:first-of-type');
    await page.waitForTimeout(2000);
    
    // Check if we're on inspection form page
    const formPage = await page.locator('#inspection-form-page.active').count();
    console.log(`📝 Form page active: ${formPage > 0}`);
    
    if (formPage > 0) {
      // Check basic field values
      const siteLocation = await page.locator('#site_location').inputValue();
      const siteName = await page.locator('#site_name').inputValue();
      const priority = await page.locator('#priority').inputValue();
      
      console.log(`🏢 Site Location: "${siteLocation}"`);
      console.log(`🏗️ Site Name: "${siteName}"`);
      console.log(`⚡ Priority: "${priority}"`);
      
      // Check equipment fields
      const equipmentId = await page.locator('#equipment_id').inputValue();
      const equipmentType = await page.locator('#equipment_type').inputValue();
      
      console.log(`🔧 Equipment ID: "${equipmentId}"`);
      console.log(`⚙️ Equipment Type: "${equipmentType}"`);
    }
  }
  
  await page.screenshot({ path: 'debug-inspection-data.png' });
});