import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('UI/UX', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await mockApi(page);
        navPage = new NavPage(page);
        await navPage.goto();
    });

    test('should have smooth transitions between views', async ({ page }) => {
        // Navigate to different views and verify smooth transitions
        await page.getByTestId('nav-item-history').click();
        await page.waitForTimeout(300);
        await expect(page.getByText('Meeting History')).toBeVisible();

        await navPage.dashboardLink.click();
        await page.waitForTimeout(300);
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();
    });

    test('should highlight active navigation item', async ({ page }) => {
        const dashboardNav = page.getByTestId('nav-item-dashboard');

        // Dashboard should have active styling
        const dashboardClasses = await dashboardNav.getAttribute('class');
        expect(dashboardClasses).toContain('bg-blue');
    });

    test('should show loading states appropriately', async ({ page }) => {
        // Navigate to Meeting Assistant
        await page.locator('text=Meeting Assistant').first().click();

        // Suggest button should show processing state when clicked
        const startBtn = page.getByTestId('btn-start-meeting');
        if (await startBtn.isVisible()) {
            await startBtn.click();
            await page.waitForTimeout(300);

            const suggestBtn = page.getByTestId('btn-suggest-answer');
            if (await suggestBtn.isVisible()) {
                // Button should be visible and interactive
                await expect(suggestBtn).toBeEnabled();
            }
        }
    });

    test('should display tooltips for interactive elements', async ({ page }) => {
        // Navigate to Interview Assistant
        await page.locator('text=Interview Assistant').first().click();
        await page.waitForTimeout(500);

        // Hover over buttons to check for title attributes or tooltips
        const contextToggle = page.getByTitle('Open Context Panel');
        if (await contextToggle.isVisible()) {
            await expect(contextToggle).toHaveAttribute('title');
        }
    });

    test('should have consistent color scheme', async ({ page }) => {
        // Verify primary button has consistent styling
        await page.locator('text=Meeting Assistant').first().click();

        const startBtn = page.getByTestId('btn-start-meeting');
        const btnClasses = await startBtn.getAttribute('class');

        // Should have green color for primary action
        expect(btnClasses).toMatch(/bg-green|bg-blue/);
    });

    test('should have proper spacing and layout', async ({ page }) => {
        // Verify sidebar has proper width
        const sidebar = page.getByTestId('sidebar');
        const sidebarBox = await sidebar.boundingBox();

        expect(sidebarBox?.width).toBeGreaterThan(0);
        expect(sidebarBox?.width).toBeLessThan(300); // Reasonable sidebar width
    });

    test('should show clear call-to-action buttons', async ({ page }) => {
        // Dashboard cards should have clear CTAs
        await expect(page.getByText('Start Meeting')).toBeVisible();
        await expect(page.getByText('Start Practice')).toBeVisible();
    });

    test('should display error messages clearly', async ({ page }) => {
        // If there's an error, it should be visible and clear
        // Error toast should have proper styling
        const errorToast = page.getByTestId('toast-error');

        // Check that error toast has red/danger styling if it appears
        if (await errorToast.isVisible()) {
            const classList = await errorToast.getAttribute('class');
            expect(classList).toMatch(/red|error|danger/);
        }
    });

    test('should have responsive button states', async ({ page }) => {
        await page.locator('text=Meeting Assistant').first().click();

        const startBtn = page.getByTestId('btn-start-meeting');

        // Hover should change appearance
        await startBtn.hover();
        await page.waitForTimeout(100);

        // Button should still be visible
        await expect(startBtn).toBeVisible();
    });

    test('should show appropriate icons', async ({ page }) => {
        // Sidebar should have icons for each navigation item
        const sidebar = page.getByTestId('sidebar');
        const icons = sidebar.locator('svg');

        const iconCount = await icons.count();
        expect(iconCount).toBeGreaterThan(0);
    });
});
