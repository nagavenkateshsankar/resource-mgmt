const { chromium } = require('playwright');

async function testAssignmentsPage() {
  console.log('🚀 Starting simple assignments page test...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Check if frontend is running
    console.log('📍 Testing frontend at http://localhost:5173');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());

    // Take a screenshot
    await page.screenshot({ path: 'frontend-home.png', fullPage: true });
    console.log('✅ Frontend screenshot saved as frontend-home.png');

    // Test 2: Check backend API
    console.log('📍 Testing backend API health');
    const response = await page.request.get('http://localhost:3007/api/v1/health');
    console.log('Backend health status:', response.status());

    if (response.status() === 200) {
      console.log('✅ Backend API is accessible');
    } else {
      console.log('❌ Backend API not accessible');
    }

    // Test 3: Navigate to assignments page
    console.log('📍 Testing assignments page navigation');
    await page.goto('http://localhost:5173/assignments');
    await page.waitForTimeout(3000);

    console.log('Assignments page URL:', page.url());
    await page.screenshot({ path: 'assignments-page.png', fullPage: true });
    console.log('✅ Assignments page screenshot saved as assignments-page.png');

    // Check page content
    const pageContent = await page.textContent('body');
    console.log('Page contains "assignments":', pageContent.toLowerCase().includes('assignments'));
    console.log('Page contains "login":', pageContent.toLowerCase().includes('login'));
    console.log('Page contains "error":', pageContent.toLowerCase().includes('error'));
    console.log('Page contains "permission":', pageContent.toLowerCase().includes('permission'));

    // Test 4: Try to navigate to login if needed
    if (pageContent.toLowerCase().includes('login')) {
      console.log('📍 Detected login requirement, navigating to login page');
      await page.goto('http://localhost:5173/login');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'login-page.png', fullPage: true });
      console.log('✅ Login page screenshot saved as login-page.png');
    }

    console.log('🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testAssignmentsPage().catch(console.error);