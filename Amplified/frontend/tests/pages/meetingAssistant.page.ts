import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class MeetingAssistantPage extends BasePage {
    readonly startMeetingBtn: Locator;
    readonly endMeetingBtn: Locator;
    readonly suggestAnswerBtn: Locator;
    readonly liveNotesPanel: Locator;
    readonly summaryPanel: Locator;
    readonly actionItemsList: Locator;
    readonly meetingHistoryLink: Locator;

    constructor(page: Page) {
        super(page);
        this.startMeetingBtn = page.getByTestId('btn-start-meeting');
        this.endMeetingBtn = page.getByTestId('btn-end-meeting');
        this.suggestAnswerBtn = page.getByTestId('btn-suggest-answer');
        this.liveNotesPanel = page.getByTestId('live-notes-panel');
        this.summaryPanel = page.getByTestId('summary-panel');
        this.actionItemsList = page.getByTestId('action-items-list');
        this.meetingHistoryLink = page.getByTestId('link-meeting-history');
    }

    async startMeeting() {
        await this.startMeetingBtn.click();
    }

    async endMeeting() {
        await this.endMeetingBtn.click({ force: true });
    }

    async suggestAnswer() {
        await this.suggestAnswerBtn.click();
    }

    async goToHistory() {
        await this.meetingHistoryLink.click();
    }

    async verifyLiveNotesEmpty() {
        await expect(this.liveNotesPanel).toContainText('Waiting for speech...');
    }

    async verifySummaryVisible() {
        await expect(this.summaryPanel).toBeVisible();
    }
}
