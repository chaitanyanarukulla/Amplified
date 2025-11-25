import { test, expect } from '@playwright/test';
import { MeetingAssistantPage } from '../pages/meetingAssistant.page';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('RAG Suggest Answer', () => {
    let meetingPage: MeetingAssistantPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        meetingPage = new MeetingAssistantPage(page);
        const navPage = new NavPage(page);
        await navPage.goto();
        await navPage.navigateToMeetingAssistant();
    });

    test('should suggest answer based on context', async ({ page }) => {
        // Start meeting to enable suggestions
        await meetingPage.startMeeting();

        // Click Suggest Answer
        await meetingPage.suggestAnswer();

        // Verify suggestion appears
        await expect(page.getByText('We are on track to complete')).toBeVisible();
        await expect(page.getByText('Mention current coverage.')).toBeVisible();
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Mock error
        await page.route('**/qa/meeting', async (route) => {
            await route.fulfill({ status: 500 });
        });

        await meetingPage.startMeeting();
        await meetingPage.suggestAnswer();

        // Verify error message (toast or alert)
        await expect(page.getByText('Error')
            .or(page.getByTestId('toast-error'))).toBeVisible();
    });
});
