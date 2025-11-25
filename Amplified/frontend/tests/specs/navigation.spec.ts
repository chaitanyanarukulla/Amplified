import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { MeetingAssistantPage } from '../pages/meetingAssistant.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Navigation', () => {
    let navPage: NavPage;
    let meetingPage: MeetingAssistantPage;

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await mockApi(page);
        navPage = new NavPage(page);
        meetingPage = new MeetingAssistantPage(page);
        await navPage.goto();
    });

    test('should navigate to all tabs correctly', async ({ page }) => {
        // Initial state: Dashboard
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();

        // Navigate to Meeting Assistant
        await navPage.navigateToMeetingAssistant();
        await expect(meetingPage.startMeetingBtn).toBeVisible();

        // Navigate back via "Back to Dashboard" button (Sidebar is hidden in Meeting Assistant)
        await page.getByText('← Back to Dashboard').click();
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();

        // Navigate to Mock Interview
        await navPage.navigateToMockInterview();
        // Use first() to handle potential multiple matches or strict mode
        await expect(page.getByRole('heading', { name: /Mock Interview/i }).first()).toBeVisible();

        // Navigate back using the back button in Mock Interview Setup
        await page.getByTestId('btn-back-setup').click();
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();

        // Navigate to Interview Assistant
        await navPage.navigateToInterviewAssistant();
        await expect(page.getByText('Stall / Pivot')).toBeVisible();

        // Navigate back (Header has back button)
        const backBtn = page.getByTitle('Back to Dashboard');
        if (await backBtn.isVisible()) {
            await backBtn.click();
        } else {
            // Fallback to sidebar if header back button isn't there
            await navPage.dashboardLink.click();
        }
        await expect(page.getByText('Ready to amplify your workflow?')).toBeVisible();
    });
});
