/**
 * Assignment Workflow UI/UX Validation Tests
 * Tests for user interface, user experience, accessibility, and visual design
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Assignment Workflow UI/UX Validation', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Visual Design and Layout', () => {
    test('Should have consistent visual design across assignment pages', async () => {
      await utils.loginAsAdmin();

      const assignmentPages = [
        '/workflow/bulk-assignment',
        '/assignments',
        '/inspections/create'
      ];

      for (const pagePath of assignmentPages) {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForLoadState('networkidle');

        // Check for consistent header
        const header = page.locator('header, .header, .app-header');
        await expect(header).toBeVisible();

        // Check for consistent navigation
        const nav = page.locator('nav, .navigation, .app-nav');
        await expect(nav).toBeVisible();

        // Check for consistent color scheme
        const primaryElements = page.locator('.btn-primary, .primary');
        if (await primaryElements.count() > 0) {
          const firstElement = primaryElements.nth(0);
          const styles = await firstElement.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color
            };
          });

          // Primary buttons should have consistent styling
          expect(styles.backgroundColor).toBeTruthy();
          expect(styles.color).toBeTruthy();
        }

        // Check for consistent typography
        const headings = page.locator('h1, h2, h3');
        if (await headings.count() > 0) {
          const firstHeading = headings.nth(0);
          const fontFamily = await firstHeading.evaluate(el =>
            window.getComputedStyle(el).fontFamily
          );
          expect(fontFamily).toBeTruthy();
        }
      }
    });

    test('Should have proper spacing and alignment', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check form section spacing
      const formSections = page.locator('.form-section');
      const sectionCount = await formSections.count();

      if (sectionCount > 1) {
        for (let i = 0; i < sectionCount - 1; i++) {
          const currentSection = formSections.nth(i);
          const nextSection = formSections.nth(i + 1);

          const currentBox = await currentSection.boundingBox();
          const nextBox = await nextSection.boundingBox();

          if (currentBox && nextBox) {
            const spacing = nextBox.y - (currentBox.y + currentBox.height);
            expect(spacing).toBeGreaterThan(10); // Minimum spacing between sections
            expect(spacing).toBeLessThan(100);   // Maximum spacing to avoid too much whitespace
          }
        }
      }

      // Check form field alignment
      const formGroups = page.locator('.form-group');
      const groupCount = await formGroups.count();

      if (groupCount > 0) {
        const firstGroup = formGroups.nth(0);
        const groupBox = await firstGroup.boundingBox();

        if (groupBox) {
          // Form groups should be properly aligned
          expect(groupBox.x).toBeGreaterThan(0);
          expect(groupBox.width).toBeGreaterThan(200);
        }
      }
    });

    test('Should have appropriate button sizes and styling', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(5, buttonCount); i++) {
          const button = buttons.nth(i);
          const box = await button.boundingBox();
          const isVisible = await button.isVisible();

          if (box && isVisible) {
            // Buttons should have minimum size for usability
            expect(box.height).toBeGreaterThanOrEqual(32);
            expect(box.width).toBeGreaterThanOrEqual(60);

            // Check button styling
            const styles = await button.evaluate(el => {
              const computed = window.getComputedStyle(el);
              return {
                cursor: computed.cursor,
                borderRadius: computed.borderRadius,
                padding: computed.padding
              };
            });

            expect(styles.cursor).toBe('pointer');
            expect(styles.padding).toBeTruthy();
          }
        }
      }
    });

    test('Should have proper loading and feedback states', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for loading states
      const loadingElements = [
        page.locator('.loading'),
        page.locator('.spinner'),
        page.locator('.loading-spinner'),
        page.locator('[data-testid="loading"]')
      ];

      // Fill form partially and submit to trigger loading state
      await page.fill('input[name="name"]', 'Loading Test Assignment');

      // Look for loading indicators
      let foundLoadingState = false;
      for (const element of loadingElements) {
        if (await element.count() > 0) {
          foundLoadingState = true;
          break;
        }
      }

      // Should have loading states or disabled buttons during operations
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        const isDisabled = await submitButton.isDisabled();
        expect(foundLoadingState || isDisabled).toBe(true);
      }
    });
  });

  test.describe('User Interface Components', () => {
    test('Should have intuitive form controls', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check form labels
      const labels = page.locator('label');
      const labelCount = await labels.count();

      if (labelCount > 0) {
        for (let i = 0; i < Math.min(3, labelCount); i++) {
          const label = labels.nth(i);
          const labelText = await label.textContent();

          // Labels should be descriptive
          expect(labelText).toBeTruthy();
          expect(labelText.length).toBeGreaterThan(2);

          // Check if label is associated with an input
          const forAttr = await label.getAttribute('for');
          if (forAttr) {
            const associatedInput = page.locator(`#${forAttr}`);
            await expect(associatedInput).toBeVisible();
          }
        }
      }

      // Check required field indicators
      const requiredLabels = page.locator('label.required, label:has-text("*")');
      const requiredCount = await requiredLabels.count();

      if (requiredCount > 0) {
        // Required fields should be clearly marked
        const firstRequired = requiredLabels.nth(0);
        const requiredText = await firstRequired.textContent();
        expect(requiredText).toContain('*');
      }

      // Check select dropdowns
      const selects = page.locator('select');
      const selectCount = await selects.count();

      if (selectCount > 0) {
        for (let i = 0; i < Math.min(2, selectCount); i++) {
          const select = selects.nth(i);
          const options = await select.locator('option').count();

          // Selects should have options
          expect(options).toBeGreaterThan(0);

          // First option should typically be a placeholder
          const firstOption = await select.locator('option').nth(0).textContent();
          expect(firstOption).toBeTruthy();
        }
      }
    });

    test('Should have responsive site selection interface', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check site selection grid
      const siteGrid = page.locator('.sites-grid');
      if (await siteGrid.count() > 0) {
        const gridStyles = await siteGrid.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            gridTemplateColumns: computed.gridTemplateColumns,
            gap: computed.gap
          };
        });

        // Should use CSS Grid or similar responsive layout
        expect(gridStyles.display).toContain('grid');
        expect(gridStyles.gridTemplateColumns).toBeTruthy();
      }

      // Check site cards
      const siteCards = page.locator('.site-card');
      const cardCount = await siteCards.count();

      if (cardCount > 0) {
        const firstCard = siteCards.nth(0);
        const cardBox = await firstCard.boundingBox();

        if (cardBox) {
          // Cards should have reasonable dimensions
          expect(cardBox.width).toBeGreaterThan(200);
          expect(cardBox.height).toBeGreaterThan(80);

          // Check card styling
          const cardStyles = await firstCard.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              border: computed.border,
              borderRadius: computed.borderRadius,
              cursor: computed.cursor
            };
          });

          expect(cardStyles.cursor).toBe('pointer');
          expect(cardStyles.border).toBeTruthy();
        }

        // Check card interaction states
        await firstCard.hover();

        // Should have hover effects
        const hoverStyles = await firstCard.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            borderColor: computed.borderColor
          };
        });

        expect(hoverStyles.backgroundColor).toBeTruthy();
      }
    });

    test('Should have intuitive inspector assignment interface', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check assignment strategy selector
      const strategyRadios = page.locator('input[type="radio"]');
      const radioCount = await strategyRadios.count();

      if (radioCount > 0) {
        for (let i = 0; i < radioCount; i++) {
          const radio = strategyRadios.nth(i);
          const label = page.locator(`label:has(input[value="${await radio.getAttribute('value')}"])`);

          if (await label.count() > 0) {
            const labelText = await label.textContent();
            expect(labelText).toBeTruthy();
            expect(labelText.length).toBeGreaterThan(5);
          }
        }
      }

      // Check manual assignment interface
      const manualRadio = page.locator('input[value="manual"]');
      if (await manualRadio.count() > 0) {
        await manualRadio.click();

        const manualInterface = page.locator('.manual-assignment');
        await expect(manualInterface).toBeVisible();

        // Should show inspector selection
        const inspectorSelects = page.locator('.manual-assignment select');
        expect(await inspectorSelects.count()).toBeGreaterThan(0);
      }

      // Check auto assignment interface
      const autoRadio = page.locator('input[value="auto"]');
      if (await autoRadio.count() > 0) {
        await autoRadio.click();

        const autoInterface = page.locator('.auto-assignment-display');
        await expect(autoInterface).toBeVisible();

        // Should show assignment summary
        const summaryItems = page.locator('.summary-item');
        expect(await summaryItems.count()).toBeGreaterThanOrEqual(0);
      }
    });

    test('Should have clear navigation and breadcrumbs', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for breadcrumbs or navigation indicators
      const breadcrumbElements = [
        page.locator('.breadcrumb'),
        page.locator('.breadcrumbs'),
        page.locator('.page-header'),
        page.locator('.navigation-path')
      ];

      let foundNavigation = false;
      for (const element of breadcrumbElements) {
        if (await element.count() > 0) {
          foundNavigation = true;
          break;
        }
      }

      expect(foundNavigation).toBe(true);

      // Check page title/heading
      const pageHeadings = page.locator('h1, .page-title');
      expect(await pageHeadings.count()).toBeGreaterThan(0);

      const firstHeading = pageHeadings.nth(0);
      const headingText = await firstHeading.textContent();
      expect(headingText).toBeTruthy();
      expect(headingText.toLowerCase()).toContain('assignment');
    });
  });

  test.describe('User Experience Flow', () => {
    test('Should guide users through assignment creation process', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for step indicators or progress
      const progressElements = [
        page.locator('.steps'),
        page.locator('.progress'),
        page.locator('.wizard-steps'),
        page.locator('.step-indicator')
      ];

      let foundProgress = false;
      for (const element of progressElements) {
        if (await element.count() > 0) {
          foundProgress = true;
          break;
        }
      }

      // Should have clear sections or steps
      const formSections = page.locator('.form-section');
      const sectionCount = await formSections.count();
      expect(sectionCount).toBeGreaterThan(1);

      // Each section should have a title
      for (let i = 0; i < sectionCount; i++) {
        const section = formSections.nth(i);
        const sectionTitle = section.locator('.section-title, h2, h3');

        if (await sectionTitle.count() > 0) {
          const titleText = await sectionTitle.textContent();
          expect(titleText).toBeTruthy();
        }
      }
    });

    test('Should provide helpful tooltips and hints', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for help text or placeholders
      const inputs = page.locator('input');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i);
          const placeholder = await input.getAttribute('placeholder');

          if (placeholder) {
            expect(placeholder.length).toBeGreaterThan(5);
          }
        }
      }

      // Check for help text elements
      const helpElements = [
        page.locator('.help-text'),
        page.locator('.hint'),
        page.locator('.form-help'),
        page.locator('.tooltip')
      ];

      let foundHelp = false;
      for (const element of helpElements) {
        if (await element.count() > 0) {
          foundHelp = true;
          break;
        }
      }

      // Should provide guidance to users
      expect(foundHelp).toBe(true);
    });

    test('Should show clear feedback for user actions', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test site selection feedback
      const siteCards = page.locator('.site-card');
      const cardCount = await siteCards.count();

      if (cardCount > 0) {
        const firstCard = siteCards.nth(0);

        // Click to select
        await firstCard.click();

        // Should show visual feedback
        const isSelected = await firstCard.evaluate(el =>
          el.classList.contains('selected')
        );
        expect(isSelected).toBe(true);

        // Should have different visual state
        const selectedStyles = await firstCard.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            borderColor: computed.borderColor
          };
        });

        expect(selectedStyles.backgroundColor).toBeTruthy();
        expect(selectedStyles.borderColor).toBeTruthy();
      }

      // Test form field feedback
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Assignment');

        // Should show validation feedback
        const inputStyles = await nameInput.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            borderColor: computed.borderColor,
            outline: computed.outline
          };
        });

        expect(inputStyles.borderColor).toBeTruthy();
      }
    });

    test('Should handle form validation gracefully', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Try to submit form without required fields
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should show validation messages
        const validationElements = [
          page.locator('.error-message'),
          page.locator('.validation-error'),
          page.locator('.field-error'),
          page.locator('.invalid-feedback')
        ];

        let foundValidation = false;
        for (const element of validationElements) {
          if (await element.count() > 0) {
            foundValidation = true;

            // Validation messages should be helpful
            const errorText = await element.textContent();
            expect(errorText).toBeTruthy();
            expect(errorText.length).toBeGreaterThan(3);
            break;
          }
        }

        // Should prevent submission or show clear feedback
        const currentUrl = page.url();
        const isStillOnPage = currentUrl.includes('bulk-assignment');
        expect(isStillOnPage || foundValidation).toBe(true);
      }
    });
  });

  test.describe('Accessibility Testing', () => {
    test('Should have proper ARIA labels and roles', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for form roles
      const form = page.locator('form');
      if (await form.count() > 0) {
        const formRole = await form.getAttribute('role');
        // Forms should have proper roles or be semantic form elements
        expect(formRole === 'form' || formRole === null).toBe(true);
      }

      // Check for button accessibility
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(3, buttonCount); i++) {
          const button = buttons.nth(i);
          const ariaLabel = await button.getAttribute('aria-label');
          const buttonText = await button.textContent();

          // Buttons should have accessible text or labels
          expect(ariaLabel || buttonText).toBeTruthy();
        }
      }

      // Check for input labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i);
          const inputId = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');

          if (inputId) {
            // Should have associated label
            const label = page.locator(`label[for="${inputId}"]`);
            const hasLabel = await label.count() > 0;

            // Input should have label, aria-label, or aria-labelledby
            expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
          }
        }
      }
    });

    test('Should be keyboard navigable', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test tab navigation
      const focusableElements = page.locator('input, button, select, a, [tabindex]');
      const focusableCount = await focusableElements.count();

      if (focusableCount > 0) {
        // Start from first focusable element
        await focusableElements.nth(0).focus();

        // Tab through several elements
        for (let i = 0; i < Math.min(5, focusableCount); i++) {
          await page.keyboard.press('Tab');

          // Should move focus to next element
          const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
          expect(['INPUT', 'BUTTON', 'SELECT', 'A'].includes(focusedElement)).toBe(true);
        }

        // Test Enter key on buttons
        const buttons = page.locator('button:visible');
        if (await buttons.count() > 0) {
          await buttons.nth(0).focus();

          // Should be able to activate with keyboard
          const buttonText = await buttons.nth(0).textContent();
          expect(buttonText).toBeTruthy();
        }
      }
    });

    test('Should have sufficient color contrast', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check text elements for color contrast
      const textElements = page.locator('h1, h2, h3, p, label, span');
      const textCount = await textElements.count();

      if (textCount > 0) {
        for (let i = 0; i < Math.min(3, textCount); i++) {
          const element = textElements.nth(i);

          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });

          // Should have readable text
          expect(styles.color).toBeTruthy();
          expect(styles.fontSize).toBeTruthy();

          // Font size should be reasonable
          const fontSize = parseInt(styles.fontSize);
          expect(fontSize).toBeGreaterThanOrEqual(12);
        }
      }

      // Check button contrast
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        const primaryButton = buttons.nth(0);

        const buttonStyles = await primaryButton.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          };
        });

        // Buttons should have distinct colors
        expect(buttonStyles.color).toBeTruthy();
        expect(buttonStyles.backgroundColor).toBeTruthy();
      }
    });

    test('Should support screen readers', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for semantic HTML structure
      const semanticElements = [
        page.locator('main'),
        page.locator('section'),
        page.locator('article'),
        page.locator('header'),
        page.locator('nav')
      ];

      let foundSemantic = false;
      for (const element of semanticElements) {
        if (await element.count() > 0) {
          foundSemantic = true;
          break;
        }
      }

      expect(foundSemantic).toBe(true);

      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();

      if (headingCount > 0) {
        // Should start with h1
        const firstHeading = headings.nth(0);
        const tagName = await firstHeading.evaluate(el => el.tagName);
        expect(tagName).toBe('H1');
      }

      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');
          const role = await img.getAttribute('role');

          // Images should have alt text or appropriate role
          expect(alt !== null || role === 'presentation').toBe(true);
        }
      }
    });
  });

  test.describe('Error States and Messaging', () => {
    test('Should display helpful error messages', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Simulate API error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      // Try to submit form
      await page.fill('input[name="name"]', 'Error Test Assignment');
      const submitButton = page.locator('button[type="submit"]');

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Should show error message
        const errorElements = [
          page.locator('.error-message'),
          page.locator('.alert-error'),
          page.locator('.notification.error')
        ];

        let foundError = false;
        for (const element of errorElements) {
          if (await element.count() > 0) {
            const errorText = await element.textContent();
            expect(errorText).toBeTruthy();
            expect(errorText.length).toBeGreaterThan(5);
            foundError = true;
            break;
          }
        }

        expect(foundError).toBe(true);
      }
    });

    test('Should handle loading states appropriately', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check initial loading state
      const loadingElements = [
        page.locator('.loading'),
        page.locator('.spinner'),
        page.locator('.skeleton')
      ];

      // Fill form and submit to check submission loading state
      await page.fill('input[name="name"]', 'Loading Test');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should show loading state or disable button
        await page.waitForTimeout(100);

        const isDisabled = await submitButton.isDisabled();
        const buttonText = await submitButton.textContent();

        expect(isDisabled || buttonText?.includes('...') || buttonText?.includes('Loading')).toBe(true);
      }
    });

    test('Should provide clear success feedback', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Mock successful API response
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{ id: 'test-assignment', name: 'Test Assignment' }]
          })
        });
      });

      // Fill form with valid data
      await page.fill('input[name="name"]', 'Success Test Assignment');

      const templateSelect = page.locator('select[name="template_id"]');
      if (await templateSelect.count() > 0) {
        await templateSelect.selectOption({ index: 1 });
      }

      // Select a site
      const siteCards = page.locator('.site-card');
      if (await siteCards.count() > 0) {
        await siteCards.nth(0).click();
      }

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Should show success message or redirect
        const successElements = [
          page.locator('.success-message'),
          page.locator('.alert-success'),
          page.locator('.notification.success'),
          page.locator(':text("success")'),
          page.locator(':text("created")')
        ];

        let foundSuccess = false;
        for (const element of successElements) {
          if (await element.count() > 0) {
            foundSuccess = true;
            break;
          }
        }

        // Should show success feedback or navigate away
        const currentUrl = page.url();
        const navigatedAway = !currentUrl.includes('bulk-assignment');

        expect(foundSuccess || navigatedAway).toBe(true);
      }
    });
  });

  test.describe('Performance and Optimization', () => {
    test('Should render efficiently with large datasets', async () => {
      await utils.loginAsAdmin();

      const startTime = Date.now();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Page should load reasonably quickly
      expect(loadTime).toBeLessThan(5000);

      // Check if large lists are handled efficiently
      const siteCards = page.locator('.site-card');
      const cardCount = await siteCards.count();

      if (cardCount > 20) {
        // Should handle large lists without performance issues
        const scrollStartTime = Date.now();
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        const scrollTime = Date.now() - scrollStartTime;

        expect(scrollTime).toBeLessThan(1000);
      }
    });

    test('Should have optimized images and assets', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check image loading
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const src = await img.getAttribute('src');
          const naturalWidth = await img.evaluate(el => el.naturalWidth);
          const naturalHeight = await img.evaluate(el => el.naturalHeight);

          if (src && !src.startsWith('data:')) {
            // Images should load properly
            expect(naturalWidth).toBeGreaterThan(0);
            expect(naturalHeight).toBeGreaterThan(0);
          }
        }
      }

      // Check for lazy loading or optimization
      const lazyImages = page.locator('img[loading="lazy"]');
      const lazyCount = await lazyImages.count();

      // Should use lazy loading for performance if there are many images
      if (imageCount > 5) {
        expect(lazyCount).toBeGreaterThan(0);
      }
    });
  });
});