import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class MeetingHistoryPage extends BasePage {
    readonly meetingRows: Locator;

    constructor(page: Page) {
        super(page);
        this.meetingRows = page.locator('[data-testid^="meeting-row-"]');
    }

    async openMeeting(id: string) {
        await this.page.getByTestId(`meeting-row-${id}`).click();
    }
}
