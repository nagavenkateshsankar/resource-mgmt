/**
 * Global test teardown for Playwright E2E tests
 * Runs once after all tests complete
 */

const { chromium } = require('@playwright/test');
const config = require('./test-config');
const fs = require('fs').promises;
const path = require('path');

async function globalTeardown() {
  console.log('🏁 Starting global test teardown...');

  // Clean up test data if configured
  if (config.database.cleanupAfterTests) {
    await cleanupTestData();
  }

  // Generate test report summary
  await generateTestSummary();

  // Clean up temporary files
  await cleanupTempFiles();

  // Archive test artifacts
  await archiveTestArtifacts();

  console.log('✅ Global test teardown completed');
}

async function cleanupTestData() {
  console.log('🧹 Final cleanup of test data...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Login as admin
    await page.goto(`${config.environment.frontendUrl}/login`);
    await page.fill(config.selectors.auth.emailInput, config.credentials.admin.email);
    await page.fill(config.selectors.auth.passwordInput, config.credentials.admin.password);
    await page.click(config.selectors.auth.submitButton);
    await page.waitForTimeout(2000);

    let cleanedItems = 0;

    // Clean up test inspections
    try {
      await page.goto(`${config.environment.frontendUrl}/inspections`);
      await page.waitForTimeout(2000);

      const testInspections = page.locator('[data-testid="inspection-item"]:has-text("Test")');
      const inspectionCount = await testInspections.count();

      for (let i = 0; i < Math.min(inspectionCount, 10); i++) {
        try {
          const deleteBtn = testInspections.nth(i).locator('button:has-text("Delete")');
          if (await deleteBtn.count() > 0) {
            await deleteBtn.click();

            // Handle confirmation dialog
            const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
            if (await confirmBtn.count() > 0) {
              await confirmBtn.click();
              await page.waitForTimeout(1000);
              cleanedItems++;
            }
          }
        } catch (error) {
          console.log(`Could not delete test inspection ${i}:`, error.message);
        }
      }

      if (cleanedItems > 0) {
        console.log(`✅ Cleaned up ${cleanedItems} test inspections`);
      }
    } catch (error) {
      console.log('Could not access inspections for cleanup:', error.message);
    }

    // Clean up test templates
    try {
      await page.goto(`${config.environment.frontendUrl}/templates`);
      await page.waitForTimeout(2000);

      const testTemplates = page.locator('[data-testid="template-item"]:has-text("Test")');
      const templateCount = await testTemplates.count();

      let templatesCleaned = 0;
      for (let i = 0; i < Math.min(templateCount, 5); i++) {
        try {
          const deleteBtn = testTemplates.nth(i).locator('button:has-text("Delete")');
          if (await deleteBtn.count() > 0) {
            await deleteBtn.click();

            const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
            if (await confirmBtn.count() > 0) {
              await confirmBtn.click();
              await page.waitForTimeout(1000);
              templatesCleaned++;
            }
          }
        } catch (error) {
          console.log(`Could not delete test template ${i}:`, error.message);
        }
      }

      if (templatesCleaned > 0) {
        console.log(`✅ Cleaned up ${templatesCleaned} test templates`);
      }
    } catch (error) {
      console.log('Could not access templates for cleanup:', error.message);
    }

  } catch (error) {
    console.error('❌ Data cleanup failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    // Read test results if available
    const resultsDir = 'test-results';
    const summaryFile = path.join(resultsDir, 'test-summary.json');

    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        frontend: config.environment.frontendUrl,
        backend: config.environment.backendUrl,
        nodeVersion: process.version,
        platform: process.platform
      },
      configuration: {
        parallelWorkers: process.env.PWTEST_WORKERS || 'default',
        headless: config.browser.headless,
        retries: config.retries.defaultRetries,
        timeouts: config.timeouts
      },
      features: config.features,
      testFiles: []
    };

    // Try to collect test file information
    try {
      const testDir = path.join(__dirname);
      const files = await fs.readdir(testDir);
      const testFiles = files.filter(file =>
        file.endsWith('.test.js') && !file.includes('config') && !file.includes('utils')
      );

      summary.testFiles = testFiles.map(file => ({
        name: file,
        category: file.replace('.test.js', '').replace('-', ' ')
      }));

      console.log(`📁 Found ${testFiles.length} test files`);
    } catch (error) {
      console.log('Could not collect test file information:', error.message);
    }

    // Ensure results directory exists
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Write summary
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`✅ Test summary written to ${summaryFile}`);

  } catch (error) {
    console.error('❌ Could not generate test summary:', error.message);
  }
}

async function cleanupTempFiles() {
  console.log('🗑️ Cleaning up temporary files...');

  try {
    // Clean up screenshots older than 24 hours
    const screenshotDir = config.screenshots.directory || 'test-results/screenshots';

    try {
      const files = await fs.readdir(screenshotDir);
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      let cleanedFiles = 0;
      for (const file of files) {
        try {
          const filePath = path.join(screenshotDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < oneDayAgo) {
            await fs.unlink(filePath);
            cleanedFiles++;
          }
        } catch (error) {
          // File might not exist or be inaccessible
        }
      }

      if (cleanedFiles > 0) {
        console.log(`✅ Cleaned up ${cleanedFiles} old screenshot files`);
      }
    } catch (error) {
      console.log('Screenshot cleanup not needed or failed:', error.message);
    }

    // Clean up temporary token files
    const tokenFiles = ['token.txt', 'debug_token.txt', 'temp_token.txt'];
    let tokensCleaned = 0;

    for (const tokenFile of tokenFiles) {
      try {
        await fs.unlink(tokenFile);
        tokensCleaned++;
      } catch (error) {
        // File might not exist
      }
    }

    if (tokensCleaned > 0) {
      console.log(`✅ Cleaned up ${tokensCleaned} temporary token files`);
    }

  } catch (error) {
    console.error('❌ Temp file cleanup failed:', error.message);
  }
}

async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts...');

  if (process.env.CI !== 'true') {
    console.log('Skipping artifact archival (not in CI environment)');
    return;
  }

  try {
    const archiveDir = path.join('test-results', 'archives');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `test-run-${timestamp}`;

    // Create archive directory
    await fs.mkdir(archiveDir, { recursive: true });

    // Create archive info file
    const archiveInfo = {
      timestamp: new Date().toISOString(),
      testRun: archiveName,
      environment: process.env.NODE_ENV || 'test',
      branch: process.env.GITHUB_REF || process.env.GIT_BRANCH || 'unknown',
      commit: process.env.GITHUB_SHA || process.env.GIT_COMMIT || 'unknown'
    };

    await fs.writeFile(
      path.join(archiveDir, `${archiveName}.json`),
      JSON.stringify(archiveInfo, null, 2)
    );

    console.log(`✅ Test artifacts archived as ${archiveName}`);

  } catch (error) {
    console.error('❌ Artifact archival failed:', error.message);
  }
}

async function reportTestMetrics() {
  console.log('📈 Reporting test metrics...');

  try {
    // Collect basic metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      duration: process.env.TEST_DURATION || 'unknown',
      environment: config.environment.frontendUrl,
      status: 'completed'
    };

    // Could send to monitoring system here
    console.log('Test metrics:', JSON.stringify(metrics, null, 2));

  } catch (error) {
    console.error('❌ Metrics reporting failed:', error.message);
  }
}

// Main teardown function
async function main() {
  try {
    console.log('🎬 Playwright E2E Test Suite Global Teardown');
    console.log('=============================================');

    await globalTeardown();
    await reportTestMetrics();

    console.log('=============================================');
    console.log('🎉 Test suite completed successfully!');

  } catch (error) {
    console.error('💥 Global teardown failed:', error);
    // Don't exit with error code as this might hide test results
  }
}

module.exports = main;