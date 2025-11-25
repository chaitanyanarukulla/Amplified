import { test, expect } from '@playwright/test';
import { InterviewAssistantPage } from '../pages/interviewAssistant.page';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Interview Assistant (Stealth Mode)', () => {
    let interviewPage: InterviewAssistantPage;
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        interviewPage = new InterviewAssistantPage(page);
        navPage = new NavPage(page);
        await navPage.goto();
        await navPage.navigateToInterviewAssistant();
    });

    test('should load interview assistant interface', async ({ page }) => {
        // Verify key elements are present
        // Check for Footer buttons
        await expect(page.getByText('Stall / Pivot')).toBeVisible();
        await expect(page.getByTestId('btn-suggest-answer')).toBeVisible();

        // Check for Header elements
        const contextToggle = page.getByTitle('Open Context Panel');
        await expect(contextToggle).toBeVisible();

        // Open Context Panel and verify
        await contextToggle.click();
        await expect(page.getByText('Interview Context')).toBeVisible();
    });

    test.fixme('should request a stall phrase', async ({ page }) => {
        // Mock the stall phrase response if not already covered by mockApi
        // Assuming mockApi handles it or we add a specific route here
        await page.route('**/ws', async (route) => {
            // WebSocket mocking is harder in Playwright directly without a server
            // But if the app uses HTTP for some things or if we rely on the existing mockApi
            // Let's assume the button triggers a UI change we can verify
            // Or we mock the specific HTTP endpoint if it uses one.
            // The backend uses WebSockets.
            // For this test, we might just check if the button is clickable.
            // If we can't easily mock WS, we might skip the functional verification
            // and just check UI state.
            await route.continue();
        });

        await interviewPage.requestStallPhrase();
        // Verification depends on WS response. 
        // If we can't mock WS easily, we might just check the button state.
    });
});
