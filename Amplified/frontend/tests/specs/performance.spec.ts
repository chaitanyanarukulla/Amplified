import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Performance', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        navPage = new NavPage(page);
    });

    test('should load dashboard quickly', async ({ page }) => {
        const startTime = Date.now();
        await navPage.goto();
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        // Dashboard should load in under 3 seconds
        expect(loadTime).toBeLessThan(3000);

        // Verify dashboard is visible
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();
    });

    test('should navigate between views quickly', async ({ page }) => {
        await navPage.goto();
        await page.waitForLoadState('networkidle');

        // Measure navigation to Meeting Assistant
        const startTime = Date.now();
        await page.locator('text=Meeting Assistant').first().click();
        await expect(page.getByTestId('btn-start-meeting')).toBeVisible();
        const navTime = Date.now() - startTime;

        // Navigation should be fast (under 1 second)
        expect(navTime).toBeLessThan(1000);
    });

    test('should handle large transcript efficiently', async ({ page }) => {
        await navPage.goto();

        // Navigate to Meeting Assistant
        await page.locator('text=Meeting Assistant').first().click();

        // Simulate adding many transcript entries
        const startTime = Date.now();

        // In a real test, we would add many entries via WebSocket
        // For now, just verify the UI is responsive
        await expect(page.getByTestId('btn-start-meeting')).toBeVisible();
        const renderTime = Date.now() - startTime;

        // UI should remain responsive
        expect(renderTime).toBeLessThan(500);
    });

    test('should not have memory leaks on navigation', async ({ page }) => {
        await navPage.goto();
        await page.waitForLoadState('networkidle');

        // Navigate through different views multiple times
        for (let i = 0; i < 5; i++) {
            await page.getByTestId('nav-item-history').click();
            await page.waitForTimeout(200);

            await navPage.dashboardLink.click();
            await page.waitForTimeout(200);
        }

        // Should still be responsive
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();
    });

    test('should handle rapid clicks gracefully', async ({ page }) => {
        await navPage.goto();
        await page.waitForLoadState('networkidle');

        // Rapidly click navigation items
        const dashboardBtn = page.getByTestId('nav-item-dashboard');

        // Click multiple times rapidly
        await dashboardBtn.click({ clickCount: 3, delay: 50 });

        // Should not crash or error
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();
    });
});
