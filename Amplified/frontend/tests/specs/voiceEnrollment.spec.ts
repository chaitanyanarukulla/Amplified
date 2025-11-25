import { test, expect } from '@playwright/test';
import { VoiceEnrollmentPage } from '../pages/voiceEnrollment.page';
import { NavPage } from '../pages/nav.page';
import { mockApi } from '../fixtures/api.mocks';

test.use({
    launchOptions: {
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
});

test.describe('Voice Enrollment', () => {
    let voicePage: VoiceEnrollmentPage;
    let navPage: NavPage;

    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        // Grant permissions
        await page.context().grantPermissions(['microphone']);

        voicePage = new VoiceEnrollmentPage(page);
        navPage = new NavPage(page);
        await navPage.goto();
        await navPage.navigateToVoiceEnrollment();

        // Mock getUserMedia is no longer strictly needed due to --use-fake-device-for-media-stream
        // However, the MediaRecorder mock is still useful for controlling data availability timing.
        await page.addInitScript(() => {
            // Mock MediaRecorder
            (window as any).MediaRecorder = class MockMediaRecorder {
                static isTypeSupported(mimeType: string) {
                    return true;
                }

                state = 'inactive';
                stream: any;
                ondataavailable: any;
                onstop: any;

                constructor(stream: any) {
                    this.stream = stream;
                }

                start() {
                    this.state = 'recording';
                    // Simulate data available
                    setTimeout(() => {
                        if (this.ondataavailable) {
                            this.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }), size: 100 });
                        }
                    }, 100);
                }

                stop() {
                    this.state = 'inactive';
                    if (this.onstop) this.onstop();
                }
            };
        });
    });

    test('should enroll and delete voice profile', async ({ page }) => {
        // Verify initial state (Not enrolled)
        // Based on component logic: "Record yourself reading a short text..."
        await voicePage.verifyStatus('Record yourself');

        // Record
        await voicePage.startRecording();
        await page.waitForTimeout(1000); // Simulate recording time
        await voicePage.stopRecording();

        // Save
        await voicePage.saveProfile();

        // Wait for save to complete and page to update
        await page.waitForTimeout(2000);

        // Verify enrolled - the component shows "{name}'s voice profile is active."
        await expect(voicePage.statusIndicator).toBeVisible();
        await expect(voicePage.statusIndicator).toContainText("voice profile is active");

        // Delete - handle confirmation dialog
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Delete');
            await dialog.accept();
        });

        await voicePage.deleteProfile();

        // Wait for delete to complete and UI to update
        await page.waitForTimeout(2000);

        // Verify deleted - the enrollment UI should reappear
        await expect(page.getByText('Enroll Your Voice')).toBeVisible();
        await expect(voicePage.recordBtn).toBeVisible();
    });
});
