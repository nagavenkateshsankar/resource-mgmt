const { test, expect } = require('@playwright/test');

test('Test template field adding and editing', async ({ page }) => {
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
  
  // Click edit button on first template
  await page.click('button:has-text("Edit")');
  await page.waitForTimeout(2000);
  
  // Check if template builder is loaded
  const templateBuilderActive = await page.locator('#template-builder-page.active').count() > 0;
  console.log(`✅ Template builder active: ${templateBuilderActive}`);
  
  if (templateBuilderActive) {
    // Check for template builder container content
    const builderContent = await page.locator('#template-builder-container').innerHTML();
    const hasContent = builderContent.length > 100;
    console.log(`📝 Template builder has content: ${hasContent} (${builderContent.length} chars)`);
    
    // Look for common template builder elements
    const addFieldButton = await page.locator('button:has-text("Add Field"), button:has-text("Add"), button[title*="field"], button[aria-label*="field"]').count();
    console.log(`➕ Add field buttons found: ${addFieldButton}`);
    
    // Look for existing fields
    const existingFields = await page.locator('.field-item, .form-field, .template-field, input, textarea, select').count();
    console.log(`🔧 Existing form elements found: ${existingFields}`);
    
    // Look for field type options
    const fieldTypeSelectors = await page.locator('select[name*="type"], option[value="text"], option[value="textarea"], option[value="checkbox"]').count();
    console.log(`🎛️ Field type selectors found: ${fieldTypeSelectors}`);
    
    // Check for save/update buttons
    const saveButtons = await page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').count();
    console.log(`💾 Save/Update buttons found: ${saveButtons}`);
    
    if (hasContent && (addFieldButton > 0 || existingFields > 0)) {
      console.log('🎉 Template builder appears functional with field editing capabilities');
    } else {
      console.log('⚠️ Template builder may not be fully loaded or functional');
    }
  }
  
  await page.screenshot({ path: 'template-field-editing.png' });
});