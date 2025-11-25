import { test, expect } from '@playwright/test';
import { NavPage } from '../pages/nav.page';
import { MockInterviewPage } from '../pages/mockInterview.page';
import { mockApi } from '../fixtures/api.mocks';
import path from 'path';
import fs from 'fs';

test.describe('Mock Interview Flow', () => {
    let navPage: NavPage;
    let mockPage: MockInterviewPage;

    test.beforeEach(async ({ page }) => {
        navPage = new NavPage(page);
        mockPage = new MockInterviewPage(page);
        await mockApi(page);

        // Mock getUserMedia
        await page.addInitScript(() => {
            navigator.mediaDevices.getUserMedia = async () => {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const dst = ctx.createMediaStreamDestination();
                osc.connect(dst);
                osc.start();
                return dst.stream;
            };
        });

        await navPage.goto();
    });

    test('should navigate to setup screen and prepare interview', async ({ page }) => {
        // Navigate to Mock Interview
        await navPage.navigateToMockInterview();

        // Verify Setup Screen
        await expect(mockPage.setupHeader).toBeVisible();
        await expect(mockPage.resumeUploadLabel).toBeVisible();
        await expect(mockPage.jdInput).toBeVisible();
        await expect(mockPage.roleInput).toBeVisible();
        await expect(mockPage.voiceSelector).toBeVisible();

        // Fill details
        // Create dummy PDF
        const resumePath = path.resolve(process.cwd(), 'test-resume.pdf');
        fs.writeFileSync(resumePath, 'dummy content');

        await mockPage.uploadResume(resumePath);
        await expect(page.getByText('test-resume.pdf')).toBeVisible();
        await mockPage.enterJobDetails('https://example.com/job', 'Senior Engineer');
        await mockPage.selectVoice('Friendly – US English');

        // Start Preparation
        await mockPage.startPreparation();

        // Verify Briefing Screen
        await expect(mockPage.briefingHeader).toBeVisible();
        await expect(page.getByText('Test Company Overview')).toBeVisible();
        await expect(page.getByText('Test Role Expectations')).toBeVisible();
        await expect(page.getByText('Question 1')).toBeVisible();

        // Start Interview
        await mockPage.startInterview();

        // Verify Interview Panel
        await expect(mockPage.interviewPanel).toBeVisible();
        await expect(mockPage.questionText).toBeVisible();
        await expect(page.getByText('Tell me about yourself.')).toBeVisible();
    });

    test('should validate inputs before preparation', async ({ page }) => {
        await navPage.navigateToMockInterview();

        // Try to start without inputs
        await mockPage.startPreparation();

        // Should show error (assuming toast or inline error)
        // Since we didn't implement specific error UI selectors in POM, checking for text
        await expect(page.getByText('Please upload your resume')).toBeVisible();
    });

    test.afterAll(() => {
        const resumePath = path.resolve(process.cwd(), 'test-resume.pdf');
        if (fs.existsSync(resumePath)) {
            fs.unlinkSync(resumePath);
        }
    });
});
