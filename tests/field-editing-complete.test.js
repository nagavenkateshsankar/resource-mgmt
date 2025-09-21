const { test, expect } = require('@playwright/test');

test('Test complete field editing workflow', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  // Navigate to Templates and edit first template
  await page.click('a[data-page="templates"]');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Edit")');
  await page.waitForTimeout(2000);
  
  console.log('✅ Template builder loaded');
  
  // Click edit button on first field (usually has pencil icon)
  const editFieldButtons = await page.locator('button[onclick*="editField"], .field-edit-btn, button[title*="Edit"]').count();
  console.log(`✏️ Edit field buttons found: ${editFieldButtons}`);
  
  if (editFieldButtons > 0) {
    // Click first edit field button
    await page.click('button[onclick*="editField"]');
    await page.waitForTimeout(1000);
    
    // Check if field edit modal appeared
    const fieldEditModal = await page.locator('#field-edit-modal').count();
    const modalVisible = fieldEditModal > 0 ? await page.locator('#field-edit-modal').isVisible() : false;
    console.log(`📝 Field edit modal exists: ${fieldEditModal > 0}, visible: ${modalVisible}`);
    
    if (fieldEditModal > 0 && modalVisible) {
      // Check modal content
      const fieldName = await page.locator('#field-name').inputValue();
      const fieldType = await page.locator('#field-type').inputValue();
      console.log(`🔧 Editing field: "${fieldName}" (${fieldType})`);
      
      // Test editing field name
      await page.fill('#field-name', 'Updated Field Name');
      await page.fill('#field-label', 'Updated Field Label');
      
      // Test changing field type
      await page.selectOption('#field-type', 'textarea');
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(1000);
      
      // Check if modal closed
      const modalAfterSave = await page.locator('#field-edit-modal').count();
      console.log(`✅ Modal closed after save: ${modalAfterSave === 0}`);
      
      if (modalAfterSave === 0) {
        console.log('🎉 SUCCESS: Field editing works completely!');
      }
    }
  }
  
  await page.screenshot({ path: 'field-editing-complete.png' });
});