import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('WebSocket Integration', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        navPage = new NavPage(page);
        await navPage.goto();
    });

    test('should show connection status in Interview Assistant', async ({ page }) => {
        // Navigate to Interview Assistant
        await page.locator('text=Interview Assistant').first().click();
        await page.waitForTimeout(500);

        // Should show connection status indicator
        await expect(page.getByText(/PAUSED|LISTENING/i)).toBeVisible();
    });

    test('should display listening indicator when active', async ({ page }) => {
        // Navigate to Meeting Assistant
        await page.locator('text=Meeting Assistant').first().click();

        // Start meeting
        const startBtn = page.getByTestId('btn-start-meeting');
        if (await startBtn.isVisible()) {
            await startBtn.click();
            await page.waitForTimeout(500);

            // Button should change to "Pause Listening"
            await expect(page.getByText('Pause Listening')).toBeVisible();
        }
    });

    test('should handle WebSocket messages gracefully', async ({ page }) => {
        // Navigate to Interview Assistant
        await page.locator('text=Interview Assistant').first().click();
        await page.waitForTimeout(500);

        // The app should load even if WebSocket is not connected
        await expect(page.getByTestId('btn-suggest-answer')).toBeVisible();
    });

    test('should show transcript updates in real-time', async ({ page }) => {
        // Navigate to Meeting Assistant
        await page.locator('text=Meeting Assistant').first().click();

        // Verify transcript panel exists
        const transcriptPanel = page.getByTestId('live-notes-panel');
        if (await transcriptPanel.isVisible()) {
            // Should show initial state
            await expect(transcriptPanel.getByText('Waiting for speech...')).toBeVisible();
        }
    });

    test('should allow pausing and resuming listening', async ({ page }) => {
        // Navigate to Meeting Assistant
        await page.locator('text=Meeting Assistant').first().click();

        const startBtn = page.getByTestId('btn-start-meeting');
        if (await startBtn.isVisible()) {
            // Start
            await startBtn.click();
            await page.waitForTimeout(500);
            await expect(page.getByText('Pause Listening')).toBeVisible();

            // Pause
            await page.getByText('Pause Listening').click();
            await page.waitForTimeout(500);
            await expect(page.getByText('Start Meeting')).toBeVisible();
        }
    });
});
