import { test, expect } from '@playwright/test';

test.describe('Template Creation Page', () => {
  // Helper function to navigate to step 2
  async function navigateToStep2(page, templateName = 'Test Template') {
    await page.fill('#template-name', templateName);
    await page.selectOption('#template-category', 'safety');
    await page.click('button:text("Next: Add Sections & Questions")');
    await expect(page.locator('h3.section-title')).toContainText('Sections & Questions');
  }

  // Helper function to add a section
  async function addSection(page, name = 'Test Section', description = 'Test description') {
    // First click "Add First Section" button if it exists
    const addFirstSectionBtn = page.locator('button:text("Add First Section")');
    if (await addFirstSectionBtn.isVisible()) {
      await addFirstSectionBtn.click();
    }

    // Wait for the section form to appear and fill it
    await page.waitForSelector('input[placeholder*="Section name"]', { timeout: 5000 });
    await page.fill('input[placeholder*="Section name"]', name);
    await page.fill('textarea[placeholder*="Brief description"]', description);
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/templates/new');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load template creation page successfully', async ({ page }) => {
    // Check if the main elements are present (Step 1)
    await expect(page.locator('h3.section-title')).toContainText('Basic Information');
    await expect(page.locator('#template-name')).toBeVisible();
    await expect(page.locator('#template-category')).toBeVisible();
  });

  test('should navigate through wizard steps', async ({ page }) => {
    // Step 1: Basic Information
    await page.fill('#template-name', 'Test Safety Inspection');
    await page.fill('#template-description', 'A comprehensive safety inspection template');
    await page.selectOption('#template-category', 'safety');
    await page.fill('#estimated-time', '30');

    // Move to Step 2
    await page.click('button:text("Next: Add Sections & Questions")');
    await expect(page.locator('h3.section-title')).toContainText('Sections & Questions');

    // Add section
    await addSection(page, 'Fire Safety', 'Fire safety inspection checklist');

    // Move to Step 3 (should require at least one section)
    await page.click('button:text("Next: Preview Template")');
    await expect(page.locator('h3.section-title')).toContainText('Template Preview');
  });

  test('should add and manage questions in desktop view', async ({ page }) => {
    // Set viewport to desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    await navigateToStep2(page, 'Desktop Test Template');
    await addSection(page, 'Safety Check', 'Safety inspection items');

    // Add a question
    await page.click('button:text("Add First Question")');

    // In desktop view, verify horizontal layout exists
    const questionHeader = page.locator('.question-compact-header').first();
    await expect(questionHeader).toBeVisible();

    // Fill question details in desktop layout
    await page.fill('input[placeholder="Enter your question..."]', 'Is the fire extinguisher accessible?');
    await page.selectOption('select', 'yes_no');
    await page.check('input[type="checkbox"]:near(:text("Required"))');

    // Verify question was added
    await expect(page.locator('input[placeholder="Enter your question..."]')).toHaveValue('Is the fire extinguisher accessible?');
  });

  test('should test question management actions in desktop view', async ({ page }) => {
    // Set viewport to desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    await navigateToStep2(page, 'Question Management Test');
    await addSection(page, 'Safety Check');

    // Add multiple questions
    await page.click('button:text("Add First Question")');
    await page.fill('input[placeholder="Enter your question..."]', 'Question 1');

    // Try both button texts for adding subsequent questions
    const addQuestionBtn = page.locator('button:text("Add Question"), button:text("Add First Question")').first();
    await addQuestionBtn.click();

    // Wait for the second question input to be visible and fill it
    await page.waitForSelector('input[placeholder="Enter your question..."]', { timeout: 5000 });
    const secondQuestionInput = page.locator('input[placeholder="Enter your question..."]').nth(1);
    await secondQuestionInput.waitFor({ state: 'visible' });
    await secondQuestionInput.fill('Question 2');

    // Test duplicate functionality
    const duplicateButton = page.locator('button[title="Duplicate"]').first();
    await duplicateButton.click();

    // Should have 3 questions now
    const questionCount = await page.locator('.question-compact').count();
    expect(questionCount).toBe(3);

    // Test move down functionality (if first question can move down)
    const moveDownButton = page.locator('button[title="Move Down"]').first();
    if (await moveDownButton.isEnabled()) {
      await moveDownButton.click();
    }

    // Test move up functionality (if second question can move up)
    const moveUpButton = page.locator('button[title="Move Up"]').nth(1);
    if (await moveUpButton.isEnabled()) {
      await moveUpButton.click();
    }
  });

  test('should test question management in mobile view', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await navigateToStep2(page, 'Mobile Test Template');
    await addSection(page, 'Mobile Safety Check');

    // Add a question
    await page.click('button:text("Add First Question")');

    // In mobile view, verify vertical stacking
    const questionHeader = page.locator('.question-compact-header').first();
    await expect(questionHeader).toBeVisible();

    // Verify mobile action buttons are visible
    const mobileActions = page.locator('.question-compact-header').first().locator('[title="Duplicate"]');
    await expect(mobileActions).toBeVisible();

    // Fill question in mobile layout
    await page.fill('input[placeholder="Enter your question..."]', 'Mobile safety question');
    await page.selectOption('select', 'text');

    // Test mobile actions
    await page.click('[title="Duplicate"]');

    // Should have 2 questions
    const questionCount = await page.locator('.question-compact').count();
    expect(questionCount).toBe(2);
  });

  test('should validate required fields', async ({ page }) => {
    // Try to proceed without filling required fields
    const nextButton = page.locator('button:text("Next: Add Sections & Questions")');

    // Should be disabled when no name is provided
    await expect(nextButton).toBeDisabled();

    // Add name but no category
    await page.fill('#template-name', 'Test');
    await expect(nextButton).toBeDisabled();

    // Add category - should enable next button
    await page.selectOption('#template-category', 'safety');
    await expect(nextButton).toBeEnabled();
  });

  test('should test responsive layout on different screen sizes', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToStep2(page, 'Mobile Layout Test');
    await addSection(page, 'Mobile Section');
    await page.click('button:text("Add First Question")');

    // Verify mobile layout - action buttons should be visible
    const mobileActionButtons = page.locator('[title="Duplicate"]');
    await expect(mobileActionButtons.first()).toBeVisible();

    // Test desktop layout
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload(); // Reload to apply new layout
    await navigateToStep2(page, 'Desktop Layout Test');
    await addSection(page, 'Desktop Section');
    await page.click('button:text("Add First Question")');

    // Verify desktop layout - should be horizontal
    const desktopQuestionHeader = page.locator('.question-compact-header').first();
    await expect(desktopQuestionHeader).toBeVisible();
  });
});