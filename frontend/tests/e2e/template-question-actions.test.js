import { test, expect } from '@playwright/test';

test.describe('Template Creation - Question Action Buttons', () => {
  test('should show question action buttons when creating a new template', async ({ page }) => {
    // Navigate to template creation page
    await page.goto('http://localhost:5173/templates/create');

    // Fill in basic template information (Step 1)
    await page.fill('input[id="template-name"]', 'Test Template');
    await page.selectOption('select[id="template-category"]', 'safety');
    await page.fill('textarea[id="template-description"]', 'Test description');

    // Click Next to go to Step 2
    await page.click('button:has-text("Next: Add Sections & Questions")');

    // Wait for Step 2 to load
    await expect(page.locator('h3:has-text("Sections & Questions")')).toBeVisible();

    // Should see the "Add First Section" button since no sections exist
    await expect(page.locator('button:has-text("Add First Section")')).toBeVisible();

    // Click "Add First Section"
    await page.click('button:has-text("Add First Section")');

    // Fill in section name
    await page.fill('input.section-name-input', 'Safety Section');

    // Should see "Add First Question" button
    await expect(page.locator('button:has-text("Add First Question")')).toBeVisible();

    // Click "Add First Question"
    await page.click('button:has-text("Add First Question")');

    // Fill in question title
    await page.fill('input[placeholder="Enter your question..."]', 'Is the site safe?');

    // Now check if action buttons are visible
    console.log('Checking for question action buttons...');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'question-actions-debug.png' });

    // Check for action buttons - they should be visible
    const moveUpButton = page.locator('button[title="Move Up"]');
    const moveDownButton = page.locator('button[title="Move Down"]');
    const duplicateButton = page.locator('button[title="Duplicate"]');
    const deleteButton = page.locator('button[title="Delete"]');

    console.log('Move Up button count:', await moveUpButton.count());
    console.log('Move Down button count:', await moveDownButton.count());
    console.log('Duplicate button count:', await duplicateButton.count());
    console.log('Delete button count:', await deleteButton.count());

    // These buttons should exist but move up/down might be disabled
    await expect(duplicateButton.first()).toBeVisible();
    await expect(deleteButton.first()).toBeVisible();

    // Add a second question to test move buttons
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder="Enter your question..."]:nth-of-type(2)', 'Second question?');

    // Now both questions should have action buttons
    await expect(moveUpButton).toHaveCount(2); // One for each question
    await expect(moveDownButton).toHaveCount(2);
    await expect(duplicateButton).toHaveCount(2);
    await expect(deleteButton).toHaveCount(2);

    // Test duplicate functionality
    await duplicateButton.first().click();

    // Should now have 3 questions
    await expect(page.locator('input[placeholder="Enter your question..."]')).toHaveCount(3);

    // Test delete functionality
    await deleteButton.first().click();

    // Handle the confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    // Should be back to 2 questions
    await expect(page.locator('input[placeholder="Enter your question..."]')).toHaveCount(2);

    console.log('Template creation question actions test completed');
  });
});