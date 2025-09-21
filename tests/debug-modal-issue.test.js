const { test, expect } = require('@playwright/test');

test.describe('Debug Modal Issue Investigation', () => {
  test('investigate modal issue step by step', async ({ page }) => {
    console.log('🔍 Starting comprehensive modal investigation...');
    
    // Capture all console logs and errors
    const consoleLogs = [];
    const pageErrors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('🖥️ Browser:', text);
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });
    
    // Step 1: Navigate and check initial state
    console.log('\n--- STEP 1: Initial Navigation ---');
    await page.goto('http://localhost:5432');
    await page.waitForLoadState('networkidle');
    
    // Check for debug elements immediately
    const debugElements = await page.locator('[style*="yellow"], [style*="red"], .debug').count();
    console.log(`🟡 Debug elements found on load: ${debugElements}`);
    
    if (debugElements > 0) {
      const debugTexts = await page.locator('[style*="yellow"], [style*="red"], .debug').allTextContents();
      console.log('🟡 Debug element texts:', debugTexts);
    }
    
    // Step 2: Login process
    console.log('\n--- STEP 2: Login Process ---');
    await page.waitForSelector('#login-screen', { state: 'visible' });
    await page.fill('#email', 'admin@resourcemgmt.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    
    // Wait for dashboard to load
    await page.waitForSelector('#app', { state: 'visible' });
    await page.waitForSelector('#dashboard-page.active');
    console.log('✅ Login completed, dashboard active');
    
    // Step 3: Pre-click analysis
    console.log('\n--- STEP 3: Pre-click Analysis ---');
    
    // Check what modals exist before clicking
    const initialModals = await page.locator('.modal').count();
    console.log(`📊 Initial modals on page: ${initialModals}`);
    
    // Check for modal containers
    const modalContainers = await page.locator('.modal-container').count();
    console.log(`📦 Modal containers: ${modalContainers}`);
    
    // Check if New Inspection button exists and is clickable
    const newInspectionBtn = page.locator('#new-inspection-btn');
    const btnExists = await newInspectionBtn.count();
    const btnVisible = btnExists > 0 ? await newInspectionBtn.isVisible() : false;
    const btnEnabled = btnExists > 0 ? await newInspectionBtn.isEnabled() : false;
    
    console.log(`🔲 New Inspection Button - Exists: ${btnExists}, Visible: ${btnVisible}, Enabled: ${btnEnabled}`);
    
    if (btnExists > 0) {
      const btnText = await newInspectionBtn.textContent();
      console.log(`🔲 Button text: "${btnText}"`);
    }
    
    // Step 4: Click and immediate response
    console.log('\n--- STEP 4: Button Click Analysis ---');
    
    // Clear previous console logs to focus on click event
    consoleLogs.length = 0;
    
    // Take screenshot before click
    await page.screenshot({ path: 'debug-before-click.png' });
    console.log('📸 Screenshot saved: debug-before-click.png');
    
    // Click the button
    console.log('🖱️ Clicking New Inspection button...');
    await newInspectionBtn.click();
    
    // Wait a moment for any async operations
    await page.waitForTimeout(2000);
    
    // Take screenshot after click
    await page.screenshot({ path: 'debug-after-click.png' });
    console.log('📸 Screenshot saved: debug-after-click.png');
    
    // Step 5: Post-click analysis
    console.log('\n--- STEP 5: Post-click Analysis ---');
    
    // Check console logs that occurred after click
    const clickRelatedLogs = consoleLogs.slice(-10); // Last 10 logs
    console.log('📝 Recent console logs after click:');
    clickRelatedLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log}`);
    });
    
    // Check for modals after click
    const postClickModals = await page.locator('.modal').count();
    console.log(`📊 Modals after click: ${postClickModals}`);
    
    // Check specifically for template selection modal
    const templateModal = page.locator('#template-selection-modal');
    const templateModalCount = await templateModal.count();
    console.log(`🎯 Template selection modal count: ${templateModalCount}`);
    
    if (templateModalCount > 0) {
      // Get detailed modal information
      const modalInfo = await templateModal.evaluate(el => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          id: el.id,
          className: el.className,
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          zIndex: computed.zIndex,
          position: computed.position,
          top: computed.top,
          left: computed.left,
          width: rect.width,
          height: rect.height,
          isConnected: el.isConnected,
          innerHTML: el.innerHTML.substring(0, 200) + '...' // First 200 chars
        };
      });
      
      console.log('🔍 Template modal details:', modalInfo);
      
      // Check if it's actually visible to user
      const isActuallyVisible = await templateModal.isVisible();
      console.log(`👁️ Modal actually visible to Playwright: ${isActuallyVisible}`);
      
      // Check parent containers
      const parentContainer = await templateModal.evaluate(el => {
        let parent = el.parentElement;
        const parents = [];
        while (parent && parents.length < 5) {
          const computed = window.getComputedStyle(parent);
          parents.push({
            tagName: parent.tagName,
            className: parent.className,
            id: parent.id,
            display: computed.display,
            visibility: computed.visibility,
            zIndex: computed.zIndex
          });
          parent = parent.parentElement;
        }
        return parents;
      });
      
      console.log('🏗️ Modal parent containers:', parentContainer);
      
    } else {
      console.log('❌ Template selection modal not found in DOM');
      
      // Check what modals DO exist
      const existingModals = await page.locator('.modal').all();
      for (let i = 0; i < existingModals.length; i++) {
        const modalId = await existingModals[i].getAttribute('id');
        const modalClass = await existingModals[i].getAttribute('class');
        console.log(`  Modal ${i + 1}: id="${modalId}", class="${modalClass}"`);
      }
    }
    
    // Step 6: Network analysis
    console.log('\n--- STEP 6: Network Analysis ---');
    console.log('🌐 Check server logs for template API call around 17:24:26');
    
    // Step 7: Function analysis
    console.log('\n--- STEP 7: Function Analysis ---');
    
    // Check if functions exist
    const functionCheck = await page.evaluate(() => {
      const checks = {
        appExists: typeof window.app !== 'undefined',
        showTemplateSelection: window.app && typeof window.app.showTemplateSelection === 'function',
        showTemplateSelectionModal: window.app && typeof window.app.showTemplateSelectionModal === 'function',
        createModal: window.app && typeof window.app.createModal === 'function',
        showModal: window.app && typeof window.app.showModal === 'function'
      };
      
      // Try to manually call the function to see what happens
      if (checks.showTemplateSelection) {
        try {
          console.log('🧪 Manually calling showTemplateSelection...');
          window.app.showTemplateSelection();
        } catch (error) {
          console.log('❌ Error calling showTemplateSelection:', error.message);
        }
      }
      
      return checks;
    });
    
    console.log('🔧 Function availability:', functionCheck);
    
    // Final wait to see if modal eventually appears
    console.log('\n--- FINAL: Waiting for potential delayed modal ---');
    try {
      await page.waitForSelector('#template-selection-modal', { 
        state: 'visible', 
        timeout: 5000 
      });
      console.log('🎉 Modal finally appeared!');
    } catch (error) {
      console.log('⏰ Modal did not appear within 5 seconds');
    }
    
    // Summary
    console.log('\n--- SUMMARY ---');
    console.log(`📊 Console logs captured: ${consoleLogs.length}`);
    console.log(`❌ Page errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      console.log('❌ Errors:', pageErrors);
    }
    
    console.log('🏁 Investigation complete');
  });
});