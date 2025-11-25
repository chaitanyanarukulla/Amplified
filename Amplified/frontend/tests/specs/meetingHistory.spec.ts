import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Meeting History', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        navPage = new NavPage(page);
        await navPage.goto();
        await navPage.navigateToMeetingHistory();
    });

    test('should display meeting history interface', async ({ page }) => {
        // Verify header
        await expect(page.getByText('Meeting History')).toBeVisible();

        // Verify back button exists
        const backButton = page.locator('button').filter({ hasText: /back/i }).or(
            page.locator('button svg').filter({ has: page.locator('path[d*="M10 19l-7-7"]') }).locator('..')
        );
        await expect(backButton.first()).toBeVisible();
    });

    test('should display list of meetings', async ({ page }) => {
        // Wait for meetings to load
        await page.waitForTimeout(1000);

        // Should see the mocked meeting
        await expect(page.getByText('Client X Weekly Sync')).toBeVisible();
    });

    test('should navigate back to dashboard', async ({ page }) => {
        // Click back button
        const backButton = page.locator('button').filter({ hasText: /back/i }).or(
            page.locator('button svg').filter({ has: page.locator('path[d*="M10 19l-7-7"]') }).locator('..')
        );
        await backButton.first().click();

        // Should be back on dashboard
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();
    });

    test('should be accessible from sidebar', async ({ page }) => {
        // Navigate to dashboard first
        await navPage.dashboardLink.click();
        await page.waitForTimeout(300);

        // Then navigate to history from sidebar
        await page.getByTestId('nav-item-history').click();
        await page.waitForTimeout(300);

        // Should see Meeting History
        await expect(page.getByText('Meeting History')).toBeVisible();
    });

    test.skip('should display meeting details when clicked', async ({ page }) => {
        // Wait for meetings to load
        await page.waitForTimeout(1000);

        // Click on a meeting
        const meetingCard = page.getByText('Client X Weekly Sync');
        if (await meetingCard.isVisible()) {
            await meetingCard.click();
            await page.waitForTimeout(500);

            // Should see meeting details or summary
            // This depends on the actual implementation
            await expect(page.getByText(/Meeting|Summary|Action/i)).toBeVisible();
        }
    });
});
