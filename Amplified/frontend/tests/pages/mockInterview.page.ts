import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class MockInterviewPage extends BasePage {
    readonly setupHeader: Locator;
    readonly resumeUpload: Locator;
    readonly resumeUploadLabel: Locator;
    readonly jdInput: Locator;
    readonly roleInput: Locator;
    readonly voiceSelector: Locator;
    readonly prepareButton: Locator;

    readonly briefingHeader: Locator;
    readonly startInterviewButton: Locator;

    readonly interviewPanel: Locator;
    readonly questionText: Locator;
    readonly nextButton: Locator;
    readonly endButton: Locator;

    constructor(page: Page) {
        super(page);

        // Setup Screen
        this.setupHeader = page.getByRole('heading', { name: 'Mock Interview Setup' });
        this.resumeUpload = page.locator('input[type="file"]');
        this.resumeUploadLabel = page.locator('label[for="resume-upload"]');
        this.jdInput = page.getByPlaceholder('https://www.linkedin.com/jobs/view/...');
        this.roleInput = page.getByPlaceholder('e.g., Senior QA Engineer');
        this.voiceSelector = page.getByText('Interviewer Voice');
        this.prepareButton = page.getByRole('button', { name: 'Prepare Mock Interview' });

        // Briefing Screen
        this.briefingHeader = page.getByRole('heading', { name: 'Interview Briefing' });
        this.startInterviewButton = page.getByRole('button', { name: 'Start Mock Interview' });

        // Interview Panel
        this.interviewPanel = page.locator('.bg-slate-900\\/95'); // Backdrop
        this.questionText = page.getByText('Interviewer asks:');
        this.nextButton = page.getByRole('button', { name: 'Next Question' });
        this.endButton = page.getByRole('button', { name: 'Complete Interview' });
    }

    async uploadResume(filePath: string) {
        await this.resumeUpload.setInputFiles(filePath);
    }

    async enterJobDetails(url: string, role: string) {
        await this.jdInput.fill(url);
        await this.roleInput.fill(role);
    }

    async selectVoice(voiceName: string) {
        await this.page.getByText(voiceName).click();
    }

    async startPreparation() {
        await this.prepareButton.click();
    }

    async startInterview() {
        await this.startInterviewButton.click();
    }

    async endInterview() {
        await this.endButton.click();
    }
}
