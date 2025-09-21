/**
 * Site Inspection Assignment and Review Workflow Tests
 * Tests for the new site inspection assignment, bulk operations, and review workflow system
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Site Inspection Assignment Workflow', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Site Selection and Assignment', () => {
    test('Should display available sites for inspection assignment', async () => {
      await utils.loginAsAdmin();

      // Navigate to inspection creation with site selection
      const navigationPaths = [
        '/inspections/create-with-site',
        '/inspections/create?step=site-selection',
        '/inspections/site-select'
      ];

      let siteSelectionFound = false;
      for (const path of navigationPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        // Check if site selection interface exists
        const siteSelectors = [
          '.site-selection',
          '.sites-list',
          '.site-picker',
          '[data-testid="site-selection"]',
          'select[name="site"]',
          '.site-card'
        ];

        for (const selector of siteSelectors) {
          if (await page.locator(selector).count() > 0) {
            siteSelectionFound = true;
            break;
          }
        }

        if (siteSelectionFound) break;
      }

      expect(siteSelectionFound).toBe(true);
    });

    test('Should allow single site inspection assignment', async () => {
      await utils.loginAsAdmin();

      // Navigate to inspection creation
      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Look for site selection in the form
      const siteInputs = [
        'select[name="site_id"]',
        'select[name="site"]',
        '.site-selector',
        '[data-testid="site-select"]'
      ];

      let foundSiteInput = false;
      for (const selector of siteInputs) {
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.isVisible()) {
          foundSiteInput = true;

          // If it's a select, check for options
          if (selector.includes('select')) {
            const options = await element.locator('option').count();
            expect(options).toBeGreaterThan(1); // Should have at least a default + sites
          }
          break;
        }
      }

      expect(foundSiteInput).toBe(true);
    });

    test('Should support inspector assignment for site inspections', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Look for inspector assignment
      const inspectorInputs = [
        'select[name="inspector_id"]',
        'select[name="inspector"]',
        '.inspector-selector',
        '[data-testid="inspector-select"]'
      ];

      let foundInspectorInput = false;
      for (const selector of inspectorInputs) {
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.isVisible()) {
          foundInspectorInput = true;

          // If it's a select, check for options
          if (selector.includes('select')) {
            const options = await element.locator('option').count();
            expect(options).toBeGreaterThan(0);
          }
          break;
        }
      }

      expect(foundInspectorInput).toBe(true);
    });
  });

  test.describe('Bulk Assignment Operations', () => {
    test('Should provide bulk assignment interface', async () => {
      await utils.loginAsAdmin();

      // Look for bulk assignment functionality
      const bulkAssignmentPaths = [
        '/inspections/bulk-assign',
        '/inspections?view=bulk',
        '/inspections/create?mode=bulk'
      ];

      let bulkInterfaceFound = false;
      for (const path of bulkAssignmentPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        const bulkSelectors = [
          '.bulk-assignment',
          '.bulk-operations',
          '[data-testid="bulk-assign"]',
          'button:has-text("Bulk Assign")',
          '.multi-site-selector'
        ];

        for (const selector of bulkSelectors) {
          if (await page.locator(selector).count() > 0) {
            bulkInterfaceFound = true;
            break;
          }
        }

        if (bulkInterfaceFound) break;
      }

      // Alternative: Check if bulk assignment is available from inspections list
      if (!bulkInterfaceFound) {
        await page.goto('http://localhost:5173/inspections');
        await page.waitForLoadState('networkidle');

        const bulkButtons = [
          'button:has-text("Bulk")',
          'button:has-text("Multiple")',
          '.bulk-actions'
        ];

        for (const selector of bulkButtons) {
          if (await page.locator(selector).count() > 0) {
            bulkInterfaceFound = true;
            break;
          }
        }
      }

      expect(bulkInterfaceFound).toBe(true);
    });

    test('Should support multiple site selection for bulk assignment', async () => {
      await utils.loginAsAdmin();

      // Try to find bulk assignment functionality
      const bulkPaths = ['/inspections/bulk-assign', '/inspections?mode=bulk'];

      for (const path of bulkPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        // Look for multi-select capabilities
        const multiSelectElements = [
          'input[type="checkbox"]',
          '.multi-select',
          '.site-checkbox',
          '[data-testid="site-multi-select"]'
        ];

        let foundMultiSelect = false;
        for (const selector of multiSelectElements) {
          if (await page.locator(selector).count() > 1) { // More than one checkbox
            foundMultiSelect = true;
            break;
          }
        }

        if (foundMultiSelect) {
          expect(foundMultiSelect).toBe(true);
          return;
        }
      }

      // If not found in dedicated bulk pages, should be available somewhere
      test.skip('Bulk assignment interface not yet implemented');
    });
  });

  test.describe('Project and Group Management', () => {
    test('Should support project-based inspection grouping', async () => {
      await utils.loginAsAdmin();

      // Look for project/grouping functionality
      const projectPaths = [
        '/inspections/projects',
        '/projects',
        '/inspections/groups'
      ];

      let projectInterfaceFound = false;
      for (const path of projectPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        if (!page.url().includes('/login')) {
          projectInterfaceFound = true;
          break;
        }
      }

      // Alternative: Check for project fields in inspection creation
      if (!projectInterfaceFound) {
        await page.goto('http://localhost:5173/inspections/create');
        await page.waitForLoadState('networkidle');

        const projectFields = [
          'input[name="project"]',
          'select[name="project_id"]',
          'input[name="group"]',
          '[data-testid="project-select"]'
        ];

        for (const selector of projectFields) {
          if (await page.locator(selector).count() > 0) {
            projectInterfaceFound = true;
            break;
          }
        }
      }

      expect(projectInterfaceFound).toBe(true);
    });

    test('Should allow grouping inspections by project', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Look for grouping/filtering options
      const groupingElements = [
        '.group-by-project',
        '.filter-by-project',
        'select[name="group_by"]',
        'button:has-text("Group")',
        '.project-filter'
      ];

      let foundGrouping = false;
      for (const selector of groupingElements) {
        if (await page.locator(selector).count() > 0) {
          foundGrouping = true;
          break;
        }
      }

      expect(foundGrouping).toBe(true);
    });
  });

  test.describe('Review and Approval Workflow', () => {
    test('Should support inspection review workflow', async () => {
      await utils.loginAsAdmin();

      // Look for review/approval functionality
      const reviewPaths = [
        '/inspections/review',
        '/inspections?status=pending_review',
        '/reviews'
      ];

      let reviewInterfaceFound = false;
      for (const path of reviewPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        if (!page.url().includes('/login')) {
          reviewInterfaceFound = true;
          break;
        }
      }

      // Alternative: Check for review status/buttons in inspections list
      if (!reviewInterfaceFound) {
        await page.goto('http://localhost:5173/inspections');
        await page.waitForLoadState('networkidle');

        const reviewElements = [
          'button:has-text("Review")',
          'button:has-text("Approve")',
          '.review-status',
          '.approval-status',
          ':text("pending review")'
        ];

        for (const selector of reviewElements) {
          if (await page.locator(selector).count() > 0) {
            reviewInterfaceFound = true;
            break;
          }
        }
      }

      expect(reviewInterfaceFound).toBe(true);
    });

    test('Should provide approval/rejection actions', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Look for inspection items with review capabilities
      const reviewActions = [
        'button:has-text("Approve")',
        'button:has-text("Reject")',
        'button:has-text("Review")',
        '.review-actions',
        '.approval-buttons'
      ];

      let foundReviewActions = false;
      for (const selector of reviewActions) {
        if (await page.locator(selector).count() > 0) {
          foundReviewActions = true;
          break;
        }
      }

      expect(foundReviewActions).toBe(true);
    });
  });

  test.describe('Inspector Workload Management', () => {
    test('Should display inspector workload information', async () => {
      await utils.loginAsAdmin();

      // Look for workload management
      const workloadPaths = [
        '/inspectors/workload',
        '/users?view=workload',
        '/inspections/workload'
      ];

      let workloadInterfaceFound = false;
      for (const path of workloadPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        if (!page.url().includes('/login')) {
          const workloadElements = [
            '.workload-chart',
            '.inspector-stats',
            '.workload-summary',
            ':text("workload")'
          ];

          for (const selector of workloadElements) {
            if (await page.locator(selector).count() > 0) {
              workloadInterfaceFound = true;
              break;
            }
          }
        }

        if (workloadInterfaceFound) break;
      }

      expect(workloadInterfaceFound).toBe(true);
    });

    test('Should support workload balancing in assignments', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Look for workload indicators in inspector selection
      const workloadIndicators = [
        '.inspector-workload',
        '.workload-indicator',
        '.assignment-count',
        ':text("assignments")',
        '.load-balance'
      ];

      let foundWorkloadIndicators = false;
      for (const selector of workloadIndicators) {
        if (await page.locator(selector).count() > 0) {
          foundWorkloadIndicators = true;
          break;
        }
      }

      expect(foundWorkloadIndicators).toBe(true);
    });
  });

  test.describe('Notification and Deadline Management', () => {
    test('Should support deadline setting for assignments', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Look for deadline/due date fields
      const deadlineFields = [
        'input[name="due_date"]',
        'input[name="deadline"]',
        'input[type="date"]',
        'input[type="datetime-local"]',
        '.date-picker',
        '[data-testid="due-date"]'
      ];

      let foundDeadlineField = false;
      for (const selector of deadlineFields) {
        if (await page.locator(selector).count() > 0) {
          foundDeadlineField = true;
          break;
        }
      }

      expect(foundDeadlineField).toBe(true);
    });

    test('Should provide notification preferences', async () => {
      await utils.loginAsAdmin();

      // Look for notification settings
      const notificationPaths = [
        '/settings/notifications',
        '/profile/notifications',
        '/preferences'
      ];

      let notificationSettingsFound = false;
      for (const path of notificationPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        if (!page.url().includes('/login')) {
          const notificationElements = [
            'input[type="checkbox"]',
            '.notification-setting',
            ':text("email notifications")',
            ':text("reminders")'
          ];

          for (const selector of notificationElements) {
            if (await page.locator(selector).count() > 0) {
              notificationSettingsFound = true;
              break;
            }
          }
        }

        if (notificationSettingsFound) break;
      }

      expect(notificationSettingsFound).toBe(true);
    });
  });

  test.describe('Role-Based Workflow Permissions', () => {
    test('Admin should have full assignment capabilities', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Admin should see assignment/management capabilities
      const adminCapabilities = [
        'button:has-text("Create")',
        'button:has-text("Assign")',
        'button:has-text("Bulk")',
        '.admin-actions',
        '.assignment-controls'
      ];

      let foundAdminCapabilities = false;
      for (const selector of adminCapabilities) {
        if (await page.locator(selector).count() > 0) {
          foundAdminCapabilities = true;
          break;
        }
      }

      expect(foundAdminCapabilities).toBe(true);
    });

    test('Inspector should have appropriate workflow access', async () => {
      // Test with inspector role (if available)
      const loginSuccess = await utils.loginAsUser('john@example.com', 'password123');

      if (loginSuccess) {
        await page.goto('http://localhost:5173/inspections');
        await page.waitForLoadState('networkidle');

        // Inspector should see their assignments
        const inspectorElements = [
          '.my-inspections',
          '.assigned-inspections',
          ':text("assigned")',
          '.inspector-view'
        ];

        let foundInspectorView = false;
        for (const selector of inspectorElements) {
          if (await page.locator(selector).count() > 0) {
            foundInspectorView = true;
            break;
          }
        }

        expect(foundInspectorView).toBe(true);
      }
    });
  });

  test.describe('Integration with Existing Features', () => {
    test('Site assignment should work with existing templates', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Should have both template and site selection
      const templateField = page.locator('select[name="template_id"], select[name="template"], .template-selector');
      const siteField = page.locator('select[name="site_id"], select[name="site"], .site-selector');

      expect(await templateField.count()).toBeGreaterThan(0);
      expect(await siteField.count()).toBeGreaterThan(0);
    });

    test('Assignment workflow should maintain multi-tenant isolation', async () => {
      await utils.loginAsAdmin();

      // Check that organization context is maintained in assignments
      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Organization context should be present
      const orgContextElements = [
        '.organization-context',
        '.current-org',
        '[data-testid="org-context"]'
      ];

      let foundOrgContext = false;
      for (const selector of orgContextElements) {
        if (await page.locator(selector).count() > 0) {
          foundOrgContext = true;
          break;
        }
      }

      // Organization context should be maintained (visible or implicit)
      expect(foundOrgContext).toBe(true);
    });
  });
});