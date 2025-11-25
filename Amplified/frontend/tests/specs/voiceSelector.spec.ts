// Playwright test for VoiceSelector component
import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.describe('Voice Selector', () => {
    test('should display available voices and allow selection', async ({ page }) => {
        // Mock speechSynthesis API
        await page.addInitScript(() => {
            const mockVoices = [
                { name: 'Friendly – US English', lang: 'en-US', default: true },
                { name: 'Professional – UK English', lang: 'en-GB', default: false }
            ];

            window.speechSynthesis = {
                getVoices: () => mockVoices,
                onvoiceschanged: null,
                speak: () => { },
                cancel: () => { },
                pause: () => { },
                resume: () => { },
                paused: false,
                pending: false,
                speaking: false,
                addEventListener: () => { },
                removeEventListener: () => { },
                dispatchEvent: () => true
            } as any;
        });

        await page.goto('about:blank');
        await mockApi(page);
        const nav = new NavPage(page);
        await nav.goto();
        // Navigate to Mock Interview setup where VoiceSelector is used
        await nav.navigateToMockInterview();
        // Wait for voice selector to be visible
        const voiceSelector = page.getByTestId('voice-selector');
        await expect(voiceSelector).toBeVisible();

        // Verify voice options are present (based on actual UI)
        // The component renders cards, not a dropdown
        const friendlyVoice = page.getByText('Friendly', { exact: false }).first();
        await expect(friendlyVoice).toBeVisible();

        // Select a voice
        await friendlyVoice.click();

        // Verify selection (check for active state/border)
        // The selected card has 'border-orange-500' class
        const selectedCard = page.locator('.border-orange-500');
        await expect(selectedCard).toBeVisible();
        await expect(selectedCard).toContainText('Friendly');
    });
});
