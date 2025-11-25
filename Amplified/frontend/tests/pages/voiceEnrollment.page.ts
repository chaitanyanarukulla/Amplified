import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class VoiceEnrollmentPage extends BasePage {
    readonly recordBtn: Locator;
    readonly stopBtn: Locator;
    readonly saveBtn: Locator;
    readonly deleteBtn: Locator;
    readonly statusIndicator: Locator;

    constructor(page: Page) {
        super(page);
        this.recordBtn = page.getByTestId('btn-record-voice');
        this.stopBtn = page.getByTestId('btn-stop-voice');
        this.saveBtn = page.getByTestId('btn-save-voice');
        this.deleteBtn = page.getByTestId('btn-delete-voice');
        this.statusIndicator = page.getByTestId('voice-status');
    }

    async startRecording() {
        await this.recordBtn.waitFor({ state: 'visible' });
        await this.page.waitForTimeout(1000); // Stability wait
        await expect(this.recordBtn).toBeVisible();
        await this.recordBtn.click({ force: true });
        // Wait for recording state to be active
        await this.page.getByText('Recording...').waitFor({ state: 'visible' });
    }

    async stopRecording() {
        await this.stopBtn.waitFor({ state: 'visible' });
        await this.stopBtn.click();
    }

    async saveProfile() {
        await this.page.fill('input[placeholder="Enter your name"]', 'Test User');
        await this.saveBtn.click();
    }

    async deleteProfile() {
        await this.deleteBtn.click();
    }

    async verifyStatus(status: string) {
        await expect(this.statusIndicator).toContainText(status);
    }
}
