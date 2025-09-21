const { test, expect } = require('@playwright/test');

test('List all available templates', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  // Navigate to Templates page
  await page.click('a[data-page="templates"]');
  await page.waitForTimeout(2000);
  
  // List all template items
  const templateItems = await page.locator('.template-item').count();
  console.log(`📋 Found ${templateItems} template items`);
  
  for (let i = 0; i < templateItems; i++) {
    const templateItem = page.locator('.template-item').nth(i);
    const title = await templateItem.locator('.template-title').textContent();
    const category = await templateItem.locator('.template-category').textContent();
    console.log(`${i + 1}. Template: "${title}" (Category: ${category})`);
  }
  
  // Navigate to new inspection to see template selection
  await page.click('a[data-page="inspections"]');
  await page.waitForTimeout(1000);
  await page.click('#new-inspection-btn');
  await page.waitForTimeout(2000);
  
  // Check template selection modal
  const modalTemplates = await page.locator('.template-option').count();
  console.log(`\n🎯 Template selection modal has ${modalTemplates} options:`);
  
  for (let i = 0; i < modalTemplates; i++) {
    const templateOption = page.locator('.template-option').nth(i);
    const name = await templateOption.locator('h4').textContent();
    const desc = await templateOption.locator('p').textContent();
    console.log(`${i + 1}. "${name}" - ${desc}`);
  }
  
  await page.screenshot({ path: 'template-list.png' });
});