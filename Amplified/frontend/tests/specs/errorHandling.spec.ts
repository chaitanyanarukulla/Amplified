import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Error Handling', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await mockApi(page);
        navPage = new NavPage(page);
        await navPage.goto();
    });

    test('should handle API errors gracefully for suggestions', async ({ page }) => {
        // Mock API to return error
        await page.route('**/qa/meeting', async (route) => {
            await route.fulfill({
                status: 500,
                json: { error: 'Internal server error' },
            });
        });

        // Navigate to Meeting Assistant
        await page.getByText('Meeting Assistant', { exact: true }).click();

        // Start meeting
        await page.getByTestId('btn-start-meeting').click();
        await page.waitForTimeout(1000);

        // Try to get suggestion
        const suggestBtn = page.getByTestId('btn-suggest-answer');
        if (await suggestBtn.isVisible()) {
            await suggestBtn.click();

            // Should show error toast
            await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 5000 });
        }
    });

    test('should handle network errors', async ({ page }) => {
        // Mock network failure
        await page.route('**/meetings', async (route) => {
            await route.abort('failed');
        });

        // Navigate to history
        await page.getByTestId('nav-item-history').click();
        await page.waitForTimeout(1000);

        // Should still show the UI (graceful degradation)
        await expect(page.getByText('Meeting History')).toBeVisible();
    });

    test('should handle missing voice profile', async ({ page }) => {
        // Mock no voice profile
        await page.route('**/voice-profile**', async (route) => {
            await route.fulfill({ status: 404 });
        });

        // Navigate to voice enrollment
        await page.getByTestId('nav-item-voice').click();

        // Should show enrollment UI
        await expect(page.getByText('Enroll Your Voice')).toBeVisible();
    });

    test('should validate file uploads', async ({ page }) => {
        // Navigate to Meeting Assistant
        await page.getByText('Meeting Assistant', { exact: true }).click();

        // Switch to documents tab
        const docTab = page.getByTestId('tab-meeting-documents');
        if (await docTab.isVisible()) {
            await docTab.click();
            await page.waitForTimeout(500);

            // File input should have accept attribute
            const fileInput = page.locator('#meeting-doc-upload');
            await expect(fileInput).toHaveAttribute('accept', /.pdf|.docx|.txt/);
        }
    });

    test('should handle WebSocket disconnection', async ({ page }) => {
        // Navigate to Interview Assistant
        await page.getByText('Interview Assistant', { exact: true }).click();

        // Should show UI even if WebSocket is not connected
        await expect(page.getByText('Stall / Pivot')).toBeVisible();

        // The header should show connection status
        // Look for PAUSED or LISTENING indicator
        await expect(page.getByText(/PAUSED|LISTENING/i)).toBeVisible();
    });
});
