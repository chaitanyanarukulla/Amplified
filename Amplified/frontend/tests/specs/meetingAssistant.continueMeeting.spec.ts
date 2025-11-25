import { test, expect } from '@playwright/test';
import { MeetingAssistantPage } from '../pages/meetingAssistant.page';
import { MeetingHistoryPage } from '../pages/meetingHistory.page';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Meeting Assistant - Continue Meeting', () => {
    let meetingPage: MeetingAssistantPage;
    let historyPage: MeetingHistoryPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        historyPage = new MeetingHistoryPage(page);
        meetingPage = new MeetingAssistantPage(page);
        const navPage = new NavPage(page);
        await navPage.goto();
        await navPage.navigateToMeetingHistory();
    });

    test('should continue a previous meeting from history', async ({ page }) => {
        // Go to History
        // The navigation to history is now handled in beforeEach

        // Open a meeting
        await historyPage.openMeeting('m_123');

        // Verify details loaded
        await expect(page.getByText('Meeting 1 Summary')).toBeVisible();

        // Continue Meeting (assuming there is a continue button on detail page or it reuses start)
        // For this test, we assume the detail page has a "Continue Meeting" or similar
        // If not implemented yet, we might check for "Start Meeting" which acts as continue in context
        // Continue Meeting
        const continueBtn = page.getByTestId('btn-continue-meeting');
        await continueBtn.click();

        // In test environment without real WebSocket, auto-start might not trigger.
        // If "Start Meeting" is visible, click it to manually start.
        const startBtn = page.getByTestId('btn-start-meeting');
        if (await startBtn.isVisible()) {
            await startBtn.click();
        }

        // Verify we are back in active meeting mode (End Meeting button visible)
        await expect(meetingPage.endMeetingBtn).toBeVisible();

        // End meeting again
        await meetingPage.endMeeting();

        // Verify summary updated (mocked to show new summary)
        // In a real test, we'd check if the summary changed or appended
    });
});
