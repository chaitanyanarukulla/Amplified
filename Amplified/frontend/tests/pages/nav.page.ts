import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class NavPage extends BasePage {
    readonly dashboardLink: Locator;
    readonly meetingAssistantTab: Locator;
    readonly mockInterviewTab: Locator;
    readonly interviewAssistantTab: Locator;
    readonly knowledgeVaultTab: Locator;
    readonly voiceEnrollmentTab: Locator;

    constructor(page: Page) {
        super(page);
        // Use data-testid selectors for sidebar navigation items
        this.dashboardLink = page.getByTestId('nav-item-dashboard');
        this.meetingAssistantTab = page.getByTestId('tab-meeting-assistant'); // These are dashboard cards
        this.mockInterviewTab = page.getByTestId('tab-mock-interview');
        this.interviewAssistantTab = page.getByTestId('tab-interview-assistant');
        this.knowledgeVaultTab = page.getByTestId('nav-item-vault');
        this.voiceEnrollmentTab = page.getByTestId('nav-item-voice');
    }

    async navigateToMeetingAssistant() {
        // Go to dashboard first if not there
        if (!await this.page.getByText('Ready to amplify your workflow?').isVisible()) {
            await this.dashboardLink.click();
        }
        await this.page.getByText('Meeting Assistant', { exact: true }).click();
    }

    async navigateToMockInterview() {
        if (!await this.page.getByText('Ready to amplify your workflow?').isVisible()) {
            await this.dashboardLink.click();
        }
        await this.page.getByText('Mock Interview', { exact: true }).click();
    }

    async navigateToInterviewAssistant() {
        if (!await this.page.getByText('Ready to amplify your workflow?').isVisible()) {
            await this.dashboardLink.click();
        }
        await this.page.getByText('Interview Assistant', { exact: true }).click();
    }

    async navigateToKnowledgeVault() {
        await this.knowledgeVaultTab.click();
    }

    async navigateToMeetingHistory() {
        await this.page.getByText('History').click();
    }

    async navigateToVoiceEnrollment() {
        await this.voiceEnrollmentTab.click();
    }
}
