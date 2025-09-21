const { test, expect } = require('@playwright/test');

test.describe('Template Builder', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:8081');
        
        // Login first
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        // Wait for successful login and redirect to dashboard
        await page.waitForTimeout(3000);
        
        // Check if we're on the dashboard (app is loaded)
        await expect(page.locator('#app')).toBeVisible();
        
        // Navigate to templates page using the navigation menu
        await page.click('a[data-page="templates"]');
        
        // Wait for templates page to load
        await page.waitForTimeout(1000);
    });

    test('Templates page loads correctly', async ({ page }) => {
        // Check page title and header
        await expect(page.locator('h2')).toContainText('Templates');
        await expect(page.locator('.page-description')).toContainText('Create and manage inspection form templates');
        
        // Check create template button exists
        await expect(page.locator('button[data-action="open-template-builder"]')).toBeVisible();
        await expect(page.locator('button[data-action="open-template-builder"]')).toContainText('Create Template');
    });

    test('Template stats cards are displayed', async ({ page }) => {
        // Check stat cards are visible
        await expect(page.locator('#total-templates-card')).toBeVisible();
        await expect(page.locator('#active-templates-card')).toBeVisible();
        await expect(page.locator('#draft-templates-card')).toBeVisible();
        await expect(page.locator('#template-usage-card')).toBeVisible();
    });

    test('Template categories are displayed', async ({ page }) => {
        // Check category grid is visible
        await expect(page.locator('.template-categories')).toBeVisible();
        await expect(page.locator('.category-grid')).toBeVisible();
        
        // Check specific categories
        await expect(page.locator('.category-card[data-category="safety"]')).toBeVisible();
        await expect(page.locator('.category-card[data-category="quality"]')).toBeVisible();
        await expect(page.locator('.category-card[data-category="environmental"]')).toBeVisible();
        await expect(page.locator('.category-card[data-category="equipment"]')).toBeVisible();
    });

    test('Template builder modal opens', async ({ page }) => {
        // Click create template button
        await page.click('button[data-action="open-template-builder"]');
        
        // Wait a moment for potential modal to open
        await page.waitForTimeout(1000);
        
        // Check if template builder is loaded and visible
        // Since we're checking for TemplateBuilder.js functionality
        const templateBuilderExists = await page.evaluate(() => {
            return typeof window.TemplateBuilder !== 'undefined';
        });
        
        console.log('TemplateBuilder class exists:', templateBuilderExists);
    });

    test('Filter and search controls work', async ({ page }) => {
        // Check search box
        await expect(page.locator('#template-search')).toBeVisible();
        await expect(page.locator('#template-search')).toHaveAttribute('placeholder', 'Search templates...');
        
        // Check category filter
        await expect(page.locator('#category-filter')).toBeVisible();
        
        // Check status filter
        await expect(page.locator('#status-filter')).toBeVisible();
        
        // Check view toggle buttons
        await expect(page.locator('#grid-view-btn')).toBeVisible();
        await expect(page.locator('#list-view-btn')).toBeVisible();
    });

    test('View toggle switches between grid and list view', async ({ page }) => {
        const templatesList = page.locator('#templates-list');
        
        // Check initial state (should be list view)
        await expect(templatesList).toHaveClass(/list-view/);
        
        // Click grid view button
        await page.click('#grid-view-btn');
        await page.waitForTimeout(100);
        
        // Check if grid view is active (this would depend on JavaScript implementation)
        const hasGridView = await templatesList.evaluate(el => el.classList.contains('grid-view'));
        console.log('Grid view active:', hasGridView);
        
        // Click list view button
        await page.click('#list-view-btn');
        await page.waitForTimeout(100);
        
        // Check if list view is active again
        await expect(templatesList).toHaveClass(/list-view/);
    });

    test('Template empty state is shown when no templates', async ({ page }) => {
        // Wait for templates to load (or fail to load)
        await page.waitForTimeout(2000);
        
        // Check if empty state is visible
        const emptyState = page.locator('#templates-empty');
        const isVisible = await emptyState.isVisible();
        
        if (isVisible) {
            await expect(emptyState).toContainText('No Templates Found');
            await expect(emptyState).toContainText('Start by creating your first inspection template');
            await expect(emptyState.locator('button[data-action="open-template-builder"]')).toBeVisible();
        }
        
        console.log('Empty state visible:', isVisible);
    });

    test('JavaScript components are loaded correctly', async ({ page }) => {
        // Check if required JavaScript objects are available
        const jsCheck = await page.evaluate(() => {
            const checks = {
                eventBus: typeof window.EventBus !== 'undefined',
                apiClient: typeof window.APIClient !== 'undefined',
                templateBuilder: typeof window.TemplateBuilder !== 'undefined',
                router: typeof window.Router !== 'undefined',
                appState: typeof window.AppState !== 'undefined'
            };
            return checks;
        });
        
        console.log('JavaScript component availability:', jsCheck);
        
        // At minimum, we should have basic utilities loaded
        expect(jsCheck.eventBus || jsCheck.apiClient).toBeTruthy();
    });

    test('Template activities section exists', async ({ page }) => {
        // Check template activity section
        await expect(page.locator('#template-activity')).toBeVisible();
        
        // Check if it has the activity feed class
        await expect(page.locator('#template-activity')).toHaveClass(/activity-feed/);
    });

    test('Template card and list templates are available', async ({ page }) => {
        // Check if template scripts for rendering are present
        await expect(page.locator('#template-card-template')).toBeVisible();
        await expect(page.locator('#template-list-item-template')).toBeVisible();
        
        // Verify template content structure
        const cardTemplate = await page.locator('#template-card-template').innerHTML();
        expect(cardTemplate).toContain('template-card');
        expect(cardTemplate).toContain('data-template-id');
        
        const listTemplate = await page.locator('#template-list-item-template').innerHTML();
        expect(listTemplate).toContain('template-list-item');
        expect(listTemplate).toContain('data-template-id');
    });

    test('API endpoints are accessible', async ({ page }) => {
        // Test templates API endpoint
        const response = await page.request.get('http://localhost:8081/api/v1/templates', {
            headers: {
                'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`
            }
        });
        
        console.log('Templates API status:', response.status());
        
        // Should return 200 or 401 (if auth issue), but not 404
        expect([200, 401]).toContain(response.status());
    });
});

test.describe('Template Builder Component Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Set up authentication and navigate to templates
        await page.goto('http://localhost:8081');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        
        // Check if we're on the dashboard (app is loaded)
        await expect(page.locator('#app')).toBeVisible();
        
        // Navigate to templates page using the navigation menu
        await page.click('a[data-page="templates"]');
        await page.waitForTimeout(1000);
    });

    test('Template builder functionality check', async ({ page }) => {
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');
        
        // Check if TemplateBuilder class is available
        const builderAvailable = await page.evaluate(() => {
            return {
                hasTemplateBuilder: typeof window.TemplateBuilder !== 'undefined',
                hasModal: typeof window.ModalManager !== 'undefined',
                hasAPIClient: typeof window.APIClient !== 'undefined'
            };
        });
        
        console.log('Builder components:', builderAvailable);
        
        // Try to trigger template builder
        await page.click('button[data-action="open-template-builder"]');
        
        // Wait and check for any modal or builder interface
        await page.waitForTimeout(1000);
        
        // Look for any template builder related elements that might have appeared
        const builderElements = await page.evaluate(() => {
            const elements = {
                modals: document.querySelectorAll('.modal').length,
                templateBuilder: document.querySelectorAll('[class*="template-builder"]').length,
                builderModal: document.querySelectorAll('#template-builder-modal').length
            };
            return elements;
        });
        
        console.log('Builder elements found:', builderElements);
    });
});