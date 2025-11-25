import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class InterviewAssistantPage extends BasePage {
    readonly overlayContainer: Locator;
    readonly transparencySlider: Locator;
    readonly clickThroughToggle: Locator;
    readonly suggestionPanel: Locator;
    readonly stallButton: Locator;

    constructor(page: Page) {
        super(page);
        this.overlayContainer = page.locator('.interview-assistant-overlay'); // Adjust selector as needed
        this.transparencySlider = page.getByRole('slider', { name: /opacity/i });
        this.clickThroughToggle = page.getByRole('switch', { name: /click-through/i });
        this.suggestionPanel = page.getByTestId('suggestion-panel');
        this.stallButton = page.getByRole('button', { name: /stall/i });
    }

    async setTransparency(value: number) {
        // This might need specific logic depending on the slider implementation
        await this.transparencySlider.fill(value.toString());
    }

    async toggleClickThrough() {
        await this.clickThroughToggle.click();
    }

    async requestStallPhrase() {
        await this.stallButton.click();
    }

    async verifyStallPhraseVisible() {
        await expect(this.suggestionPanel).toContainText(/Let me think/i); // Example phrase
    }
}
