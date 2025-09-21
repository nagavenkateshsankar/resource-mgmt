const { test, expect } = require('@playwright/test');

test('Test dynamic version display updates', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5432');
  await page.waitForSelector('#login-screen', { state: 'visible' });
  
  // Login
  await page.fill('#email', 'admin@resourcemgmt.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  await page.waitForSelector('#dashboard-page.active');
  
  // Wait for service worker to be ready and version to update
  await page.waitForTimeout(3000);
  
  // Check if version display was updated dynamically
  const versionElement = await page.locator('#app-version');
  const versionText = await versionElement.textContent();
  console.log('🔍 Current version display:', versionText);
  
  // The version should be v1.2.1 (from service worker) not v1.2.0 (hardcoded)
  if (versionText === 'v1.2.1') {
    console.log('✅ SUCCESS: Version display is dynamic and shows correct version!');
  } else if (versionText === 'v1.2.0') {
    console.log('❌ ISSUE: Version display is still hardcoded to v1.2.0');
  } else {
    console.log('⚠️ UNEXPECTED: Version display shows:', versionText);
  }
  
  await page.screenshot({ path: 'version-display-test.png' });
});