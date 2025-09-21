const { chromium } = require('playwright');

async function testDirectAssignmentsAccess() {
  console.log('🚀 Testing direct assignments page access...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate directly to assignments page
    console.log('📍 Step 1: Navigate directly to assignments page');
    await page.goto('http://localhost:5173/assignments');
    await page.waitForTimeout(5000);

    console.log('Final URL:', page.url());
    console.log('Page title:', await page.title());

    // Take screenshot
    await page.screenshot({ path: 'direct-assignments-test.png', fullPage: true });
    console.log('✅ Screenshot saved as direct-assignments-test.png');

    // Check page content
    const pageText = await page.textContent('body');
    console.log('🔍 Page content analysis:');
    console.log('Page contains "assignment":', pageText.toLowerCase().includes('assignment'));
    console.log('Page contains "site":', pageText.toLowerCase().includes('site'));
    console.log('Page contains "template":', pageText.toLowerCase().includes('template'));
    console.log('Page contains "matrix":', pageText.toLowerCase().includes('matrix'));
    console.log('Page contains "workflow":', pageText.toLowerCase().includes('workflow'));
    console.log('Page contains "login":', pageText.toLowerCase().includes('login'));
    console.log('Page contains "error":', pageText.toLowerCase().includes('error'));

    // Check for specific mock data
    console.log('Page contains "Downtown Office Building":', pageText.includes('Downtown Office Building'));
    console.log('Page contains "Safety Inspection":', pageText.includes('Safety Inspection'));
    console.log('Page contains "3 sites":', pageText.includes('3 sites'));
    console.log('Page contains "3 templates":', pageText.includes('3 templates'));

    // Look for Vue component content
    const assignmentElements = await page.locator('[data-testid*="assignment"], [class*="assignment"], [id*="assignment"]').count();
    const workflowElements = await page.locator('[data-testid*="workflow"], [class*="workflow"], [id*="workflow"]').count();
    const matrixElements = await page.locator('[data-testid*="matrix"], [class*="matrix"], [id*="matrix"]').count();

    console.log(`Assignment elements found: ${assignmentElements}`);
    console.log(`Workflow elements found: ${workflowElements}`);
    console.log(`Matrix elements found: ${matrixElements}`);

    console.log('🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-direct-assignments.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testDirectAssignmentsAccess().catch(console.error);