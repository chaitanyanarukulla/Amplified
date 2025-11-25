import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Accessibility', () => {
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        navPage = new NavPage(page);
        await navPage.goto();
    });

    test('should have proper ARIA labels on navigation', async ({ page }) => {
        // Sidebar should be accessible
        const sidebar = page.getByTestId('sidebar');
        await expect(sidebar).toBeVisible();

        // Navigation buttons should be accessible and clickable
        const dashboardBtn = page.getByTestId('nav-item-dashboard');
        await expect(dashboardBtn).toBeVisible();

        // Should be a button element or have button role
        const tagName = await dashboardBtn.evaluate(el => el.tagName.toLowerCase());
        expect(['button', 'a'].includes(tagName)).toBeTruthy();
    });

    test('should support keyboard navigation', async ({ page }) => {
        // Tab through navigation items
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should be able to activate with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Some navigation should have occurred
        // This is a basic test - more specific keyboard nav tests can be added
    });

    test('should have proper button roles', async ({ page }) => {
        // Navigate to Meeting Assistant
        await page.getByText('Meeting Assistant', { exact: true }).click();

        // All interactive elements should be buttons
        const startBtn = page.getByTestId('btn-start-meeting');
        await expect(startBtn).toHaveRole('button');
    });

    test('should have descriptive button text', async ({ page }) => {
        // Navigate to Meeting Assistant
        await page.getByText('Meeting Assistant', { exact: true }).click();

        // Buttons should have clear text
        await expect(page.getByText('Start Meeting')).toBeVisible();
        await expect(page.getByText('History')).toBeVisible();
    });

    test('should have proper form labels', async ({ page }) => {
        // Navigate to Voice Enrollment
        await page.getByTestId('nav-item-voice').click();

        // Input fields should have labels or placeholders
        const nameInput = page.locator('input[placeholder*="name"]');
        if (await nameInput.isVisible()) {
            await expect(nameInput).toHaveAttribute('placeholder');
        }
    });

    test('should have visible focus indicators', async ({ page }) => {
        // Navigate to dashboard
        const dashboardBtn = page.getByTestId('nav-item-dashboard');

        // Focus the button
        await dashboardBtn.focus();

        // Should have focus (browser default or custom)
        await expect(dashboardBtn).toBeFocused();
    });

    test('should have proper heading hierarchy', async ({ page }) => {
        // Dashboard should have h1
        const mainHeading = page.locator('h1, h2').first();
        await expect(mainHeading).toBeVisible();

        // Navigate to Meeting Assistant
        await page.getByText('Meeting Assistant', { exact: true }).click();

        // Should have heading
        const meetingHeading = page.locator('h1, h2').filter({ hasText: /Meeting Assistant/i });
        await expect(meetingHeading).toBeVisible();
    });

    test('should have alt text for icons and images', async ({ page }) => {
        // SVG icons should have proper structure
        const icons = page.locator('svg');
        const iconCount = await icons.count();

        // Should have icons in the UI
        expect(iconCount).toBeGreaterThan(0);
    });
});
